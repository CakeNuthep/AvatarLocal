import { TTSProvider } from './tts-provider';
import { LipSyncDriver } from './lip-sync-driver';

/**
 * Splits text into sentences using typical terminal punctuation, newlines, and pipe characters.
 * Preserves trailing punctuation as part of the sentence block.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // Match segments of characters up to punctuation marks (.!?。！？|), newlines, or double spaces
  const matches = text.match(/[^.!?。！？\n\r|]+(?:[.!?。！？\n\r|]+|\s{2,})?/g) || [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface AudioQueueSchedulerOptions {
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onSentenceStart?: (text: string) => void;
  prefetchDepth?: number;
}

interface QueueItem {
  text: string;
  status: 'pending' | 'synthesizing' | 'ready' | 'playing' | 'completed' | 'failed';
  audioBuffer?: AudioBuffer;
  promise?: Promise<AudioBuffer>;
}

/**
 * Manages a queue of text sentences, synthesizes them in the background (prefetching),
 * and plays them sequentially and gaplessly using Web Audio API and LipSyncDriver.
 */
export class AudioQueueScheduler {
  private ttsProvider: TTSProvider;
  private audioContext: AudioContext;
  private queue: QueueItem[] = [];
  private isPlaying = false;
  private isSpeakingActive = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentDriver: LipSyncDriver | null = null;
  private prefetchDepth: number;
  private onSpeakingStart?: () => void;
  private onSpeakingEnd?: () => void;
  private onSentenceStart?: (text: string) => void;

  constructor(
    ttsProvider: TTSProvider,
    audioContext: AudioContext,
    options: AudioQueueSchedulerOptions = {}
  ) {
    this.ttsProvider = ttsProvider;
    this.audioContext = audioContext;
    this.prefetchDepth = options.prefetchDepth !== undefined ? options.prefetchDepth : 2;
    this.onSpeakingStart = options.onSpeakingStart;
    this.onSpeakingEnd = options.onSpeakingEnd;
    this.onSentenceStart = options.onSentenceStart;
  }

  /**
   * Enqueues a text block, splits it into sentences, starts prefetching, and triggers playback.
   */
  enqueueText(text: string, language: string): void {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;

    // Trigger onSpeakingStart callback if this is the transition from idle to busy
    if (!this.isSpeakingActive) {
      this.isSpeakingActive = true;
      if (this.onSpeakingStart) {
        this.onSpeakingStart();
      }
    }

    sentences.forEach((sentence) => {
      this.queue.push({
        text: sentence,
        status: 'pending',
      });
    });

    this.processQueue(language);
  }

  /**
   * Stops playback immediately, cancels active synthesis items, and resets the queue state.
   */
  stop(): void {
    // 1. Stop active audio
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }

    // 2. Tear down active driver
    if (this.currentDriver) {
      this.currentDriver.destroy();
      this.currentDriver = null;
    }

    // 3. Clear queue
    this.queue = [];
    this.isPlaying = false;

    // 4. Trigger end callback if speech was active
    if (this.isSpeakingActive) {
      this.isSpeakingActive = false;
      if (this.onSpeakingEnd) {
        this.onSpeakingEnd();
      }
    }
  }

  /**
   * Background prefetching helper that triggers synthesis for upcoming pending items.
   */
  private prefetchNextItems(language: string): void {
    let prefetchCount = 0;
    for (const item of this.queue) {
      if (item.status === 'pending') {
        if (prefetchCount >= this.prefetchDepth) break;
        this.synthesizeItem(item, language).catch(() => {});
        prefetchCount++;
      } else if (item.status === 'synthesizing') {
        prefetchCount++;
      }
    }
  }

  /**
   * Starts synthesizing a single pending queue item using the TTS provider.
   */
  private async synthesizeItem(item: QueueItem, language: string): Promise<AudioBuffer> {
    item.status = 'synthesizing';
    item.promise = this.ttsProvider.synthesize(item.text, language)
      .then((buffer) => {
        item.status = 'ready';
        item.audioBuffer = buffer;
        // Run queue loop to play next if waiting
        this.processQueue(language);
        return buffer;
      })
      .catch((err) => {
        item.status = 'failed';
        // Skip this item and continue queue loop
        this.processQueue(language);
        throw err;
      });
    return item.promise;
  }

  /**
   * Main scheduling loop. Decides whether to play the next ready item, wait, or prefetch.
   */
  private async processQueue(language: string): Promise<void> {
    // If already playing, only prefetch upcoming items
    if (this.isPlaying) {
      this.prefetchNextItems(language);
      return;
    }

    // Find the first item that is not completed or failed
    const nextItemIndex = this.queue.findIndex(
      (item) => item.status !== 'completed' && item.status !== 'failed'
    );

    if (nextItemIndex === -1) {
      // Everything has been played
      if (this.isSpeakingActive) {
        this.isSpeakingActive = false;
        if (this.onSpeakingEnd) {
          this.onSpeakingEnd();
        }
      }
      return;
    }

    const nextItem = this.queue[nextItemIndex];

    if (nextItem.status === 'ready' && nextItem.audioBuffer) {
      this.playItem(nextItem, language);
    } else if (nextItem.status === 'pending') {
      try {
        await this.synthesizeItem(nextItem, language);
      } catch (e) {
        // Skip errors as they are caught in synthesizeItem
      }
    } else if (nextItem.status === 'synthesizing' && nextItem.promise) {
      // Wait for the active promise to finish
      try {
        await nextItem.promise;
      } catch (e) {
        // Skip errors as they are caught in synthesizeItem
      }
    }
  }

  /**
   * Drives the source node and registers the LipSyncDriver.
   */
  private playItem(item: QueueItem, language: string): void {
    this.isPlaying = true;
    item.status = 'playing';

    if (this.onSentenceStart) {
      this.onSentenceStart(item.text);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = item.audioBuffer!;

    // Instantiating LipSyncDriver registers it automatically as active driver
    const driver = new LipSyncDriver(source);

    this.currentSource = source;
    this.currentDriver = driver;

    source.start(0);

    source.onended = () => {
      driver.destroy();
      item.status = 'completed';
      this.isPlaying = false;
      this.currentSource = null;
      this.currentDriver = null;

      // Process next item
      this.processQueue(language);
    };

    // Prefetch subsequent items
    this.prefetchNextItems(language);
  }
}

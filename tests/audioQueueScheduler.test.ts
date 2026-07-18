import { describe, expect, test, vi, beforeEach } from 'vitest';
import { AudioQueueScheduler, splitSentences } from '../src/ai-provider/audio-queue-scheduler';
import { TTSProvider } from '../src/ai-provider/tts-provider';

describe('Sentence Splitting', () => {
  test('splits English sentences and preserves punctuation', () => {
    const text = 'Hello world! This is a test. How are you doing?';
    const result = splitSentences(text);
    expect(result).toEqual([
      'Hello world!',
      'This is a test.',
      'How are you doing?',
    ]);
  });

  test('splits Thai sentences using newlines and pipe characters', () => {
    const text = 'สวัสดีครับ\nยินดีที่ได้รู้จักครับ|ขอบคุณมากๆ';
    const result = splitSentences(text);
    expect(result).toEqual([
      'สวัสดีครับ',
      'ยินดีที่ได้รู้จักครับ|',
      'ขอบคุณมากๆ',
    ]);
  });

  test('splits on double spaces', () => {
    const text = 'Sentence one.  Sentence two.  Sentence three.';
    const result = splitSentences(text);
    expect(result).toEqual([
      'Sentence one.',
      'Sentence two.',
      'Sentence three.',
    ]);
  });

  test('handles empty or blank strings gracefully', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('AudioQueueScheduler', () => {
  let mockTTSProvider: TTSProvider;
  let mockAudioContext: any;
  let mockSourceNode: any;
  let mockAnalyserNode: any;
  let mockAudioBuffer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAudioBuffer = { duration: 1.0 };

    mockAnalyserNode = {
      fftSize: 1024,
      frequencyBinCount: 512,
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      destination: {},
      currentTime: 0,
      createAnalyser: vi.fn().mockReturnValue(mockAnalyserNode),
      createBufferSource: vi.fn(),
    };

    mockSourceNode = {
      buffer: null,
      context: mockAudioContext,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };

    mockAudioContext.createBufferSource.mockReturnValue(mockSourceNode);

    mockTTSProvider = {
      synthesize: vi.fn().mockResolvedValue({
        audioBuffer: mockAudioBuffer,
        mouthCues: [{ start: 0, end: 1, value: 'A' }],
      }),
    } as any;
  });

  test('enqueues sentences and executes them sequentially in FIFO order', async () => {
    const onSpeakingStart = vi.fn();
    const onSpeakingEnd = vi.fn();
    const onSentenceStart = vi.fn();

    const scheduler = new AudioQueueScheduler(mockTTSProvider, mockAudioContext, {
      onSpeakingStart,
      onSpeakingEnd,
      onSentenceStart,
      prefetchDepth: 1,
    });

    // Enqueue text
    scheduler.enqueueText('Sentence one! Sentence two.', 'en');

    // 1. Verify speaking starts and the first synthesis is requested
    expect(onSpeakingStart).toHaveBeenCalledTimes(1);
    expect(mockTTSProvider.synthesize).toHaveBeenCalledWith('Sentence one!', 'en');

    // Wait for the microtasks/promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 2. First sentence should be playing, and second sentence should start prefetching
    expect(onSentenceStart).toHaveBeenLastCalledWith('Sentence one!');
    expect(mockSourceNode.start).toHaveBeenCalledTimes(1);
    expect(mockTTSProvider.synthesize).toHaveBeenCalledWith('Sentence two.', 'en');

    // Wait for prefetch promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 3. Simulate first sentence ending
    expect(mockSourceNode.onended).toBeDefined();
    mockSourceNode.onended();

    // 4. Second sentence should start playing immediately since it was prefetched
    expect(onSentenceStart).toHaveBeenLastCalledWith('Sentence two.');
    expect(mockSourceNode.start).toHaveBeenCalledTimes(2);

    // 5. Simulate second sentence ending
    mockSourceNode.onended();

    // 6. Speaking should end
    expect(onSpeakingEnd).toHaveBeenCalledTimes(1);
  });

  test('stops playback and clears queue on stop()', async () => {
    const onSpeakingStart = vi.fn();
    const onSpeakingEnd = vi.fn();
    const onSentenceStart = vi.fn();

    const scheduler = new AudioQueueScheduler(mockTTSProvider, mockAudioContext, {
      onSpeakingStart,
      onSpeakingEnd,
      onSentenceStart,
    });

    scheduler.enqueueText('First. Second. Third.', 'en');

    // Wait for first synthesis
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSourceNode.start).toHaveBeenCalledTimes(1);

    // Trigger stop
    scheduler.stop();

    expect(mockSourceNode.stop).toHaveBeenCalled();
    expect(onSpeakingEnd).toHaveBeenCalledTimes(1);

    // Verify nothing else plays when onended is called or subsequent tasks resolve
    if (mockSourceNode.onended) {
      mockSourceNode.onended();
    }
    expect(mockSourceNode.start).toHaveBeenCalledTimes(1); // Still 1, didn't play "Second"
  });

  test('gracefully recovers and skips a sentence if synthesis fails', async () => {
    const onSpeakingEnd = vi.fn();
    const scheduler = new AudioQueueScheduler(mockTTSProvider, mockAudioContext, {
      onSpeakingEnd,
    });

    // Make mock TTS fail for "Second."
    mockTTSProvider.synthesize = vi.fn().mockImplementation((text) => {
      if (text === 'Second.') {
        return Promise.reject(new Error('Synthesis failed'));
      }
      return Promise.resolve({
        audioBuffer: mockAudioBuffer,
        mouthCues: [],
      });
    });

    scheduler.enqueueText('First. Second. Third.', 'en');

    // Wait for first synthesis
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockSourceNode.start).toHaveBeenCalledTimes(1);

    // End first sentence playback
    mockSourceNode.onended();

    // Wait for second (failed) and third (successful) synthesis to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Third sentence should start playing, skipping the failed second one
    expect(mockSourceNode.start).toHaveBeenCalledTimes(2); // Played "First" and "Third"

    // End third sentence
    mockSourceNode.onended();

    expect(onSpeakingEnd).toHaveBeenCalledTimes(1);
  });
});

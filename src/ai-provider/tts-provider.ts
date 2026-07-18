import type { RhubarbMouthCue } from './rhubarb-lip-sync';

export interface TTSSynthesisResult {
  audioBuffer: AudioBuffer;
  mouthCues: RhubarbMouthCue[];
}

/**
 * Abstract class representing a Text-to-Speech (TTS) provider.
 * Supports multiple languages and returns synthesized audio and cues.
 */
export abstract class TTSProvider {
  protected audioContext?: AudioContext;

  constructor(audioContext?: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Lazily retrieves or creates an AudioContext.
   */
  protected getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this environment');
      }
      this.audioContext = new AudioCtx();
    }
    return this.audioContext;
  }

  /**
   * Synthesizes text into an AudioBuffer and mouth cues.
   * 
   * @param text The text message to synthesize
   * @param language The target language code (e.g. 'en', 'th')
   * @returns A promise resolving to the TTSSynthesisResult
   */
  abstract synthesize(text: string, language: string): Promise<TTSSynthesisResult>;
}

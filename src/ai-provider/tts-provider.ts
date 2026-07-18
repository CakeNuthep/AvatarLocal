/**
 * Abstract class representing a Text-to-Speech (TTS) provider.
 * Supports multiple languages and returns an AudioBuffer.
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
   * Synthesizes text into an AudioBuffer.
   * 
   * @param text The text message to synthesize
   * @param language The target language code (e.g. 'en', 'th')
   * @returns A promise resolving to the decoded AudioBuffer
   */
  abstract synthesize(text: string, language: string): Promise<AudioBuffer>;
}

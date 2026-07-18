import { TTSProvider } from './tts-provider';

export interface PiperTTSProviderOptions {
  audioContext?: AudioContext;
  apiUrl?: string;
  voiceMap?: Record<string, string>;
}

/**
 * Concrete implementation of TTSProvider using local Piper TTS service.
 */
export class PiperTTSProvider extends TTSProvider {
  private apiUrl: string;
  private voiceMap: Record<string, string>;

  constructor(options: PiperTTSProviderOptions = {}) {
    super(options.audioContext);
    this.apiUrl = options.apiUrl || '/api/tts';
    this.voiceMap = options.voiceMap || {
      en: 'en_US-lessac-medium',
      th: 'th_TH-apatcha-medium',
    };
  }

  /**
   * Synthesizes text into an AudioBuffer using local Piper server.
   * 
   * @param text The text to synthesize
   * @param language The language code (e.g. 'en', 'th')
   * @returns A promise resolving to the decoded AudioBuffer
   */
  async synthesize(text: string, language: string): Promise<AudioBuffer> {
    const voice = this.voiceMap[language.toLowerCase()];
    if (!voice) {
      throw new Error(`Unsupported language or no voice configured for: ${language}`);
    }

    const queryUrl = `${this.apiUrl}?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(voice)}`;

    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`Piper TTS request failed with status: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioContext = this.getAudioContext();
    return await audioContext.decodeAudioData(arrayBuffer);
  }
}

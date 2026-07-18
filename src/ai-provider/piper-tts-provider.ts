import { TTSProvider } from './tts-provider';
import type { TTSSynthesisResult } from './tts-provider';

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
      th: 'en_US-lessac-medium', // Fallback: Piper lacks stable Thai models
    };
  }

  /**
   * Synthesizes text into an AudioBuffer using local Piper server.
   * 
   * @param text The text to synthesize
   * @param language The language code (e.g. 'en', 'th')
   * @returns A promise resolving to the TTSSynthesisResult
   */
  async synthesize(text: string, language: string): Promise<TTSSynthesisResult> {
    const voice = this.voiceMap[language.toLowerCase()];
    if (!voice) {
      throw new Error(`Unsupported language or no voice configured for: ${language}`);
    }

    if (language.toLowerCase() === 'th') {
      console.warn('[WARN Piper] Thai language selected but official Piper repository does not have stable Thai voice models. Falling back to English voice: en_US-lessac-medium.');
    }

    const queryUrl = `${this.apiUrl}?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(voice)}`;

    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`Piper TTS request failed with status: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const audioBase64 = payload.audio;
    const mouthCues = payload.cues || [];

    // Decode base64 to ArrayBuffer
    const binaryString = atob(audioBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const audioContext = this.getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return {
      audioBuffer,
      mouthCues,
    };
  }
}

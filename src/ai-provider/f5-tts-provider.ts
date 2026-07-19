import { TTSProvider } from './tts-provider';
import type { TTSSynthesisResult } from './tts-provider';

export interface F5TTSProviderOptions {
  audioContext?: AudioContext;
  apiUrl?: string;
  refAudio?: string;
  refText?: string;
}

/**
 * Concrete implementation of TTSProvider using local F5-TTS clone service.
 */
export class F5TTSProvider extends TTSProvider {
  private apiUrl: string;
  private refAudio?: string;
  private refText?: string;

  constructor(options: F5TTSProviderOptions = {}) {
    super(options.audioContext);
    this.apiUrl = options.apiUrl || '/api/f5';
    this.refAudio = options.refAudio;
    this.refText = options.refText;
  }

  /**
   * Synthesizes text into an AudioBuffer using local F5-TTS server.
   * 
   * @param text The text to synthesize
   * @param _language The language code (e.g. 'en', 'th')
   * @returns A promise resolving to the TTSSynthesisResult
   */
  async synthesize(text: string, _language: string): Promise<TTSSynthesisResult> {
    let queryUrl = `${this.apiUrl}?text=${encodeURIComponent(text)}`;
    if (this.refAudio) {
      queryUrl += `&ref_audio=${encodeURIComponent(this.refAudio)}`;
    }
    if (this.refText) {
      queryUrl += `&ref_text=${encodeURIComponent(this.refText)}`;
    }

    const response = await fetch(queryUrl);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`F5-TTS request failed: ${response.status} ${response.statusText}. Detail: ${errText}`);
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

    // If no cues generated, fall back to basic volume visemes or mock duration visemes
    const finalCues = mouthCues.length > 0 ? mouthCues : this.generateMockCues(audioBuffer.duration);

    return {
      audioBuffer,
      mouthCues: finalCues,
    };
  }

  private generateMockCues(duration: number) {
    const cues: any[] = [];
    let time = 0;
    const values = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    while (time < duration) {
      cues.push({
        start: time,
        end: Math.min(duration, time + 0.15),
        value: values[Math.floor(Math.random() * values.length)],
      });
      time += 0.15;
    }
    return cues;
  }
}

import { TTSProvider } from './tts-provider';
import type { TTSSynthesisResult } from './tts-provider';

export interface KokoroTTSProviderOptions {
  audioContext?: AudioContext;
  apiUrl?: string;
  voiceMap?: Record<string, string>;
}

/**
 * Concrete implementation of TTSProvider using local Kokoro-82M ONNX service.
 */
export class KokoroTTSProvider extends TTSProvider {
  private apiUrl: string;
  private voiceMap: Record<string, string>;

  constructor(options: KokoroTTSProviderOptions = {}) {
    super(options.audioContext);
    this.apiUrl = options.apiUrl || '/api/kokoro';
    this.voiceMap = options.voiceMap || {
      en: 'af_sarah',
      th: 'af_sarah', // phonetic fallback using English voice since Kokoro lacks native Thai
    };
  }

  /**
   * Synthesizes text into an AudioBuffer using local Kokoro server.
   * 
   * @param text The text to synthesize
   * @param language The language code (e.g. 'en', 'th')
   * @returns A promise resolving to the TTSSynthesisResult
   */
  async synthesize(text: string, language: string): Promise<TTSSynthesisResult> {
    const voice = this.voiceMap[language.toLowerCase()] || 'af_sarah';
    const queryUrl = `${this.apiUrl}?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(voice)}`;

    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`Kokoro TTS request failed with status: ${response.status} ${response.statusText}`);
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

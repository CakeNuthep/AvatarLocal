import { TTSProvider } from './tts-provider';
import type { TTSSynthesisResult } from './tts-provider';

export interface CoquiTTSProviderOptions {
  audioContext?: AudioContext;
  apiUrl?: string;
  voiceMap?: Record<string, string>;
}

/**
 * Concrete implementation of TTSProvider using local Coqui/XTTS service.
 */
export class CoquiTTSProvider extends TTSProvider {
  private apiUrl: string;
  private voiceMap: Record<string, string>;

  constructor(options: CoquiTTSProviderOptions = {}) {
    super(options.audioContext);
    this.apiUrl = options.apiUrl || '/api/coqui/api/tts';
    this.voiceMap = options.voiceMap || {
      en: 'Aaron Dreschner',
      th: 'Daisy Studious',
    };
  }

  /**
   * Synthesizes text into an AudioBuffer using local Coqui/XTTS server.
   * 
   * @param text The text to synthesize
   * @param language The language code (e.g. 'en', 'th')
   * @returns A promise resolving to the TTSSynthesisResult
   */
  async synthesize(text: string, language: string): Promise<TTSSynthesisResult> {
    const voice = this.voiceMap[language.toLowerCase()];
    if (!voice) {
      throw new Error(`Unsupported language or no voice configured for Coqui: ${language}`);
    }

    const speakerId = encodeURIComponent(voice);
    // XTTS v2 supports specific languages. Fall back to 'en' for unsupported languages (like 'th') to use phonetic fallback
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh-cn', 'hu', 'ko', 'ja', 'hi'];
    const resolvedLanguage = supportedLanguages.includes(language.toLowerCase()) ? language.toLowerCase() : 'en';

    const queryUrl = `${this.apiUrl}?text=${encodeURIComponent(text)}&speaker_id=${speakerId}&language_id=${resolvedLanguage}`;

    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`Coqui TTS request failed with status: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let audioBuffer: AudioBuffer;
    let mouthCues: any[] = [];

    const audioContext = this.getAudioContext();

    if (contentType.includes('application/json')) {
      const payload = await response.json();
      const audioBase64 = payload.audio;
      mouthCues = payload.cues || [];

      const binaryString = atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } else {
      // Raw audio bytes (e.g. audio/wav)
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      // Generate basic viseme cues based on duration
      mouthCues = this.generateMockCues(audioBuffer.duration);
    }

    return {
      audioBuffer,
      mouthCues,
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

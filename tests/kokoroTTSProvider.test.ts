import { describe, expect, test, vi, beforeEach } from 'vitest';
import { KokoroTTSProvider } from '../src/ai-provider/kokoro-tts-provider';

describe('KokoroTTSProvider', () => {
  let mockAudioContext: any;
  let mockAudioBuffer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAudioBuffer = {
      duration: 1.5,
      numberOfChannels: 1,
      sampleRate: 22050,
    };

    mockAudioContext = {
      decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
    };
  });

  test('synthesize selects correct speaker and language for English', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [{ start: 0, end: 1, value: 'A' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new KokoroTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('Hello', 'en');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kokoro?text=Hello&speaker=af_sarah'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([{ start: 0, end: 1, value: 'A' }]);
  });

  test('synthesize uses English phonetic speaker fallback for Thai language', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new KokoroTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('สวัสดี', 'th');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kokoro?text=%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5&speaker=af_sarah'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues.length).toBeGreaterThan(0); // auto-generated mock cues
  });

  test('synthesize throws error on network failure (non-200)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new KokoroTTSProvider({ audioContext: mockAudioContext });
    await expect(provider.synthesize('Hello', 'en')).rejects.toThrow(
      'Kokoro TTS request failed with status: 500 Internal Server Error'
    );
  });
});

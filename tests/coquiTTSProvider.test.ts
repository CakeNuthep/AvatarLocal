import { describe, expect, test, vi, beforeEach } from 'vitest';
import { CoquiTTSProvider } from '../src/ai-provider/coqui-tts-provider';

describe('CoquiTTSProvider', () => {
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
      headers: {
        get: () => 'audio/wav',
      },
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new CoquiTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('Hello', 'en');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/coqui/api/tts?text=Hello&speaker_id=Aaron%20Dreschner&language_id=en'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues.length).toBeGreaterThan(0);
  });

  test('synthesize falls back to en language for unsupported th language', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'audio/wav',
      },
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new CoquiTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('สวัสดี', 'th');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/coqui/api/tts?text=%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5&speaker_id=Daisy%20Studious&language_id=en'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
  });

  test('synthesize supports JSON payload response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [{ start: 0, end: 1, value: 'A' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new CoquiTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('Hello', 'en');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/coqui/api/tts?text=Hello&speaker_id=Aaron%20Dreschner&language_id=en'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([{ start: 0, end: 1, value: 'A' }]);
  });

  test('synthesize throws error on network failure (non-200)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new CoquiTTSProvider({ audioContext: mockAudioContext });
    await expect(provider.synthesize('Hello', 'en')).rejects.toThrow(
      'Coqui TTS request failed with status: 500 Internal Server Error'
    );
  });
});

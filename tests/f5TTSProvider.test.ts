import { describe, expect, test, vi, beforeEach } from 'vitest';
import { F5TTSProvider } from '../src/ai-provider/f5-tts-provider';

describe('F5TTSProvider', () => {
  let mockAudioContext: any;
  let mockAudioBuffer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAudioBuffer = {
      duration: 1.5,
      numberOfChannels: 1,
      sampleRate: 24000,
    };

    mockAudioContext = {
      decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
    };
  });

  test('synthesize sends query to F5-TTS api', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [{ start: 0, end: 1, value: 'A' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new F5TTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('Hello F5-TTS', 'en');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/f5?text=Hello%20F5-TTS'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([{ start: 0, end: 1, value: 'A' }]);
  });

  test('synthesize handles custom reference audio parameters and falls back to generated cues', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new F5TTSProvider({
      audioContext: mockAudioContext,
      refAudio: 'my_custom_ref.wav',
      refText: 'Custom reference transcription.'
    });
    const result = await provider.synthesize('Speak this text', 'en');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/f5?text=Speak%20this%20text&ref_audio=my_custom_ref.wav&ref_text=Custom%20reference%20transcription.'
    );
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues.length).toBeGreaterThan(0); // auto-generated mock cues
  });

  test('synthesize throws error on network failure (non-200)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn().mockResolvedValue('Missing reference audio file.')
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new F5TTSProvider({ audioContext: mockAudioContext });
    await expect(provider.synthesize('Hello', 'en')).rejects.toThrow(
      'F5-TTS request failed: 400 Bad Request. Detail: Missing reference audio file.'
    );
  });
});

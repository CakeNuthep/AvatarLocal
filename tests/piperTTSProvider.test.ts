import { describe, expect, test, vi, beforeEach } from 'vitest';
import { PiperTTSProvider } from '../src/ai-provider/piper-tts-provider';

describe('PiperTTSProvider', () => {
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

  test('synthesize selects the correct voice and fetches correctly for English', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [{ start: 0, end: 1, value: 'A' }]
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PiperTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('Hello', 'en');

    expect(fetchMock).toHaveBeenCalledWith('/api/tts?text=Hello&speaker=en_US-lessac-medium');
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([{ start: 0, end: 1, value: 'A' }]);
  });

  test('synthesize selects the correct voice and fetches correctly for Thai', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: [{ start: 0.1, end: 0.5, value: 'B' }]
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PiperTTSProvider({ audioContext: mockAudioContext });
    const result = await provider.synthesize('สวัสดี', 'th');

    expect(fetchMock).toHaveBeenCalledWith('/api/tts?text=%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5&speaker=en_US-lessac-medium');
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([{ start: 0.1, end: 0.5, value: 'B' }]);
  });

  test('synthesize throws error if voice is not configured for language', async () => {
    const provider = new PiperTTSProvider({ audioContext: mockAudioContext });
    await expect(provider.synthesize('Bonjour', 'fr')).rejects.toThrow(
      'Unsupported language or no voice configured for: fr'
    );
  });

  test('synthesize throws error on network failure (non-200)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PiperTTSProvider({ audioContext: mockAudioContext });
    await expect(provider.synthesize('Hello', 'en')).rejects.toThrow(
      'Piper TTS request failed with status: 500 Internal Server Error'
    );
  });

  test('lazily creates AudioContext if none provided in constructor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        audio: 'AAA=',
        cues: []
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Mock global AudioContext
    const decodeMock = vi.fn().mockResolvedValue(mockAudioBuffer);
    const mockGlobalAudioContext = vi.fn().mockImplementation(function(this: any) {
      return {
        decodeAudioData: decodeMock,
      };
    });
    vi.stubGlobal('AudioContext', mockGlobalAudioContext);

    const provider = new PiperTTSProvider();
    const result = await provider.synthesize('Hello', 'en');

    expect(mockGlobalAudioContext).toHaveBeenCalled();
    expect(decodeMock).toHaveBeenCalled();
    expect(result.audioBuffer).toBe(mockAudioBuffer);
    expect(result.mouthCues).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { conversationReducer, sendUserMessage } from '../src/store/conversationSlice';
import { avatarReducer } from '../src/store/avatarSlice';
import { OllamaProvider } from '../src/ai-provider/ollama-provider';
import { PiperTTSProvider } from '../src/ai-provider/piper-tts-provider';

// Mock Ollama and TTS synthesis
vi.mock('../src/ai-provider/ollama-provider');
vi.mock('../src/ai-provider/piper-tts-provider');

describe('Chat Integration Thunk', () => {
  let store: any;
  let mockAudioContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAudioContext = {
      currentTime: 10,
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 1.0 } as any),
      createBufferSource: vi.fn().mockImplementation(() => ({
        buffer: null,
        context: mockAudioContext,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null
      })),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 1024,
        frequencyBinCount: 512,
        connect: vi.fn(),
        disconnect: vi.fn(),
        getFloatTimeDomainData: vi.fn()
      }),
      destination: {}
    };

    store = configureStore({
      reducer: {
        ui: (state = { uiLanguage: 'en' }) => state,
        avatar: avatarReducer,
        conversation: conversationReducer
      }
    });
  });

  it('should run the complete pipeline thunk successfully', async () => {
    // 1. Mock OllamaProvider chatStream to return tokens including emotion tag
    const chatStreamSpy = vi.fn().mockImplementation(
      async (messages: any, language: string, onToken: (t: string) => void) => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        onToken('[happy] Hello ');
        onToken('world!');
        return '[happy] Hello world!';
      }
    );
    OllamaProvider.prototype.chatStream = chatStreamSpy;

    // 2. Mock PiperTTSProvider synthesize to return mocked audio buffer and cues
    const synthesizeSpy = vi.fn().mockResolvedValue({
      audioBuffer: { duration: 1.0 } as any,
      mouthCues: [{ start: 0, end: 1, value: 'A' }]
    });
    PiperTTSProvider.prototype.synthesize = synthesizeSpy;

    // 3. Dispatch the thunk
    const actionPromise = store.dispatch(
      sendUserMessage({ text: 'Hello AI', audioContext: mockAudioContext as any })
    );

    // Assert that thinking state was entered immediately
    expect(store.getState().avatar.pipelineStatus).toBe('thinking');
    expect(store.getState().conversation.status).toBe('loading');

    // Await thunk completion
    await actionPromise;

    // Assert history updates
    const state = store.getState();
    expect(state.conversation.messages).toHaveLength(2);
    expect(state.conversation.messages[0]).toEqual({ role: 'user', content: 'Hello AI' });
    expect(state.conversation.messages[1]).toEqual({ role: 'assistant', content: '[happy] Hello world!' });

    // Assert Ollama was called correctly
    expect(chatStreamSpy).toHaveBeenCalledWith(
      expect.any(Array),
      'en',
      expect.any(Function)
    );
  });
});

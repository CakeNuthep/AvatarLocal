import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { conversationReducer, sendUserMessage } from '../src/store/conversationSlice';
import { avatarReducer } from '../src/store/avatarSlice';
import { OllamaProvider } from '../src/ai-provider/ollama-provider';
import { PiperTTSProvider } from '../src/ai-provider/piper-tts-provider';
import { classifyTextEmotion } from '../src/ai-provider/emotion-classifier';

// Mock Ollama, TTS synthesis, and emotion classifier
vi.mock('../src/ai-provider/ollama-provider');
vi.mock('../src/ai-provider/piper-tts-provider');
vi.mock('../src/ai-provider/emotion-classifier');

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

    // Mock classifyTextEmotion to return a neutral/low score so it doesn't interfere
    vi.mocked(classifyTextEmotion).mockResolvedValue({ label: 'happy', score: 0.9 });

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

  it('should update avatar emotion if classification is confident (> 0.5) and different from current', async () => {
    // 1. Mock Ollama to stream clean tokens without emotion tag
    const chatStreamSpy = vi.fn().mockImplementation(
      async (messages: any, language: string, onToken: (t: string) => void) => {
        onToken('Hello there');
        return 'Hello there';
      }
    );
    OllamaProvider.prototype.chatStream = chatStreamSpy;
    PiperTTSProvider.prototype.synthesize = vi.fn().mockResolvedValue({
      audioBuffer: { duration: 1.0 } as any,
      mouthCues: []
    });

    // 2. Mock classifyTextEmotion to return 'happy' with high confidence
    vi.mocked(classifyTextEmotion).mockResolvedValue({ label: 'happy', score: 0.9 });

    // 3. Ensure store starts with 'neutral' emotion
    store.dispatch({ type: 'avatar/setCurrentEmotion', payload: 'neutral' });

    // 4. Send message and await
    await store.dispatch(
      sendUserMessage({ text: 'I am so happy!', audioContext: mockAudioContext as any })
    );

    // 5. Verify avatar emotion updated to 'happy'
    expect(store.getState().avatar.currentEmotion).toBe('happy');
    expect(classifyTextEmotion).toHaveBeenCalledWith('I am so happy!');
  });

  it('should not update avatar emotion if classification is different but confidence score is low (<= 0.5)', async () => {
    const chatStreamSpy = vi.fn().mockImplementation(
      async (messages: any, language: string, onToken: (t: string) => void) => {
        onToken('Hello there');
        return 'Hello there';
      }
    );
    OllamaProvider.prototype.chatStream = chatStreamSpy;
    PiperTTSProvider.prototype.synthesize = vi.fn().mockResolvedValue({
      audioBuffer: { duration: 1.0 } as any,
      mouthCues: []
    });

    // Mock classifyTextEmotion with low confidence
    vi.mocked(classifyTextEmotion).mockResolvedValue({ label: 'happy', score: 0.45 });

    store.dispatch({ type: 'avatar/setCurrentEmotion', payload: 'neutral' });

    await store.dispatch(
      sendUserMessage({ text: 'I am happy?', audioContext: mockAudioContext as any })
    );

    // Emotion should remain 'neutral' due to low confidence threshold
    expect(store.getState().avatar.currentEmotion).toBe('neutral');
  });

  it('should not update avatar emotion if classification is the same as current emotion', async () => {
    const chatStreamSpy = vi.fn().mockImplementation(
      async (messages: any, language: string, onToken: (t: string) => void) => {
        onToken('Hello there');
        return 'Hello there';
      }
    );
    OllamaProvider.prototype.chatStream = chatStreamSpy;
    PiperTTSProvider.prototype.synthesize = vi.fn().mockResolvedValue({
      audioBuffer: { duration: 1.0 } as any,
      mouthCues: []
    });

    // Mock classifyTextEmotion to return 'happy' with high confidence
    vi.mocked(classifyTextEmotion).mockResolvedValue({ label: 'happy', score: 0.9 });

    // Store is already 'happy'
    store.dispatch({ type: 'avatar/setCurrentEmotion', payload: 'happy' });

    // Use a spy to track if setCurrentEmotion action is dispatched (optional, checking state retention is safer)
    await store.dispatch(
      sendUserMessage({ text: 'I am happy!', audioContext: mockAudioContext as any })
    );

    // Emotion should remain 'happy' without unnecessary change triggers
    expect(store.getState().avatar.currentEmotion).toBe('happy');
  });
});

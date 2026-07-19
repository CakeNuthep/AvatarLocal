import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import App from '../src/App';
import { conversationReducer, sendUserMessage } from '../src/store/conversationSlice';
import { avatarReducer } from '../src/store/avatarSlice';
import { OllamaProvider } from '../src/ai-provider/ollama-provider';
import { PiperTTSProvider } from '../src/ai-provider/piper-tts-provider';
import { CoquiTTSProvider } from '../src/ai-provider/coqui-tts-provider';
import enTranslation from '../src/locales/en.json';
import thTranslation from '../src/locales/th.json';

// Mock Ollama & TTS Providers
vi.mock('../src/ai-provider/ollama-provider');
vi.mock('../src/ai-provider/piper-tts-provider');
vi.mock('../src/ai-provider/coqui-tts-provider');

// Mock AvatarCanvas to avoid Three.js GPU rendering issues
vi.mock('../src/avatar/AvatarCanvas', () => ({
  default: () => <div data-testid="mock-avatar-canvas">Avatar Canvas</div>
}));

describe('Phase 6 — Integration & Polish', () => {
  let store: any;
  let mockAudioContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAudioContext = {
      currentTime: 0,
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 1.0 }),
      createBufferSource: vi.fn().mockImplementation(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
        context: mockAudioContext
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

    const mockUIReducer = (state = { uiLanguage: 'en', ttsEngine: 'piper' }, action: any) => {
      if (action.type === 'ui/setTTSEngine') {
        return { ...state, ttsEngine: action.payload };
      }
      return state;
    };

    OllamaProvider.prototype.chatStream = vi.fn().mockImplementation(
      async (messages: any, language: string, onToken: any, signal?: AbortSignal) => {
        onToken('[happy] Hello world!');
        return '[happy] Hello world!';
      }
    );

    store = configureStore({
      reducer: {
        ui: mockUIReducer,
        avatar: avatarReducer,
        conversation: conversationReducer
      }
    });
  });

  describe('AbortController / Interrupt Mechanism', () => {
    it('passes abort signals and aborts active streams on consecutive messages', async () => {
      let captureSignals: AbortSignal[] = [];

      // Mock chatStream to delay and capture the signal
      const chatStreamSpy = vi.fn().mockImplementation(
        async (messages: any, language: string, onToken: any, signal?: AbortSignal) => {
          if (signal) captureSignals.push(signal);
          // Simulate latency
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'Response';
        }
      );
      OllamaProvider.prototype.chatStream = chatStreamSpy;

      PiperTTSProvider.prototype.synthesize = vi.fn().mockResolvedValue({
        audioBuffer: { duration: 1.0 },
        mouthCues: []
      });

      // Dispatch request 1
      const promise1 = store.dispatch(
        sendUserMessage({ text: 'Message 1', audioContext: mockAudioContext as any })
      );

      // Immediately dispatch request 2
      const promise2 = store.dispatch(
        sendUserMessage({ text: 'Message 2', audioContext: mockAudioContext as any })
      );

      await Promise.allSettled([promise1, promise2]);

      // Verify that two signals were captured and the first signal was aborted
      expect(captureSignals).toHaveLength(2);
      expect(captureSignals[0].aborted).toBe(true);
      expect(captureSignals[1].aborted).toBe(false);
    });
  });

  describe('OBS Streamer Mode Routing', () => {
    const originalLocation = window.location;

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation
      });
    });

    it('hides UI overlays and renders only full-screen canvas when mode=stream', () => {
      // Mock window.location search
      const mockLocation = new URL('http://localhost:5173/?mode=stream');
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: mockLocation
      });

      const { container } = render(
        <Provider store={store}>
          <App />
        </Provider>
      );

      // Verify debug elements/chat elements are absent
      expect(screen.queryByRole('heading', { name: /AURA AI/i })).toBeNull();
      expect(screen.queryByPlaceholderText(/Say something/i)).toBeNull();

      // Verify AvatarCanvas is present
      expect(screen.getByTestId('mock-avatar-canvas')).toBeDefined();

      // Verify default chroma class (transparent)
      expect(container.firstChild).toHaveClass('streamer-mode');
      expect(container.firstChild).toHaveClass('chroma-transparent');
    });

    it('sets green chroma key class when mode=stream&chroma=green', () => {
      const mockLocation = new URL('http://localhost:5173/?mode=stream&chroma=green');
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: mockLocation
      });

      const { container } = render(
        <Provider store={store}>
          <App />
        </Provider>
      );

      expect(container.firstChild).toHaveClass('chroma-green');
      expect(container.firstChild).not.toHaveClass('chroma-transparent');
    });
  });

  describe('Locale Keys Completeness Check', () => {
    it('contains identical translation keys across English and Thai locale files', () => {
      const enKeys = Object.keys(enTranslation.translation);
      const thKeys = Object.keys(thTranslation.translation);

      // Assert same length
      expect(enKeys.length).toEqual(thKeys.length);

      // Assert keys are matching
      enKeys.forEach((key) => {
        expect(thKeys).toContain(key);
      });
    });
  });

  describe('TTS Engine Selection', () => {
    it('switches TTS Engine in UI state and changes synthesis provider dynamically', async () => {
      const piperSynthesizeSpy = vi.fn().mockResolvedValue({ audioBuffer: { duration: 1.0 }, mouthCues: [] });
      const coquiSynthesizeSpy = vi.fn().mockResolvedValue({ audioBuffer: { duration: 1.0 }, mouthCues: [] });
      PiperTTSProvider.prototype.synthesize = piperSynthesizeSpy;
      CoquiTTSProvider.prototype.synthesize = coquiSynthesizeSpy;

      // 1. Initial engine is piper, run dispatch
      await store.dispatch(sendUserMessage({ text: 'Test Piper', audioContext: mockAudioContext as any }));
      expect(piperSynthesizeSpy).toHaveBeenCalled();
      expect(coquiSynthesizeSpy).not.toHaveBeenCalled();

      // Reset mock tracking
      vi.clearAllMocks();

      // 2. Change engine to coqui
      store.dispatch({ type: 'ui/setTTSEngine', payload: 'coqui' });
      expect(store.getState().ui.ttsEngine).toBe('coqui');

      // 3. Send message again, verify Coqui is used
      await store.dispatch(sendUserMessage({ text: 'Test Coqui', audioContext: mockAudioContext as any }));
      expect(coquiSynthesizeSpy).toHaveBeenCalled();
      expect(piperSynthesizeSpy).not.toHaveBeenCalled();
    });
  });
});

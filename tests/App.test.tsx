import { render, screen, fireEvent } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Provider } from 'react-redux'
import { store } from '../src/store'
import App from '../src/App'
import '../src/i18n'

import React from 'react'

vi.mock('../src/avatar/AvatarCanvas', () => ({
  default: () => React.createElement('div', { 'data-testid': 'avatar-canvas-placeholder' }, 'Avatar Canvas Mock'),
}))

test('renders App component and handles language switching', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  )

  // Switch to EN first to have a stable starting point
  const enButton = screen.getByRole('button', { name: /Switch to English/i })
  fireEvent.click(enButton)

  // Verify English UI text
  expect(screen.getByText(/Welcome to your AI Avatar/i)).toBeInTheDocument()

  // Switch to TH
  const thButton = screen.getByRole('button', { name: /Switch to Thai/i })
  fireEvent.click(thButton)

  // Verify Thai UI text
  expect(screen.getByText(/ยินดีต้อนรับสู่ AI Avatar ของคุณ/i)).toBeInTheDocument()
})

test('renders chat input and triggers synthesis on send button click', async () => {
  // Mock global AudioContext
  const mockAudioContextInstance = {
    state: 'suspended',
    resume: vi.fn().mockResolvedValue(undefined),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 1024,
      frequencyBinCount: 512,
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBufferSource: vi.fn().mockImplementation(function(this: any) {
      return {
        buffer: null,
        context: mockAudioContextInstance,
        start: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }),
    destination: {},
  };
  const mockAudioContextClass = vi.fn().mockImplementation(function(this: any) {
    return mockAudioContextInstance;
  });
  vi.stubGlobal('AudioContext', mockAudioContextClass);

  // Mock fetch to return a JSON stream for Ollama and a mock base64 for Piper synthesis
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/ollama/api/chat')) {
      const streamChunks = [
        JSON.stringify({ message: { content: '[happy] Hello!' } }) + '\n'
      ];
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamChunks[0]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn()
      };
      return Promise.resolve({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      });
    } else {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          audio: 'AAA=',
          cues: [],
        })
      });
    }
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <Provider store={store}>
      <App />
    </Provider>
  )

  // Reset to English first to ensure English UI strings are queried
  const enButton = screen.getByRole('button', { name: /Switch to English/i })
  fireEvent.click(enButton)

  const textarea = screen.getByPlaceholderText('Say something...');
  const sendButton = screen.getByText('Send');

  // Type a message and click send
  fireEvent.change(textarea, { target: { value: 'Test message' } });
  fireEvent.click(sendButton);

  // Wait for the async task queue/synthesis promise to resolve
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Verify AudioContext was instantiated and resumed
  expect(mockAudioContextClass).toHaveBeenCalled()
  expect(mockAudioContextInstance.resume).toHaveBeenCalled()
  
  // Verify fetch was called
  expect(fetchMock).toHaveBeenCalled()

  vi.unstubAllGlobals();
})

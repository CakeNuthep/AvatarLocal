import { render, screen, fireEvent } from '@testing-library/react'
import { expect, test } from 'vitest'
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
  const enButton = screen.getByText('EN')
  fireEvent.click(enButton)

  // Verify English UI text
  expect(screen.getByText(/Welcome to your AI Avatar/i)).toBeInTheDocument()

  // Switch to TH
  const thButton = screen.getByText('TH')
  fireEvent.click(thButton)

  // Verify Thai UI text
  expect(screen.getByText(/ยินดีต้อนรับสู่ AI Avatar ของคุณ/i)).toBeInTheDocument()
})

test('renders Test Voice & Lip-Sync button and triggers synthesis on click', async () => {
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
    createBufferSource: vi.fn().mockReturnValue({
      buffer: null,
      start: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    destination: {},
  };
  const mockAudioContextClass = vi.fn().mockImplementation(function(this: any) {
    return mockAudioContextInstance;
  });
  vi.stubGlobal('AudioContext', mockAudioContextClass);

  // Mock fetch to return a JSON envelope with base64 audio and empty cues list
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      audio: 'AAA=',
      cues: [],
    }),
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <Provider store={store}>
      <App />
    </Provider>
  )

  const testButton = screen.getByText('Test Voice & Lip-Sync')
  expect(testButton).toBeInTheDocument()

  // Click the test button
  fireEvent.click(testButton)

  // Wait for the async task queue/synthesis promise to resolve
  await new Promise((resolve) => setTimeout(resolve, 10))

  // Verify AudioContext was instantiated and resumed
  expect(mockAudioContextClass).toHaveBeenCalled()
  expect(mockAudioContextInstance.resume).toHaveBeenCalled()
  
  // Verify fetch was called by the TTSProvider
  expect(fetchMock).toHaveBeenCalled()
})


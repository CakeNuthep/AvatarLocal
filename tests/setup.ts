import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

// Mock R3F Canvas
vi.mock('@react-three/fiber', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    Canvas: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'r3f-canvas' }, children),
  }
})

// Mock R3F Drei OrbitControls
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
}))

// Mock R3F Postprocessing
vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'effect-composer' }, children),
  Bloom: () => React.createElement('div', { 'data-testid': 'bloom-effect' }),
}))

// Mock transformers.js globally to avoid network downloads during tests
vi.mock('@xenova/transformers', () => {
  const mockClassifier = vi.fn().mockImplementation(async () => {
    return [{ label: 'neutral', score: 1.0 }]
  })
  return {
    pipeline: vi.fn().mockResolvedValue(mockClassifier),
  }
})

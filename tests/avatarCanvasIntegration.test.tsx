import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { avatarReducer } from '../src/store/avatarSlice'
import AvatarCanvas from '../src/avatar/AvatarCanvas'
import { activeLipSyncDriverRef } from '../src/ai-provider/lip-sync-driver'
import React from 'react'

// Capture R3F frame loop callback
let frameCallback: ((state: any, delta: number) => void) | null = null

vi.mock('@react-three/fiber', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    Canvas: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'r3f-canvas' }, children),
    useFrame: vi.fn().mockImplementation((callback) => {
      frameCallback = callback
    }),
  }
})

// Mock useVRM hook to return a mock VRM model
const mockSetExpression = vi.fn()
const mockReset = vi.fn()
const mockVRM = {
  scene: {},
  expressionManager: {
    expressions: [{ name: 'aa', expressionName: 'aa' }],
    getValue: vi.fn().mockReturnValue(0),
    setValue: mockSetExpression,
    update: vi.fn(),
  },
}

vi.mock('../src/avatar/useVRM', () => ({
  useVRM: () => mockVRM,
}))

vi.mock('../src/avatar/useBlendshapeController', () => ({
  useBlendshapeController: () => ({
    setExpression: mockSetExpression,
    reset: mockReset,
  }),
}))

// Mock other hooks to avoid side effects
vi.mock('../src/avatar/useIdleAnimation', () => ({
  useIdleAnimation: vi.fn(),
}))
vi.mock('../src/avatar/useLookAtController', () => ({
  useLookAtController: vi.fn(),
}))

describe('AvatarCanvas and LipSync integration', () => {
  let store: any

  beforeEach(() => {
    vi.clearAllMocks()
    frameCallback = null
    activeLipSyncDriverRef.current = null

    store = configureStore({
      reducer: {
        ui: (state = { uiLanguage: 'en' }) => state,
        avatar: avatarReducer,
      },
    })
  });

  test('drives lip-sync via activeLipSyncDriverRef in frame loop with a 0.85 cap', () => {
    render(
      <Provider store={store}>
        <AvatarCanvas />
      </Provider>
    )

    // Ensure useFrame captured the callback
    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    // Set up active driver mock returning > 0.85 value
    const mockDriverUpdate = vi.fn().mockReturnValue(0.95)
    activeLipSyncDriverRef.current = {
      update: mockDriverUpdate,
    } as any

    // Trigger frame tick
    frameCallback({}, 0.016)

    // Assert driver.update() is called, and expression is set with the 0.85 cap
    expect(mockDriverUpdate).toHaveBeenCalled()
    expect(mockSetExpression).toHaveBeenCalledWith('aa', 0.85)
  })

  test('falls back to Redux mouthOpen when no active driver but speaking is true', () => {
    render(
      <Provider store={store}>
        <AvatarCanvas />
      </Provider>
    )

    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    // Update store state to speaking and 0.5 mouthOpen
    store.dispatch({ type: 'avatar/setPipelineStatus', payload: 'speaking' })
    store.dispatch({ type: 'avatar/setMouthOpen', payload: 0.5 })

    // Trigger frame tick (RTK subscription fires synchronously)
    frameCallback({}, 0.016)

    expect(mockSetExpression).toHaveBeenCalledWith('aa', 0.5)
  })
})

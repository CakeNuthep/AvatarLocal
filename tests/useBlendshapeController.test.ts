import { describe, expect, test, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBlendshapeController } from '../src/avatar/useBlendshapeController'
import * as r3f from '@react-three/fiber'
import { VRM } from '@pixiv/three-vrm'

// Capture the useFrame loop callback
let frameCallback: ((state: any, delta: number) => void) | null = null

vi.mock('@react-three/fiber', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    useFrame: vi.fn().mockImplementation((callback) => {
      frameCallback = callback
    }),
  }
})

describe('useBlendshapeController hook', () => {
  let mockVRM: any
  let expressionValues: Record<string, number>

  beforeEach(() => {
    vi.clearAllMocks()
    frameCallback = null
    expressionValues = {
      happy: 0,
      sad: 0,
      blink: 0,
    }

    mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
          { name: 'sad' },
          { name: 'blink' },
        ],
        setValue: vi.fn((name: string, value: number) => {
          expressionValues[name] = value
        }),
        getValue: vi.fn((name: string) => {
          return expressionValues[name] ?? 0
        }),
        update: vi.fn(),
      },
    } as unknown as VRM
  })

  test('setExpression sets value immediately and clamps input to [0, 1]', () => {
    const { result } = renderHook(() => useBlendshapeController(mockVRM))

    // Set normal value
    result.current.setExpression('happy', 0.8)
    expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 0.8)
    expect(expressionValues['happy']).toBe(0.8)

    // Set value below 0 (should clamp to 0)
    result.current.setExpression('sad', -0.5)
    expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('sad', 0)
    expect(expressionValues['sad']).toBe(0)

    // Set value above 1 (should clamp to 1)
    result.current.setExpression('blink', 1.5)
    expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', 1)
    expect(expressionValues['blink']).toBe(1)
  })

  test('lerpTo with duration <= 0 sets value immediately', () => {
    const { result } = renderHook(() => useBlendshapeController(mockVRM))

    result.current.lerpTo('happy', 0.7, 0)
    expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 0.7)
    expect(expressionValues['happy']).toBe(0.7)
  })

  test('lerpTo interpolates value over multiple simulated frames', () => {
    const { result } = renderHook(() => useBlendshapeController(mockVRM))

    // Start a lerp for 'happy' from current (0) to 1.0 over 0.2 seconds
    result.current.lerpTo('happy', 1.0, 0.2)

    // Ensure useFrame callback was captured
    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    // Simulate first frame: 0.1 seconds elapsed (50% progress)
    frameCallback({}, 0.1)
    expect(expressionValues['happy']).toBeCloseTo(0.5)
    expect(mockVRM.expressionManager.update).toHaveBeenCalled()

    // Simulate second frame: another 0.1 seconds elapsed (100% progress)
    frameCallback({}, 0.1)
    expect(expressionValues['happy']).toBe(1.0)

    // Simulate another frame: lerp should be completed, value remains 1.0
    mockVRM.expressionManager.setValue.mockClear()
    frameCallback({}, 0.1)
    expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalledWith('happy', expect.any(Number))
  })

  test('reset zeroes all expressions and cancels active lerps', () => {
    const { result } = renderHook(() => useBlendshapeController(mockVRM))

    // Set some initial values
    result.current.setExpression('happy', 0.5)
    result.current.setExpression('sad', 0.3)

    // Start a lerp that should be cancelled by reset
    result.current.lerpTo('blink', 1.0, 0.2)

    // Reset everything
    result.current.reset()

    expect(expressionValues['happy']).toBe(0)
    expect(expressionValues['sad']).toBe(0)
    expect(expressionValues['blink']).toBe(0)

    // Verify active lerp was cancelled and doesn't run in next frame
    if (!frameCallback) throw new Error('frameCallback not captured')
    mockVRM.expressionManager.setValue.mockClear()
    frameCallback({}, 0.1)
    expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalledWith('blink', expect.any(Number))
  })

  test('safely handles null VRM instance without crashing', () => {
    const { result } = renderHook(() => useBlendshapeController(null))

    expect(() => {
      result.current.setExpression('happy', 1.0)
      result.current.lerpTo('happy', 1.0, 0.2)
      result.current.reset()
    }).not.toThrow()
  })
})

import { describe, expect, test, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIdleAnimation } from '../src/avatar/useIdleAnimation'
import * as r3f from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'

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

describe('useIdleAnimation hook', () => {
  let mockVRM: any
  let chestRotation: { x: number; y: number; z: number }
  let expressions: Record<string, number>

  beforeEach(() => {
    vi.clearAllMocks()
    frameCallback = null
    chestRotation = { x: 0, y: 0, z: 0 }
    expressions = { blink: 0 }

    mockVRM = {
      humanoid: {
        getNormalizedBoneNode: vi.fn((boneName: string) => {
          if (boneName === VRMHumanBoneName.Chest) {
            return {
              rotation: chestRotation,
            }
          }
          return null
        }),
      },
      expressionManager: {
        setValue: vi.fn((name: string, value: number) => {
          expressions[name] = value
        }),
        getValue: vi.fn((name: string) => {
          return expressions[name] ?? 0
        }),
        update: vi.fn(),
      },
    } as unknown as VRM
  })

  test('drives chest bone rotation using breathing sine wave inside frame loop', () => {
    renderHook(() => useIdleAnimation(mockVRM))

    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    // At time PI/4 with frequency 2.0:
    // sin(PI/4 * 2.0) = sin(PI/2) = 1.0. Amplitude is 0.015
    const mockState = {
      clock: {
        getElapsedTime: () => Math.PI / 4,
      },
    }

    frameCallback(mockState, 0.1)

    expect(mockVRM.humanoid.getNormalizedBoneNode).toHaveBeenCalledWith(VRMHumanBoneName.Chest)
    expect(chestRotation.x).toBeCloseTo(0.015)
  })

  test('triggers random blinking animation cycles over simulated ticks', () => {
    renderHook(() => useIdleAnimation(mockVRM))

    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    const mockState = {
      clock: {
        getElapsedTime: () => 0.0,
      },
    }

    // First tick: force timer expiration to transition blink state from -1 to 0
    frameCallback(mockState, 10.0)

    // Second tick: execute active blink calculation
    frameCallback(mockState, 0.05)

    // Verify blinking sequence was initiated and set the blink weight
    expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', expect.any(Number))
    expect(expressions['blink']).toBeGreaterThan(0)
  })

  test('safely handles null VRM instance without throwing errors', () => {
    const { result } = renderHook(() => useIdleAnimation(null))

    expect(() => {
      if (frameCallback) {
        frameCallback({ clock: { getElapsedTime: () => 1.0 } }, 0.1)
      }
    }).not.toThrow()
  })
})

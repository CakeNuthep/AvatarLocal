import { describe, expect, test, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLookAtController } from '../src/avatar/useLookAtController'
import * as r3f from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { Object3D, Vector3, Matrix4 } from 'three'

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

describe('useLookAtController hook', () => {
  let mockVRM: any
  let neckRotation: { x: number; y: number; z: number }
  let headRotation: { x: number; y: number; z: number }

  beforeEach(() => {
    vi.clearAllMocks()
    frameCallback = null
    neckRotation = { x: 0, y: 0, z: 0 }
    headRotation = { x: 0, y: 0, z: 0 }

    mockVRM = {
      scene: {
        add: vi.fn(),
        remove: vi.fn(),
        worldToLocal: vi.fn((vec) => vec),
      },
      humanoid: {
        getNormalizedBoneNode: vi.fn((boneName: string) => {
          if (boneName === VRMHumanBoneName.Neck) {
            return { rotation: neckRotation }
          }
          if (boneName === VRMHumanBoneName.Head) {
            return { rotation: headRotation }
          }
          return null
        }),
      },
      lookAt: {
        target: null,
        update: vi.fn(),
      },
    } as unknown as VRM
  })

  test('binds vrm lookAt target to dummy target in effect', () => {
    const { unmount } = renderHook(() => useLookAtController(mockVRM))

    // Expect target to be instance of Object3D
    expect(mockVRM.lookAt.target).toBeInstanceOf(Object3D)

    unmount()
    expect(mockVRM.lookAt.target).toBeNull() // Restores original target
  })

  test('drives lookAt updates and bone rotations inside the R3F frame loop', () => {
    renderHook(() => useLookAtController(mockVRM))

    expect(frameCallback).toBeDefined()
    if (!frameCallback) throw new Error('frameCallback not captured')

    // Mock R3F state with real Vector3 and Matrix4 instances to avoid unproject crashes
    const mockState = {
      pointer: { x: 0.5, y: -0.2 },
      camera: {
        position: new Vector3(0, 1.4, 2.0),
        matrixWorld: new Matrix4(),
        projectionMatrixInverse: new Matrix4(),
      },
    }

    frameCallback(mockState, 0.1)

    // Verify lookAt solver updates
    expect(mockVRM.lookAt.update).toHaveBeenCalledWith(0.1)

    // Verify bone retrievals and rotations
    expect(mockVRM.humanoid.getNormalizedBoneNode).toHaveBeenCalledWith(VRMHumanBoneName.Neck)
    expect(mockVRM.humanoid.getNormalizedBoneNode).toHaveBeenCalledWith(VRMHumanBoneName.Head)
    expect(neckRotation.y).not.toBe(0)
    expect(headRotation.y).not.toBe(0)
  })

  test('safely handles null VRM instance without throwing errors', () => {
    const { result } = renderHook(() => useLookAtController(null))

    expect(() => {
      if (frameCallback) {
        frameCallback({
          pointer: { x: 0, y: 0 },
          camera: {
            position: new Vector3(0, 1.4, 2.0),
            matrixWorld: new Matrix4(),
            projectionMatrixInverse: new Matrix4(),
          }
        }, 0.1)
      }
    }).not.toThrow()
  })
})

import { describe, expect, test, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVRM } from '../src/avatar/useVRM'
import * as r3f from '@react-three/fiber'

vi.mock('@react-three/fiber', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    useLoader: vi.fn(),
  }
})

vi.mock('@pixiv/three-vrm', () => {
  return {
    VRMLoaderPlugin: class {
      parser: any
      constructor(parser: any) {
        this.parser = parser
      }
    },
  }
})

describe('useVRM hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns VRM instance when loader returns a gltf with vrm userData', () => {
    const mockVRM = { scene: {} }
    const mockGltf = {
      userData: {
        vrm: mockVRM,
      },
    }

    vi.mocked(r3f.useLoader).mockReturnValue(mockGltf)

    const { result } = renderHook(() => useVRM('/avatar.vrm'))

    expect(result.current).toBe(mockVRM)
    expect(r3f.useLoader).toHaveBeenCalledWith(
      expect.any(Function), // GLTFLoader
      '/avatar.vrm',
      expect.any(Function)  // Extensions callback
    )
  })

  test('returns null when loader returns gltf without vrm userData', () => {
    const mockGltf = {
      userData: {},
    }

    vi.mocked(r3f.useLoader).mockReturnValue(mockGltf)

    const { result } = renderHook(() => useVRM('/avatar.vrm'))

    expect(result.current).toBeNull()
  })

  test('registers VRMLoaderPlugin on loader during initialization', () => {
    const mockLoader = {
      register: vi.fn(),
    }

    vi.mocked(r3f.useLoader).mockImplementation((_loaderClass, _url, callback) => {
      if (callback) {
        callback(mockLoader)
      }
      return { userData: { vrm: {} } }
    })

    renderHook(() => useVRM('/avatar.vrm'))

    expect(mockLoader.register).toHaveBeenCalled()

    // Retrieve the plugin instantiation callback registered with the loader
    const registerCallback = mockLoader.register.mock.calls[0][0]
    const mockParser = {}
    const pluginInstance = registerCallback(mockParser)
    expect(pluginInstance).toBeDefined()
  })
})

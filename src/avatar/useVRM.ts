import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm'

/**
 * Custom hook to load a VRM model using React Three Fiber's useLoader
 * and the @pixiv/three-vrm plugin for GLTFLoader.
 * 
 * @param url The URL of the .vrm file
 * @returns The loaded VRM instance or null
 */
export function useVRM(url: string): VRM | null {
  const gltf = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser))
    }
  )

  return (gltf?.userData?.vrm as VRM) || null
}

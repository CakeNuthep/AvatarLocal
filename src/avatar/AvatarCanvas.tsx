import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSelector, useStore } from 'react-redux'
import { VRM } from '@pixiv/three-vrm'
import { ACESFilmicToneMapping } from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useVRM } from './useVRM'
import { useBlendshapeController } from './useBlendshapeController'
import { useIdleAnimation } from './useIdleAnimation'
import { useLookAtController } from './useLookAtController'
import AvatarDebugPanel from './AvatarDebugPanel'
import { type RootState, selectCurrentEmotion } from '../store'
import { activeLipSyncDriverRef } from '../ai-provider/lip-sync-driver'

interface AvatarModelProps {
  onLoaded: (vrm: VRM) => void
  onControllerReady: (controller: { setExpression: (name: string, weight: number) => void; reset: () => void }) => void
}

function AvatarModel({ onLoaded, onControllerReady }: AvatarModelProps) {
  const vrm = useVRM('/avatar.vrm')
  const controller = useBlendshapeController(vrm)
  
  // Trigger automatic idle breathing and blinking loop
  useIdleAnimation(vrm)

  // Track eyes to camera/cursor target
  useLookAtController(vrm)

  // Manual Redux store subscription to bypass React component re-renders for mouth movement
  const store = useStore()
  const mouthOpenRef = useRef(0)
  const isSpeakingRef = useRef(false)

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState() as RootState
      mouthOpenRef.current = state.avatar.mouthOpen
      isSpeakingRef.current = state.avatar.pipelineStatus === 'speaking'
    })
    return unsubscribe
  }, [store])

  // Drive lip sync (mouth open) inside the R3F render loop only when speaking
  useFrame(() => {
    if (controller && vrm) {
      if (activeLipSyncDriverRef.current) {
        // High-performance real-time analysis path (bypasses Redux)
        const volume = activeLipSyncDriverRef.current.update()
        const cappedMouthOpen = Math.min(0.85, volume)
        controller.setExpression('aa', cappedMouthOpen)
      } else if (isSpeakingRef.current) {
        // Fallback/Redux control path
        const cappedMouthOpen = Math.min(0.85, mouthOpenRef.current)
        controller.setExpression('aa', cappedMouthOpen)
      }
    }
  })

  useEffect(() => {
    if (vrm) {
      onLoaded(vrm)
      onControllerReady(controller)
    }
  }, [vrm, controller, onLoaded, onControllerReady])

  if (!vrm) return null

  // VRM model faces +Z, rotate 180 degrees (Math.PI) to face the camera
  return <primitive object={vrm.scene} rotation={[0, Math.PI, 0]} />
}

export default function AvatarCanvas() {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const currentEmotion = useSelector(selectCurrentEmotion)
  
  // Keep stable references to controller methods to avoid unnecessary renders
  const controllerRef = useRef<{
    setExpression: (name: string, weight: number) => void
    reset: () => void
  } | null>(null)

  const handleSetExpression = useCallback((name: string, weight: number) => {
    controllerRef.current?.setExpression(name, weight)
  }, [])

  const handleReset = useCallback(() => {
    controllerRef.current?.reset()
  }, [])

  const handleControllerReady = useCallback((controller: any) => {
    controllerRef.current = controller
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', background: '#111', position: 'relative' }}>
      <Canvas
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{ position: [0, 1.4, 1.5], fof: 35 } as any}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[2, 4, 2]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-2, 2, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <AvatarModel
            onLoaded={setVrm}
            onControllerReady={handleControllerReady}
          />
        </Suspense>
        {/* Target is placed around chest/face level of a typical model (~1.2m) */}
        <OrbitControls target={[0, 1.2, 0]} />
        <EffectComposer>
          <Bloom luminanceThreshold={1.0} luminanceSmoothing={0.9} intensity={0.4} />
        </EffectComposer>
      </Canvas>

      <AvatarDebugPanel
        vrm={vrm}
        setExpression={handleSetExpression}
        reset={handleReset}
      />
    </div>
  )
}

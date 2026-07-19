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
import { applyEmotion } from './emotionPresets'
import { activeLipSyncDriverRef } from '../ai-provider/lip-sync-driver'
import { activeRhubarbCuesRef } from '../ai-provider/audio-queue-scheduler'
import { getVisemeWeightsAtTime } from '../ai-provider/rhubarb-lip-sync'

interface AvatarModelProps {
  currentEmotion: string
  onLoaded: (vrm: VRM) => void
  onControllerReady: (controller: { setExpression: (name: string, weight: number) => void; reset: () => void }) => void
}

function AvatarModel({ currentEmotion, onLoaded, onControllerReady }: AvatarModelProps) {
  const vrm = useVRM('/avatar.vrm')
  const controller = useBlendshapeController(vrm)
  
  // Trigger automatic idle breathing, blinking, and posture loop
  useIdleAnimation(vrm, currentEmotion)

  // Track eyes to camera/cursor target with posture offset
  useLookAtController(vrm, currentEmotion)

  // Apply facial expression changes smoothly when emotion updates
  useEffect(() => {
    if (vrm && controller) {
      applyEmotion(controller, currentEmotion)
    }
  }, [currentEmotion, vrm, controller])

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

  // Drive lip sync (mouth open and visemes) inside the R3F render loop only when speaking
  useFrame(() => {
    if (controller && vrm) {
      const rhubarb = activeRhubarbCuesRef.current
      if (rhubarb) {
        // High-fidelity viseme path (drives a, e, i, o, u shapes matching sound)
        const elapsed = rhubarb.audioContext.currentTime - rhubarb.startTime
        const weights = getVisemeWeightsAtTime(rhubarb.cues, elapsed)

        controller.setExpression('aa', Math.min(0.85, weights.aa))
        controller.setExpression('ee', Math.min(0.85, weights.ee))
        controller.setExpression('ih', Math.min(0.85, weights.ih))
        controller.setExpression('oh', Math.min(0.85, weights.oh))
        controller.setExpression('ou', Math.min(0.85, weights.ou))

        // Still update the LipSyncDriver analyzer if it exists (for volume-based ticks)
        if (activeLipSyncDriverRef.current) {
          activeLipSyncDriverRef.current.update()
        }
      } else if (activeLipSyncDriverRef.current) {
        // High-performance real-time volume amplitude fallback path (bypasses Redux, aa only)
        const volume = activeLipSyncDriverRef.current.update()
        const cappedMouthOpen = Math.min(0.85, volume)
        controller.setExpression('aa', cappedMouthOpen)
        
        // Reset other visemes to 0
        controller.setExpression('ee', 0)
        controller.setExpression('ih', 0)
        controller.setExpression('oh', 0)
        controller.setExpression('ou', 0)
      } else if (isSpeakingRef.current) {
        // Fallback/Redux control path
        const cappedMouthOpen = Math.min(0.85, mouthOpenRef.current)
        controller.setExpression('aa', cappedMouthOpen)

        // Reset other visemes to 0
        controller.setExpression('ee', 0)
        controller.setExpression('ih', 0)
        controller.setExpression('oh', 0)
        controller.setExpression('ou', 0)
      } else {
        // When completely idle, reset all visemes
        controller.setExpression('aa', 0)
        controller.setExpression('ee', 0)
        controller.setExpression('ih', 0)
        controller.setExpression('oh', 0)
        controller.setExpression('ou', 0)
      }

      // Sync debug panel sliders in real-time if elements are present in the DOM
      if (vrm.expressionManager) {
        const expressions = vrm.expressionManager.expressions || []
        expressions.forEach((expression) => {
          const expName = (expression as any).expressionName || expression.name
          if (expName) {
            const val = vrm.expressionManager!.getValue(expName) ?? 0

            const slider = document.getElementById(`slider-input-${expName}`) as HTMLInputElement | null
            if (slider) {
              slider.value = val.toString()
            }

            const text = document.getElementById(`val-indicator-${expName}`) as HTMLSpanElement | null
            if (text) {
              text.innerText = val.toFixed(2)
            }
          }
        })
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

  const params = new URLSearchParams(window.location.search)
  const isStreamMode = params.get('mode') === 'stream'
  const containerBg = isStreamMode ? 'transparent' : '#111'

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', background: containerBg, position: 'relative' }}>
      <Canvas
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{ position: [0, 1.4, 1.5], fov: 35 } as any}
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
            currentEmotion={currentEmotion}
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

      {!isStreamMode && (
        <AvatarDebugPanel
          vrm={vrm}
          setExpression={handleSetExpression}
          reset={handleReset}
        />
      )}
    </div>
  )
}

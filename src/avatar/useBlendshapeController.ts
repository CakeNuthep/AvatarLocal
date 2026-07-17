import { useCallback, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { VRM } from '@pixiv/three-vrm'

interface LerpState {
  name: string
  startWeight: number
  targetWeight: number
  elapsed: number
  duration: number
}

/**
 * Custom hook to control and animate a VRM's facial expression blendshapes.
 * Provides APIs to immediately set weights, lerp smoothly over time, or reset all.
 * 
 * Runs frame updates inside R3F's useFrame loop, bypassing React state re-renders
 * for high performance.
 * 
 * @param vrm The VRM instance
 */
export function useBlendshapeController(vrm: VRM | null) {
  const activeLerpsRef = useRef<Record<string, LerpState>>({})

  // Set an expression value immediately and stop any active transition/lerp for it
  const setExpression = useCallback((name: string, weight: number) => {
    if (!vrm?.expressionManager) return
    const clamped = Math.max(0, Math.min(1, weight))
    
    // Add debug logging (filter out aa to prevent frame-loop console spam)
    if (name !== 'aa') {
      console.log(`[useBlendshapeController] setExpression name=${name} weight=${clamped}`)
    }
    
    vrm.expressionManager.setValue(name, clamped)
    
    // Clear any active lerp for this expression
    delete activeLerpsRef.current[name]
  }, [vrm])

  // Transition an expression weight from its current value to target weight over a duration (in seconds)
  const lerpTo = useCallback((name: string, weight: number, duration: number) => {
    if (!vrm?.expressionManager) return
    const clampedTarget = Math.max(0, Math.min(1, weight))
    const currentWeight = vrm.expressionManager.getValue(name) ?? 0

    if (duration <= 0) {
      setExpression(name, clampedTarget)
      return
    }

    activeLerpsRef.current[name] = {
      name,
      startWeight: currentWeight,
      targetWeight: clampedTarget,
      elapsed: 0,
      duration,
    }
  }, [vrm, setExpression])

  // Reset all known expressions to 0 and cancel all active lerps
  const reset = useCallback(() => {
    if (!vrm?.expressionManager) return
    
    // Clear all active lerps
    activeLerpsRef.current = {}

    // Reset all expressions on expressionManager
    const expressions = vrm.expressionManager.expressions || []
    expressions.forEach((expression) => {
      // Support both expression.name and expression.expressionName for maximum compatibility
      const expName = expression.name || (expression as any).expressionName
      if (expName) {
        vrm.expressionManager!.setValue(expName, 0)
      }
    })
  }, [vrm])

  const frameCountRef = useRef(0)

  // R3F render loop frame updates
  useFrame((_state, delta) => {
    if (!vrm?.expressionManager) return

    frameCountRef.current++
    if (frameCountRef.current % 180 === 0) {
      const expValues = (vrm.expressionManager.expressions || []).map((e) => {
        const name = e.name || (e as any).expressionName
        const val = vrm.expressionManager!.getValue(name) ?? 0
        return `${name}: ${val.toFixed(2)}`
      })
      console.log(`[useBlendshapeController] tick #` + frameCountRef.current + ` expressions:`, expValues)
    }

    const lerps = activeLerpsRef.current
    let needsUpdate = false

    for (const name in lerps) {
      const lerp = lerps[name]
      lerp.elapsed += delta

      const progress = Math.min(1, lerp.elapsed / lerp.duration)
      const current = lerp.startWeight + (lerp.targetWeight - lerp.startWeight) * progress

      vrm.expressionManager.setValue(name, current)
      needsUpdate = true

      if (progress >= 1) {
        delete lerps[name]
      }
    }

    // Always update expressionManager to apply values to the avatar's morph targets
    vrm.expressionManager.update()
  })

  return {
    setExpression,
    lerpTo,
    reset,
  }
}

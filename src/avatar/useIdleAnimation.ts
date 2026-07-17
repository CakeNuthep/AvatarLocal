import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { getBreathingAngle, calculateBlinkWeight, getRandomBlinkInterval } from './idleAnimation'

/**
 * Custom hook that animates chest breathing and scheduled random eye blinking
 * inside R3F's frame loop.
 * 
 * @param vrm The VRM instance
 */
export function useIdleAnimation(vrm: VRM | null) {
  const blinkTimerRef = useRef<number>(getRandomBlinkInterval(2, 6))
  const blinkElapsedRef = useRef<number>(-1) // -1 means we are not currently blinking

  useFrame((state, delta) => {
    if (!vrm) return

    // 1. Breathing Animation (Chest or Spine bone)
    const chestNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest) ||
                      vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine)
    if (chestNode) {
      const breathingAngle = getBreathingAngle(state.clock.getElapsedTime())
      chestNode.rotation.x = breathingAngle
    }

    // 2. Random Blinking (facial expressions)
    if (vrm.expressionManager) {
      if (blinkElapsedRef.current === -1) {
        // Eyes are open, count down timer until the next blink
        blinkTimerRef.current -= delta
        if (blinkTimerRef.current <= 0) {
          // Transition to the blinking state
          blinkElapsedRef.current = 0
        }
      } else {
        // We are currently in a blink sequence
        blinkElapsedRef.current += delta
        const blinkWeight = calculateBlinkWeight(blinkElapsedRef.current)
        
        vrm.expressionManager.setValue('blink', blinkWeight)

        // Complete blink sequence takes 0.24 seconds
        if (blinkElapsedRef.current >= 0.24) {
          // Reset blink state and schedule a new random interval
          blinkElapsedRef.current = -1
          blinkTimerRef.current = getRandomBlinkInterval(2, 6)
        }
      }
    }
  })
}

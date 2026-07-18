import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { getBreathingAngle, calculateBlinkWeight, getRandomBlinkInterval } from './idleAnimation'
import { POSTURE_PRESETS } from './posturePresets'

/**
 * Custom hook that animates chest breathing, scheduled random eye blinking,
 * and procedural spine/shoulder posture adjustments based on the active emotion.
 * 
 * @param vrm The VRM instance
 * @param currentEmotion The active emotion label
 */
export function useIdleAnimation(vrm: VRM | null, currentEmotion = 'neutral') {
  const blinkTimerRef = useRef<number>(getRandomBlinkInterval(2, 6))
  const blinkElapsedRef = useRef<number>(-1) // -1 means we are not currently blinking

  // Refs to track current rotation states for smooth interpolation
  const currentSpineRot = useRef({ x: 0, y: 0, z: 0 })
  const currentLShoulderRot = useRef({ x: 0, y: 0, z: 0 })
  const currentRShoulderRot = useRef({ x: 0, y: 0, z: 0 })

  useFrame((state, delta) => {
    if (!vrm) return

    // 1. Posture Interpolation
    const emotion = (currentEmotion || 'neutral').toLowerCase()
    const preset = POSTURE_PRESETS[emotion] || POSTURE_PRESETS.neutral

    const targetSpine = preset[VRMHumanBoneName.Spine] || { x: 0, y: 0, z: 0 }
    const targetLShoulder = preset[VRMHumanBoneName.LeftShoulder] || { x: 0, y: 0, z: 0 }
    const targetRShoulder = preset[VRMHumanBoneName.RightShoulder] || { x: 0, y: 0, z: 0 }

    const speed = 4.0
    const factor = Math.min(1, speed * delta)

    // Smoothly lerp active rotations
    currentSpineRot.current.x += (targetSpine.x - currentSpineRot.current.x) * factor
    currentSpineRot.current.y += (targetSpine.y - currentSpineRot.current.y) * factor
    currentSpineRot.current.z += (targetSpine.z - currentSpineRot.current.z) * factor

    currentLShoulderRot.current.x += (targetLShoulder.x - currentLShoulderRot.current.x) * factor
    currentLShoulderRot.current.y += (targetLShoulder.y - currentLShoulderRot.current.y) * factor
    currentLShoulderRot.current.z += (targetLShoulder.z - currentLShoulderRot.current.z) * factor

    currentRShoulderRot.current.x += (targetRShoulder.x - currentRShoulderRot.current.x) * factor
    currentRShoulderRot.current.y += (targetRShoulder.y - currentRShoulderRot.current.y) * factor
    currentRShoulderRot.current.z += (targetRShoulder.z - currentRShoulderRot.current.z) * factor

    // Apply spine posture and combine with breathing
    const chestNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest)
    const spineNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine)

    if (spineNode) {
      spineNode.rotation.x = currentSpineRot.current.x
      spineNode.rotation.y = currentSpineRot.current.y
      spineNode.rotation.z = currentSpineRot.current.z
    }

    if (chestNode) {
      const breathingAngle = getBreathingAngle(state.clock.getElapsedTime())
      chestNode.rotation.x = breathingAngle
      if (!spineNode) {
        // Fallback: merge posture with chest node if spine is missing
        chestNode.rotation.x += currentSpineRot.current.x
        chestNode.rotation.y = currentSpineRot.current.y
        chestNode.rotation.z = currentSpineRot.current.z
      }
    } else if (spineNode) {
      // Fallback: merge breathing with spine if chest is missing
      const breathingAngle = getBreathingAngle(state.clock.getElapsedTime())
      spineNode.rotation.x += breathingAngle
    }

    // Apply shoulder postures
    const leftShoulderNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftShoulder)
    const rightShoulderNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightShoulder)

    if (leftShoulderNode) {
      leftShoulderNode.rotation.x = currentLShoulderRot.current.x
      leftShoulderNode.rotation.y = currentLShoulderRot.current.y
      leftShoulderNode.rotation.z = currentLShoulderRot.current.z
    }
    if (rightShoulderNode) {
      rightShoulderNode.rotation.x = currentRShoulderRot.current.x
      rightShoulderNode.rotation.y = currentRShoulderRot.current.y
      rightShoulderNode.rotation.z = currentRShoulderRot.current.z
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

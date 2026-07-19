import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { Object3D, Vector3 } from 'three'
import { calculateGazeAngles, clampAngle } from './lookAtMath'
import { POSTURE_PRESETS } from './posturePresets'

/**
 * Custom hook to bind the VRM avatar's gaze tracking to the camera
 * viewport and mouse cursor, adding procedural head and neck tracking combined
 * with active posture offsets based on the current emotion.
 * 
 * @param vrm The VRM instance
 * @param currentEmotion The active emotion label
 * @param speed Lerp interpolation speed (default 6.0)
 */
export function useLookAtController(vrm: VRM | null, currentEmotion = 'neutral', speed = 6.0) {
  const dummyTargetRef = useRef<Object3D>(new Object3D())
  const localTargetRef = useRef<Vector3>(new Vector3())

  // Refs to track active Head and Neck posture offsets
  const currentNeckOffset = useRef({ x: 0, y: 0, z: 0 })
  const currentHeadOffset = useRef({ x: 0, y: 0, z: 0 })

  // Configure target binding on load
  useEffect(() => {
    if (!vrm || !vrm.lookAt) return

    const prevTarget = vrm.lookAt.target
    vrm.lookAt.target = dummyTargetRef.current

    return () => {
      if (vrm.lookAt) {
        vrm.lookAt.target = prevTarget
      }
    }
  }, [vrm])

  useFrame((state, delta) => {
    if (!vrm || !vrm.lookAt) return

    // 1. Posture offset calculation
    const emotion = (currentEmotion || 'neutral').toLowerCase()
    const preset = POSTURE_PRESETS[emotion] || POSTURE_PRESETS.neutral

    const targetNeck = preset[VRMHumanBoneName.Neck] || { x: 0, y: 0, z: 0 }
    const targetHead = preset[VRMHumanBoneName.Head] || { x: 0, y: 0, z: 0 }

    const lerpFactor = Math.min(1, speed * delta)
    currentNeckOffset.current.x += (targetNeck.x - currentNeckOffset.current.x) * lerpFactor
    currentNeckOffset.current.y += (targetNeck.y - currentNeckOffset.current.y) * lerpFactor
    currentNeckOffset.current.z += (targetNeck.z - currentNeckOffset.current.z) * lerpFactor

    currentHeadOffset.current.x += (targetHead.x - currentHeadOffset.current.x) * lerpFactor
    currentHeadOffset.current.y += (targetHead.y - currentHeadOffset.current.y) * lerpFactor
    currentHeadOffset.current.z += (targetHead.z - currentHeadOffset.current.z) * lerpFactor

    // 2. Convert normalized 2D pointer coordinates [-1, 1] into 3D world space
    const mouseVector = new Vector3(state.pointer.x, state.pointer.y, 0.5)
    mouseVector.unproject(state.camera)

    // 3. Calculate ray direction from camera origin through mouse vector
    const direction = mouseVector.sub(state.camera.position).normalize()

    // 4. Project target point along the ray at a distance roughly matching camera-to-avatar gap
    const targetDistance = 1.5
    const targetWorldPos = state.camera.position
      .clone()
      .add(direction.multiplyScalar(targetDistance))

    // 5. Smoothly lerp the dummy target position towards target position
    dummyTargetRef.current.position.lerp(targetWorldPos, speed * delta)

    // 6. Convert world target position to the local space of the VRM scene
    const localTarget = localTargetRef.current
    vrm.scene.worldToLocal(localTarget.copy(dummyTargetRef.current.position))

    // 7. Calculate yaw/pitch angles relative to the head height
    const { yaw, pitch } = calculateGazeAngles(localTarget)

    // 8. Get head and neck bone joints
    const neckNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Neck)
    const headNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head)

    // 9. Distribute gaze rotation contribution (neck 20% / head 15%) and clamp to realistic human bounds
    const targetNeckYaw = clampAngle(yaw * 0.2, 10) // max 10 degrees yaw
    const targetNeckPitch = clampAngle(pitch * 0.1, 5) // max 5 degrees pitch

    const targetHeadYaw = clampAngle(yaw * 0.15, 15) // max 15 degrees yaw
    const targetHeadPitch = clampAngle(pitch * 0.1, 10) // max 10 degrees pitch

    // 10. Combine gaze rotation with the interpolated active emotion posture offsets
    if (neckNode) {
      neckNode.rotation.y += (targetNeckYaw + currentNeckOffset.current.y - neckNode.rotation.y) * speed * delta
      neckNode.rotation.x += (targetNeckPitch + currentNeckOffset.current.x - neckNode.rotation.x) * speed * delta
      neckNode.rotation.z += (currentNeckOffset.current.z - neckNode.rotation.z) * speed * delta
    }
    if (headNode) {
      headNode.rotation.y += (targetHeadYaw + currentHeadOffset.current.y - headNode.rotation.y) * speed * delta
      headNode.rotation.x += (targetHeadPitch + currentHeadOffset.current.x - headNode.rotation.x) * speed * delta
      headNode.rotation.z += (currentHeadOffset.current.z - headNode.rotation.z) * speed * delta
    }

    // 11. Update LookAt solver to align eyes
    vrm.lookAt.update(delta)
  })
}

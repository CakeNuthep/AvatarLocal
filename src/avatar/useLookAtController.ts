import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { Object3D, Vector3 } from 'three'
import { calculateGazeAngles, clampAngle } from './lookAtMath'

/**
 * Custom hook to bind the VRM avatar's gaze tracking to the camera
 * viewport and mouse cursor, adding procedural head and neck tracking.
 * 
 * @param vrm The VRM instance
 * @param speed Lerp interpolation speed (default 6.0)
 */
export function useLookAtController(vrm: VRM | null, speed = 6.0) {
  const dummyTargetRef = useRef<Object3D>(new Object3D())
  const localTargetRef = useRef<Vector3>(new Vector3())

  // Configure target binding on load
  useEffect(() => {
    if (!vrm) return

    const prevTarget = vrm.lookAt.target
    vrm.lookAt.target = dummyTargetRef.current

    return () => {
      vrm.lookAt.target = prevTarget
    }
  }, [vrm])

  useFrame((state, delta) => {
    if (!vrm) return

    // 1. Convert normalized 2D pointer coordinates [-1, 1] into 3D world space
    const mouseVector = new Vector3(state.pointer.x, state.pointer.y, 0.5)
    mouseVector.unproject(state.camera)

    // 2. Calculate ray direction from camera origin through mouse vector
    const direction = mouseVector.sub(state.camera.position).normalize()

    // 3. Project target point along the ray at a distance roughly matching camera-to-avatar gap
    const targetDistance = 1.5
    const targetWorldPos = state.camera.position
      .clone()
      .add(direction.multiplyScalar(targetDistance))

    // 4. Smoothly lerp the dummy target position towards target position
    dummyTargetRef.current.position.lerp(targetWorldPos, speed * delta)

    // 5. Convert world target position to the local space of the VRM scene
    const localTarget = localTargetRef.current
    vrm.scene.worldToLocal(localTarget.copy(dummyTargetRef.current.position))

    // 6. Calculate yaw/pitch angles relative to the head height
    const { yaw, pitch } = calculateGazeAngles(localTarget)

    // 7. Get head and neck bone joints
    const neckNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Neck)
    const headNode = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head)

    // 8. Distribute gaze rotation contribution (neck 20% / head 15%) and clamp to realistic human bounds
    const targetNeckYaw = clampAngle(yaw * 0.2, 10) // max 10 degrees yaw
    const targetNeckPitch = clampAngle(pitch * 0.1, 5) // max 5 degrees pitch

    const targetHeadYaw = clampAngle(yaw * 0.15, 15) // max 15 degrees yaw
    const targetHeadPitch = clampAngle(pitch * 0.1, 10) // max 10 degrees pitch

    // 9. Smoothly lerp the bone rotations towards the targets
    if (neckNode) {
      neckNode.rotation.y += (targetNeckYaw - neckNode.rotation.y) * speed * delta
      neckNode.rotation.x += (targetNeckPitch - neckNode.rotation.x) * speed * delta
    }
    if (headNode) {
      headNode.rotation.y += (targetHeadYaw - headNode.rotation.y) * speed * delta
      headNode.rotation.x += (targetHeadPitch - headNode.rotation.x) * speed * delta
    }

    // 10. Update LookAt solver to align eyes
    vrm.lookAt.update(delta)
  })
}

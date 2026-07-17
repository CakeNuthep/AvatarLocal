/**
 * Clamps a radian angle to a maximum range defined in degrees.
 * 
 * @param angle The angle to clamp (in radians)
 * @param maxDegrees The clamp range (in degrees, ±maxDegrees)
 * @returns Clamped angle (in radians)
 */
export function clampAngle(angle: number, maxDegrees: number): number {
  const maxRadians = (maxDegrees * Math.PI) / 180
  return Math.max(-maxRadians, Math.min(maxRadians, angle))
}

/**
 * Calculates local yaw and pitch gaze angles (in radians) towards a local target.
 * Assumes the avatar faces positive Z in local space (+Z is forward).
 * 
 * @param localTarget Local coordinate vector of the gaze target
 * @param headHeight Estimated height of the avatar's head (default 1.4)
 * @returns Yaw (horizontal rotation, rad) and Pitch (vertical rotation, rad)
 */
export function calculateGazeAngles(
  localTarget: { x: number; y: number; z: number },
  headHeight = 1.4
): { yaw: number; pitch: number } {
  // Avoid divisions by zero or coordinates behind the head (clamp to forward defaults)
  if (localTarget.z <= 0.1) {
    return { yaw: 0, pitch: 0 }
  }

  // Yaw: horizontal angle (rotation around Y axis)
  // atan2(x, z) gives the angle relative to the forward direction (+Z)
  const yaw = Math.atan2(localTarget.x, localTarget.z)

  // Pitch: vertical angle (rotation around X axis)
  // positive pitch tilts down, negative pitch tilts up
  const deltaY = localTarget.y - headHeight
  const pitch = -Math.atan2(deltaY, localTarget.z)

  return { yaw, pitch }
}

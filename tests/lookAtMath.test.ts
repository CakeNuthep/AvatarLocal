import { describe, expect, test } from 'vitest'
import { clampAngle, calculateGazeAngles } from '../src/avatar/lookAtMath'

describe('lookAtMath helpers', () => {
  test('clampAngle clamps radian values to configured degree ranges', () => {
    // 10 degrees in radians is approx 0.1745
    const tenDegreesInRadians = (10 * Math.PI) / 180

    // Within bounds, should not clamp
    expect(clampAngle(0.1, 10)).toBeCloseTo(0.1)
    expect(clampAngle(-0.1, 10)).toBeCloseTo(-0.1)

    // Above positive boundary
    expect(clampAngle(0.3, 10)).toBeCloseTo(tenDegreesInRadians)

    // Below negative boundary
    expect(clampAngle(-0.3, 10)).toBeCloseTo(-tenDegreesInRadians)
  })

  test('calculateGazeAngles returns zero angles when target is straight ahead', () => {
    const target = { x: 0, y: 1.4, z: 1.0 }
    const { yaw, pitch } = calculateGazeAngles(target, 1.4)

    expect(yaw).toBeCloseTo(0)
    expect(pitch).toBeCloseTo(0)
  })

  test('calculateGazeAngles calculates correct horizontal yaw angles', () => {
    // Target is 45 degrees to the left (x = z)
    const targetLeft = { x: 1.0, y: 1.4, z: 1.0 }
    const { yaw } = calculateGazeAngles(targetLeft, 1.4)
    expect(yaw).toBeCloseTo(Math.PI / 4)

    // Target is 45 degrees to the right (x = -z)
    const targetRight = { x: -1.0, y: 1.4, z: 1.0 }
    const { yaw: yawRight } = calculateGazeAngles(targetRight, 1.4)
    expect(yawRight).toBeCloseTo(-Math.PI / 4)
  })

  test('calculateGazeAngles calculates correct vertical pitch angles', () => {
    // Target is higher than head (looking up, pitch is negative in Three.js)
    const targetUp = { x: 0, y: 2.4, z: 1.0 } // deltaY = 1.0, z = 1.0
    const { pitch } = calculateGazeAngles(targetUp, 1.4)
    expect(pitch).toBeCloseTo(-Math.PI / 4)

    // Target is lower than head (looking down, pitch is positive in Three.js)
    const targetDown = { x: 0, y: 0.4, z: 1.0 } // deltaY = -1.0, z = 1.0
    const { pitch: pitchDown } = calculateGazeAngles(targetDown, 1.4)
    expect(pitchDown).toBeCloseTo(Math.PI / 4)
  })

  test('calculateGazeAngles returns zero default when target is behind or too close', () => {
    const targetBehind = { x: 0, y: 1.4, z: 0.0 }
    const { yaw, pitch } = calculateGazeAngles(targetBehind, 1.4)

    expect(yaw).toBe(0)
    expect(pitch).toBe(0)
  })
})

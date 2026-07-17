import { describe, expect, test } from 'vitest'
import { getBreathingAngle, calculateBlinkWeight, getRandomBlinkInterval } from '../src/avatar/idleAnimation'

describe('idleAnimation pure helpers', () => {
  test('getBreathingAngle calculates correct sine wave values over time', () => {
    // Math.sin(0) * 0.015 = 0
    expect(getBreathingAngle(0)).toBeCloseTo(0)
    
    // Math.sin(Math.PI / 4 * 2.0) * 0.015 = Math.sin(Math.PI / 2) * 0.015 = 0.015
    expect(getBreathingAngle(Math.PI / 4)).toBeCloseTo(0.015)

    // Math.sin(Math.PI / 2 * 2.0) * 0.015 = Math.sin(Math.PI) * 0.015 = 0
    expect(getBreathingAngle(Math.PI / 2)).toBeCloseTo(0)
  })

  test('calculateBlinkWeight interpolates blinking curve correctly over time', () => {
    // Before blink sequence starts
    expect(calculateBlinkWeight(-0.1)).toBe(0)

    // Eyes closing: 0.04s is halfway through the 0.08s close duration
    expect(calculateBlinkWeight(0.04)).toBeCloseTo(0.5)

    // Eyes fully closed: 0.08s mark
    expect(calculateBlinkWeight(0.08)).toBe(1.0)

    // Eyes holding closed: 0.10s is during the 0.04s hold duration
    expect(calculateBlinkWeight(0.10)).toBe(1.0)

    // Eyes opening: 0.18s is halfway through the 0.12s open duration (0.06s elapsed)
    expect(calculateBlinkWeight(0.18)).toBeCloseTo(0.5)

    // Eyes fully open: 0.24s mark (total duration complete)
    expect(calculateBlinkWeight(0.24)).toBe(0.0)

    // Beyond the blink duration
    expect(calculateBlinkWeight(0.30)).toBe(0.0)
  })

  test('getRandomBlinkInterval boundaries are respect', () => {
    for (let i = 0; i < 100; i++) {
      const interval = getRandomBlinkInterval(2, 6)
      expect(interval).toBeGreaterThanOrEqual(2)
      expect(interval).toBeLessThanOrEqual(6)
    }
  })
})

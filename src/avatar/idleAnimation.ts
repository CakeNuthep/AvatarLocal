/**
 * Calculates a pitch rotation angle (in radians) to simulate breathing.
 * 
 * @param time Current elapsed time (in seconds)
 * @param frequency Frequency of breathing cycles (radians/second)
 * @param amplitude Max pitch rotation angle (in radians, 0.015 rad is ~0.86 degrees)
 */
export function getBreathingAngle(time: number, frequency = 2.0, amplitude = 0.015): number {
  return Math.sin(time * frequency) * amplitude
}

/**
 * Calculates the blink expression weight based on elapsed time since the blink started.
 * A complete blink sequence takes exactly 0.24 seconds:
 * - 0.08s closing (climbing from 0 to 1)
 * - 0.04s closed (holding at 1)
 * - 0.12s opening (falling from 1 to 0)
 * 
 * @param elapsed Seconds elapsed since the blink sequence started
 * @returns Weight between 0 (fully open) and 1 (fully closed)
 */
export function calculateBlinkWeight(elapsed: number): number {
  const closeDuration = 0.08
  const holdDuration = 0.04
  const openDuration = 0.12
  const totalDuration = closeDuration + holdDuration + openDuration

  if (elapsed < 0) return 0
  if (elapsed < closeDuration) {
    return elapsed / closeDuration
  }
  if (elapsed < closeDuration + holdDuration) {
    return 1.0
  }
  if (elapsed < totalDuration) {
    const openElapsed = elapsed - (closeDuration + holdDuration)
    return 1.0 - openElapsed / openDuration
  }
  return 0.0
}

/**
 * Generates a random interval (in seconds) representing the wait time between blinks.
 * 
 * @param min Minimum wait time
 * @param max Maximum wait time
 * @returns Seconds duration
 */
export function getRandomBlinkInterval(min = 2, max = 6): number {
  return min + Math.random() * (max - min)
}

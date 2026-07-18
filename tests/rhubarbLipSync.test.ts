import { describe, expect, test } from 'vitest';
import {
  RHUBARB_VISEME_MAP,
  getActiveMouthCue,
  getVisemeWeightsAtTime,
  RhubarbMouthCue,
} from '../src/ai-provider/rhubarb-lip-sync';

describe('Rhubarb Viseme Map', () => {
  test('contains mappings for all expected shapes A-H, X', () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'];
    keys.forEach((key) => {
      expect(RHUBARB_VISEME_MAP[key]).toBeDefined();
      expect(RHUBARB_VISEME_MAP[key]).toHaveProperty('aa');
      expect(RHUBARB_VISEME_MAP[key]).toHaveProperty('ee');
      expect(RHUBARB_VISEME_MAP[key]).toHaveProperty('ih');
      expect(RHUBARB_VISEME_MAP[key]).toHaveProperty('oh');
      expect(RHUBARB_VISEME_MAP[key]).toHaveProperty('ou');
    });
  });
});

describe('Rhubarb Cue Resolving', () => {
  const sampleCues: RhubarbMouthCue[] = [
    { start: 0.0, end: 0.15, value: 'X' },
    { start: 0.15, end: 0.35, value: 'B' },
    { start: 0.35, end: 0.8, value: 'C' },
    { start: 0.8, end: 1.2, value: 'D' },
  ];

  test('returns null when cue list is empty', () => {
    expect(getActiveMouthCue([], 0.5)).toBeNull();
  });

  test('locates exact cue within time boundaries', () => {
    expect(getActiveMouthCue(sampleCues, 0.05)).toEqual(sampleCues[0]);
    expect(getActiveMouthCue(sampleCues, 0.2)).toEqual(sampleCues[1]);
    expect(getActiveMouthCue(sampleCues, 0.5)).toEqual(sampleCues[2]);
    expect(getActiveMouthCue(sampleCues, 1.0)).toEqual(sampleCues[3]);
  });

  test('clamps out-of-bound lookup offsets to boundaries', () => {
    // Before start time
    expect(getActiveMouthCue(sampleCues, -0.5)).toEqual(sampleCues[0]);

    // After end time
    expect(getActiveMouthCue(sampleCues, 2.5)).toEqual(sampleCues[3]);
  });

  test('resolves active viseme weights correctly over time', () => {
    // At 0.05 seconds, cue value is 'X' (silence) -> all zero
    expect(getVisemeWeightsAtTime(sampleCues, 0.05)).toEqual(RHUBARB_VISEME_MAP.X);

    // At 0.5 seconds, cue value is 'C' -> aa: 0.70
    expect(getVisemeWeightsAtTime(sampleCues, 0.5)).toEqual(RHUBARB_VISEME_MAP.C);

    // At 1.0 seconds, cue value is 'D' -> aa: 0.95
    expect(getVisemeWeightsAtTime(sampleCues, 1.0)).toEqual(RHUBARB_VISEME_MAP.D);
  });
});

import { describe, expect, test } from 'vitest';
import { POSTURE_PRESETS } from '../src/avatar/posturePresets';
import { VRMHumanBoneName } from '@pixiv/three-vrm';

describe('Posture Presets Mappings', () => {
  test('contains target posture entries for core expressions', () => {
    const keys = ['neutral', 'happy', 'sad', 'angry', 'surprised'];
    keys.forEach((key) => {
      expect(POSTURE_PRESETS[key]).toBeDefined();
      
      const preset = POSTURE_PRESETS[key];
      // Verify standard bones are present in mapping
      expect(preset[VRMHumanBoneName.Spine]).toBeDefined();
      expect(preset[VRMHumanBoneName.Neck]).toBeDefined();
      expect(preset[VRMHumanBoneName.LeftShoulder]).toBeDefined();
      expect(preset[VRMHumanBoneName.RightShoulder]).toBeDefined();

      // Verify shape: {x, y, z} numeric properties
      Object.values(preset).forEach((rot) => {
        expect(rot).toHaveProperty('x');
        expect(rot).toHaveProperty('y');
        expect(rot).toHaveProperty('z');
        expect(typeof rot.x).toBe('number');
        expect(typeof rot.y).toBe('number');
        expect(typeof rot.z).toBe('number');
      });
    });
  });

  test('sad posture contains correct slumped rotation offsets', () => {
    const sadPreset = POSTURE_PRESETS.sad;
    // Sad posture slumps spine forward (x > 0)
    expect(sadPreset[VRMHumanBoneName.Spine].x).toBeGreaterThan(0);
    // Sad posture slumps head down (x > 0)
    expect(sadPreset[VRMHumanBoneName.Neck].x).toBeGreaterThan(0);
    // Sad posture drops shoulders down/forward
    expect(sadPreset[VRMHumanBoneName.LeftShoulder].z).toBeLessThan(0);
    expect(sadPreset[VRMHumanBoneName.RightShoulder].z).toBeGreaterThan(0);
  });
});

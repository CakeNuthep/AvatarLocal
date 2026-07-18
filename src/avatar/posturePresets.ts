import { VRMHumanBoneName } from '@pixiv/three-vrm';

export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

export interface PosturePreset {
  [boneName: string]: BoneRotation;
}

/**
 * Procedural bone rotation target angles (in radians) for each emotion.
 * Maps bones (Spine, Neck, Head, LeftShoulder, RightShoulder) to target Euler orientations.
 */
export const POSTURE_PRESETS: Record<string, PosturePreset> = {
  neutral: {
    [VRMHumanBoneName.Spine]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.Neck]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.Head]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.LeftShoulder]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.RightShoulder]: { x: 0, y: 0, z: 0 },
  },
  happy: {
    [VRMHumanBoneName.Spine]: { x: -0.03, y: 0, z: 0 },         // Leaning back slightly
    [VRMHumanBoneName.Neck]: { x: -0.05, y: 0, z: 0 },          // Head tilted up
    [VRMHumanBoneName.Head]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.LeftShoulder]: { x: 0, y: 0, z: 0.05 },   // Relaxed down
    [VRMHumanBoneName.RightShoulder]: { x: 0, y: 0, z: -0.05 },
  },
  sad: {
    [VRMHumanBoneName.Spine]: { x: 0.08, y: 0, z: 0 },          // Slumped forward
    [VRMHumanBoneName.Neck]: { x: 0.12, y: 0, z: 0 },           // Head down
    [VRMHumanBoneName.Head]: { x: 0.05, y: 0, z: 0 },
    [VRMHumanBoneName.LeftShoulder]: { x: 0.05, y: 0, z: -0.15 }, // Shoulders slumped down & forward
    [VRMHumanBoneName.RightShoulder]: { x: 0.05, y: 0, z: 0.15 },
  },
  angry: {
    [VRMHumanBoneName.Spine]: { x: 0.05, y: 0, z: 0 },          // Tensed forward
    [VRMHumanBoneName.Neck]: { x: 0.05, y: 0, z: 0 },           // Staring forward
    [VRMHumanBoneName.Head]: { x: -0.05, y: 0, z: 0 },
    [VRMHumanBoneName.LeftShoulder]: { x: -0.05, y: 0, z: 0.12 }, // Shoulders raised/tense
    [VRMHumanBoneName.RightShoulder]: { x: -0.05, y: 0, z: -0.12 },
  },
  surprised: {
    [VRMHumanBoneName.Spine]: { x: -0.05, y: 0, z: 0 },         // Jerked backward
    [VRMHumanBoneName.Neck]: { x: -0.08, y: 0, z: 0 },          // Head tilted back
    [VRMHumanBoneName.Head]: { x: 0, y: 0, z: 0 },
    [VRMHumanBoneName.LeftShoulder]: { x: 0, y: 0, z: 0.05 },
    [VRMHumanBoneName.RightShoulder]: { x: 0, y: 0, z: -0.05 },
  },
};

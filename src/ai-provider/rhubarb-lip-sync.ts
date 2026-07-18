export interface RhubarbMouthCue {
  start: number;
  end: number;
  value: string; // "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X"
}

export interface RhubarbOutput {
  metadata: {
    soundFile: string;
    duration: number;
  };
  mouthCues: RhubarbMouthCue[];
}

export interface VisemeExpression {
  aa: number;
  ee: number;
  ih: number;
  oh: number;
  ou: number;
}

/**
 * Standard mapping mapping Rhubarb's mouth cue characters to 
 * standard VRM expression parameters (vowel shapes).
 */
export const RHUBARB_VISEME_MAP: Record<string, VisemeExpression> = {
  A: { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 },
  B: { aa: 0.15, ee: 0, ih: 0.15, oh: 0, ou: 0 },
  C: { aa: 0.7, ee: 0, ih: 0, oh: 0, ou: 0 },
  D: { aa: 0.95, ee: 0, ih: 0, oh: 0, ou: 0 },
  E: { aa: 0, ee: 0.7, ih: 0.2, oh: 0, ou: 0 },
  F: { aa: 0, ee: 0.2, ih: 0.6, oh: 0, ou: 0 },
  G: { aa: 0, ee: 0, ih: 0, oh: 0.2, ou: 0.8 },
  H: { aa: 0.4, ee: 0, ih: 0.3, oh: 0, ou: 0 },
  X: { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 },
};

/**
 * Resolves the active mouth cue for a given elapsed time offset (in seconds).
 * 
 * @param cues Sorted list of non-overlapping mouth cues
 * @param time Elapsed time offset
 * @returns Mapped active mouth cue or null
 */
export function getActiveMouthCue(cues: RhubarbMouthCue[], time: number): RhubarbMouthCue | null {
  if (!cues || cues.length === 0) return null;

  const activeCue = cues.find((cue) => time >= cue.start && time <= cue.end);
  if (activeCue) return activeCue;

  // Fallback clamping
  if (time < cues[0].start) return cues[0];
  if (time > cues[cues.length - 1].end) return cues[cues.length - 1];

  return null;
}

/**
 * Resolves standard VRM mouth blendshape weights at a given playback offset.
 * 
 * @param cues List of mouth cues
 * @param time Elapsed time offset
 * @returns Clamped VisemeExpression weights
 */
export function getVisemeWeightsAtTime(cues: RhubarbMouthCue[], time: number): VisemeExpression {
  const cue = getActiveMouthCue(cues, time);
  if (!cue) {
    return { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 };
  }
  return RHUBARB_VISEME_MAP[cue.value] || RHUBARB_VISEME_MAP.X;
}

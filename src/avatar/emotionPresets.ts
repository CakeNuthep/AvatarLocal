export interface EmotionPreset {
  [expressionName: string]: number;
}

export const EMOTION_PRESETS: Record<string, EmotionPreset> = {
  happy: {
    happy: 0.8,
    relaxed: 0.2,
    sad: 0.0,
    angry: 0.0,
    surprised: 0.0,
  },
  sad: {
    sad: 0.8,
    happy: 0.0,
    relaxed: 0.0,
    angry: 0.0,
    surprised: 0.0,
  },
  angry: {
    angry: 0.8,
    happy: 0.0,
    relaxed: 0.0,
    sad: 0.0,
    surprised: 0.0,
  },
  surprised: {
    surprised: 0.8,
    happy: 0.0,
    relaxed: 0.0,
    sad: 0.0,
    angry: 0.0,
  },
  neutral: {
    happy: 0.0,
    relaxed: 0.0,
    sad: 0.0,
    angry: 0.0,
    surprised: 0.0,
  },
};

/**
 * Transitions the avatar's face blendshapes smoothly towards the target emotion preset.
 * Handles fallbacks to older VRM 0.x expression naming (joy/sorrow).
 */
export function applyEmotion(
  controller: { lerpTo: (name: string, weight: number, duration: number) => void },
  emotionLabel: string,
  duration = 0.5
) {
  const emotion = emotionLabel.toLowerCase();
  const preset = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.neutral;

  for (const [name, weight] of Object.entries(preset)) {
    controller.lerpTo(name, weight, duration);

    // Fallbacks for older VRM 0.x models
    if (name === 'happy') {
      controller.lerpTo('joy', weight, duration);
    } else if (name === 'sad') {
      controller.lerpTo('sorrow', weight, duration);
    }
  }
}

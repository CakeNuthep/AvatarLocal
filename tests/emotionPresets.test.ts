import { describe, expect, test, vi } from 'vitest';
import { applyEmotion, EMOTION_PRESETS } from '../src/avatar/emotionPresets';

describe('Emotion Presets', () => {
  test('defines expected presets for all emotions', () => {
    expect(EMOTION_PRESETS.happy).toBeDefined();
    expect(EMOTION_PRESETS.sad).toBeDefined();
    expect(EMOTION_PRESETS.angry).toBeDefined();
    expect(EMOTION_PRESETS.surprised).toBeDefined();
    expect(EMOTION_PRESETS.neutral).toBeDefined();
  });

  test('applyEmotion maps known labels and calls lerpTo with core preset and fallback names', () => {
    const mockController = {
      lerpTo: vi.fn(),
    };

    applyEmotion(mockController, 'happy', 0.4);

    // Verify happy and relaxed are targeted
    expect(mockController.lerpTo).toHaveBeenCalledWith('happy', 0.8, 0.4);
    expect(mockController.lerpTo).toHaveBeenCalledWith('relaxed', 0.2, 0.4);

    // Verify fallback 'joy' name is also triggered for VRM 0.x models
    expect(mockController.lerpTo).toHaveBeenCalledWith('joy', 0.8, 0.4);
  });

  test('applyEmotion falls back to neutral for unrecognized labels', () => {
    const mockController = {
      lerpTo: vi.fn(),
    };

    applyEmotion(mockController, 'unsupported_crazy_emotion', 0.5);

    // Verify everything is set to 0.0 (neutral preset)
    expect(mockController.lerpTo).toHaveBeenCalledWith('happy', 0.0, 0.5);
    expect(mockController.lerpTo).toHaveBeenCalledWith('sad', 0.0, 0.5);
    expect(mockController.lerpTo).toHaveBeenCalledWith('angry', 0.0, 0.5);
    expect(mockController.lerpTo).toHaveBeenCalledWith('surprised', 0.0, 0.5);
    
    // Verify VRM 0.x fallbacks are also cleared
    expect(mockController.lerpTo).toHaveBeenCalledWith('joy', 0.0, 0.5);
    expect(mockController.lerpTo).toHaveBeenCalledWith('sorrow', 0.0, 0.5);
  });
});

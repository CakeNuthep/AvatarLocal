import { describe, expect, test, vi, beforeEach } from 'vitest';
import { classifyTextEmotion, mapClassifierLabelToEmotion } from '../src/ai-provider/emotion-classifier';

// Mock the transformers pipeline function
vi.mock('@xenova/transformers', () => {
  const mockClassifier = vi.fn().mockImplementation(async (text: string) => {
    if (text.includes('angry')) {
      return [{ label: 'anger', score: 0.95 }];
    }
    if (text.includes('sad')) {
      return [{ label: 'sadness', score: 0.88 }];
    }
    if (text.includes('happy')) {
      return [{ label: 'joy', score: 0.99 }];
    }
    if (text.includes('surprised')) {
      return [{ label: 'surprise', score: 0.91 }];
    }
    return [{ label: 'neutral', score: 0.50 }];
  });

  return {
    pipeline: vi.fn().mockResolvedValue(mockClassifier),
  };
});

describe('Emotion Classifier Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('maps DistilBERT labels to core emotions correctly', () => {
    expect(mapClassifierLabelToEmotion('joy')).toBe('happy');
    expect(mapClassifierLabelToEmotion('love')).toBe('happy');
    expect(mapClassifierLabelToEmotion('sadness')).toBe('sad');
    expect(mapClassifierLabelToEmotion('fear')).toBe('sad');
    expect(mapClassifierLabelToEmotion('anger')).toBe('angry');
    expect(mapClassifierLabelToEmotion('surprise')).toBe('surprised');
    expect(mapClassifierLabelToEmotion('unknown_value')).toBe('neutral');
  });

  test('classifies happy text correctly', async () => {
    const res = await classifyTextEmotion('I am so happy today!');
    expect(res).not.toBeNull();
    expect(res?.label).toBe('happy');
    expect(res?.score).toBe(0.99);
  });

  test('classifies sad text correctly', async () => {
    const res = await classifyTextEmotion('I feel very sad and lonely.');
    expect(res).not.toBeNull();
    expect(res?.label).toBe('sad');
    expect(res?.score).toBe(0.88);
  });

  test('classifies angry text correctly', async () => {
    const res = await classifyTextEmotion('I am so angry with this project!');
    expect(res).not.toBeNull();
    expect(res?.label).toBe('angry');
    expect(res?.score).toBe(0.95);
  });

  test('returns null for empty or whitespace text', async () => {
    const resEmpty = await classifyTextEmotion('');
    const resSpaces = await classifyTextEmotion('   ');
    expect(resEmpty).toBeNull();
    expect(resSpaces).toBeNull();
  });
});

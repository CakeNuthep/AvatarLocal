import { pipeline, env } from '@xenova/transformers';

// Disable local model checks to avoid fetching from local dev server paths
// which fall back to index.html (causing JSON parse errors on '<!doctype html>')
env.allowLocalModels = false;

let classifierPromise: any = null;

/**
 * Gets or initializes the singleton text-classification pipeline.
 */
export const getEmotionClassifier = () => {
  if (!classifierPromise) {
    classifierPromise = pipeline('text-classification', 'Xenova/distilbert-base-uncased-emotion');
  }
  return classifierPromise;
};

/**
 * Maps the DistilBERT emotion labels to our core VRM expressions.
 */
export const mapClassifierLabelToEmotion = (label: string): string => {
  switch (label.toLowerCase()) {
    case 'joy':
    case 'love':
      return 'happy';
    case 'sadness':
    case 'fear':
      return 'sad';
    case 'anger':
      return 'angry';
    case 'surprise':
      return 'surprised';
    default:
      return 'neutral';
  }
};

/**
 * Run sentiment/emotion analysis on a text string.
 * Returns the mapped emotion label and the confidence score.
 */
export const classifyTextEmotion = async (
  text: string
): Promise<{ label: string; score: number } | null> => {
  if (!text || !text.trim()) return null;

  try {
    const classifier = await getEmotionClassifier();
    const results = await classifier(text);
    if (results && results.length > 0) {
      const best = results[0];
      return {
        label: mapClassifierLabelToEmotion(best.label),
        score: best.score,
      };
    }
  } catch (err) {
    console.error('Failed to classify text emotion:', err);
  }
  return null;
};

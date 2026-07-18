import { describe, it, expect, vi } from 'vitest';
import { EmotionStreamParser } from '../src/ai-provider/stream-parser';

describe('EmotionStreamParser', () => {
  it('should parse simple sentences and emotions', () => {
    const onSentence = vi.fn();
    const parser = new EmotionStreamParser(onSentence);

    parser.ingest('[happy] Hello world! ');
    expect(onSentence).toHaveBeenCalledWith('Hello world!', 'happy');
  });

  it('should support sentence splitting on EN and TH terminators', () => {
    const onSentence = vi.fn();
    const parser = new EmotionStreamParser(onSentence);

    parser.ingest('[sad] How are you? [angry] ยินดีต้อนรับ。 ');
    
    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenNthCalledWith(1, 'How are you?', 'sad');
    expect(onSentence).toHaveBeenNthCalledWith(2, 'ยินดีต้อนรับ。', 'angry');
  });

  it('should buffer incomplete sentences and flush them on demand', () => {
    const onSentence = vi.fn();
    const parser = new EmotionStreamParser(onSentence);

    parser.ingest('[surprised] Wow, this is co');
    expect(onSentence).not.toHaveBeenCalled();

    parser.ingest('ol! ');
    expect(onSentence).toHaveBeenCalledWith('Wow, this is cool!', 'surprised');

    parser.ingest('No ending tag');
    expect(onSentence).toHaveBeenCalledTimes(1); // Still 1 because no terminator

    parser.flush();
    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenNthCalledWith(2, 'No ending tag', 'surprised'); // Inherits last emotion
  });

  it('should inherit previous emotion tag when a sentence lacks one', () => {
    const onSentence = vi.fn();
    const parser = new EmotionStreamParser(onSentence);

    parser.ingest('[sad] I am down. [neutral] Oh, wait. Let us go! ');
    expect(onSentence).toHaveBeenCalledTimes(3);
    expect(onSentence).toHaveBeenNthCalledWith(1, 'I am down.', 'sad');
    expect(onSentence).toHaveBeenNthCalledWith(2, 'Oh, wait.', 'neutral');
    expect(onSentence).toHaveBeenNthCalledWith(3, 'Let us go!', 'neutral'); // Inherits neutral
  });

  it('should ignore unrecognized tags and treat them as text', () => {
    const onSentence = vi.fn();
    const parser = new EmotionStreamParser(onSentence);

    parser.ingest('[crazy] Hello there! ');
    expect(onSentence).toHaveBeenCalledWith('[crazy] Hello there!', 'neutral'); // default emotion is neutral
  });
});

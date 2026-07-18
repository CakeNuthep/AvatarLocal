/**
 * Stateful stream parser that buffers incoming LLM tokens, identifies complete sentences,
 * extracts leading emotion tags (e.g. '[happy]'), and emits clean text + emotion pairs.
 */
export class EmotionStreamParser {
  private buffer = '';
  private lastEmotion = 'neutral';
  private onSentence: (text: string, emotion: string) => void;

  constructor(onSentence: (text: string, emotion: string) => void) {
    this.onSentence = onSentence;
  }

  /**
   * Appends incoming text chunk to the buffer and processes any completed sentences.
   * 
   * @param chunk String text fragment
   */
  ingest(chunk: string): void {
    this.buffer += chunk;
    this.process();
  }

  /**
   * Flushes any remaining content in the buffer at the end of the stream.
   */
  flush(): void {
    if (this.buffer.trim()) {
      this.emit(this.buffer);
      this.buffer = '';
    }
  }

  /**
   * Scans the buffer for sentence terminators and extracts complete sentences.
   */
  private process(): void {
    // Look for sentence terminators: . ! ? (EN) or 。 ！ ？ (TH/ZH) or newlines/pipes
    const terminators = /[.!?。！？\n\r|]/;

    while (true) {
      const match = this.buffer.match(terminators);
      if (!match) break;

      const index = match.index!;
      const sentence = this.buffer.substring(0, index + 1);
      this.buffer = this.buffer.substring(index + 1);

      this.emit(sentence);
    }
  }

  /**
   * Parses emotion tags from a sentence, cleans the text, and triggers the callback.
   */
  private emit(sentence: string): void {
    let clean = sentence.trim();
    if (!clean) return;

    // Check for leading tag: e.g. [happy]
    const tagMatch = clean.match(/^\[([a-zA-Z]+)\]/);
    let emotion = this.lastEmotion;

    if (tagMatch) {
      const parsedTag = tagMatch[1].toLowerCase();
      const knownEmotions = ['happy', 'sad', 'angry', 'surprised', 'neutral'];
      if (knownEmotions.includes(parsedTag)) {
        emotion = parsedTag;
        this.lastEmotion = parsedTag;
        // Strip the tag and any leading whitespace
        clean = clean.substring(tagMatch[0].length).trim();
      }
    }

    console.log(`[DEBUG Parser] Sentence: "${clean}" | Resolved Emotion: "${emotion}"`);

    if (clean) {
      this.onSentence(clean, emotion);
    }
  }
}

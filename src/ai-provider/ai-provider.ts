export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Abstract interface for an AI Language Model provider.
 */
export abstract class AIProvider {
  /**
   * Performs a non-streaming chat request.
   * 
   * @param messages Complete message history
   * @param language The target response language (e.g. 'en', 'th')
   * @returns The assistant's text response
   */
  abstract chat(messages: ChatMessage[], language: string): Promise<string>;

  /**
   * Performs a streaming chat request.
   * 
   * @param messages Complete message history
   * @param language The target response language (e.g. 'en', 'th')
   * @param onToken Callback triggered on each text token received
   * @returns The assistant's full text response once complete
   */
  abstract chatStream(
    messages: ChatMessage[],
    language: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<string>;
}

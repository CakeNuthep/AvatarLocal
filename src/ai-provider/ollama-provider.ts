import { AIProvider, type ChatMessage } from './ai-provider';

export interface OllamaProviderOptions {
  apiUrl?: string;
  model?: string;
}

/**
 * Concrete implementation of AIProvider calling local Ollama service via Vite proxy.
 */
export class OllamaProvider extends AIProvider {
  private apiUrl: string;
  private model: string;

  constructor(options: OllamaProviderOptions = {}) {
    super();
    this.apiUrl = options.apiUrl || '/api/ollama/api/chat';
    this.model = options.model || 'qwen3.5:latest';
  }

  /**
   * Generates the custom system instruction instructing the model to reply in the 
   * selected language and prepend every sentence with a valid emotion tag.
   */
  private getSystemPrompt(language: string): string {
    const isThai = language.toLowerCase() === 'th';
    const langText = isThai ? 'Thai' : 'English';
    const exampleText = isThai
      ? `<think>\nผู้ใช้ทักทายฉัน ควรตอบกลับด้วยความยินดีและสุภาพ เลือกอารมณ์ [happy]\n</think>\n[happy] ยินดีที่ได้พบคุณครับ! [neutral] วันนี้มีอะไรให้ผมช่วยไหมครับ?`
      : `<think>\nThe user is saying hello. I should reply warmly in English and ask how I can assist them. Choosing [happy].\n</think>\n[happy] It is wonderful to meet you! [neutral] How can I assist you today?`;

    return `You are a friendly, expressive, and conversational AI avatar.
You must respond in ${langText}.

For every response, you MUST follow these two steps in order:
1. Write your internal thinking process wrapped in <think>...</think> tags. Outline your reasoning, plan the response, and choose which emotions match your reply.
2. Write your actual speech response. You MUST prefix EVERY single sentence or complete thought in your response with exactly one of these five emotion tags matching your current feeling: [happy], [sad], [angry], [surprised], or [neutral]. Ensure that there is no text without an emotion tag prefix.

Example response:
${exampleText}`;
  }

  /**
   * Builds the messages array by injecting or modifying the system instruction.
   */
  private buildPayloadMessages(messages: ChatMessage[], language: string): ChatMessage[] {
    const systemPrompt = this.getSystemPrompt(language);
    const result: ChatMessage[] = [];

    // Inject system prompt first
    result.push({ role: 'system', content: systemPrompt });

    // Copy user and assistant messages (skipping any existing system prompt to avoid conflict)
    messages.forEach((msg) => {
      if (msg.role !== 'system') {
        result.push(msg);
      }
    });

    return result;
  }

  /**
   * Performs a non-streaming chat request.
   */
  async chat(messages: ChatMessage[], language: string): Promise<string> {
    const payload = {
      model: this.model,
      messages: this.buildPayloadMessages(messages, language),
      stream: false,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.message || typeof data.message.content !== 'string') {
      throw new Error('Malformed response from Ollama API');
    }

    return data.message.content;
  }

  /**
   * Performs a streaming chat request.
   */
  async chatStream(
    messages: ChatMessage[],
    language: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const payload = {
      model: this.model,
      messages: this.buildPayloadMessages(messages, language),
      stream: true,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama stream chat request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get reader from response body for streaming');
    }

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const data = JSON.parse(trimmed);
            const token = data.message?.content || '';
            if (token) {
              fullText += token;
              onToken(token);
            }
          } catch (e) {
            // Ignore partial or malformed lines in stream
          }
        }
      }

      // Process any remaining text in the buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim());
          const token = data.message?.content || '';
          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch (e) {
          // Ignore
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }
}

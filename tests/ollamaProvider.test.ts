import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../src/ai-provider/ollama-provider';
import type { ChatMessage } from '../src/ai-provider/ai-provider';

describe('OllamaProvider', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello!' }
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should format payload correctly and fetch standard chat', async () => {
    const mockResponse = {
      message: {
        role: 'assistant',
        content: '[happy] Hello! How can I assist you?'
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const provider = new OllamaProvider();
    const result = await provider.chat(messages, 'en');

    expect(global.fetch).toHaveBeenCalledWith('/api/ollama/api/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(fetchBody.model).toBe('qwen3.5:latest');
    expect(fetchBody.messages[0].role).toBe('system');
    expect(fetchBody.messages[0].content).toContain('English');
    expect(fetchBody.messages[1]).toEqual(messages[0]);
    expect(result).toBe('[happy] Hello! How can I assist you?');
  });

  it('should request Thai system prompt when th is selected', async () => {
    const mockResponse = {
      message: {
        role: 'assistant',
        content: '[happy] สวัสดีครับ'
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const provider = new OllamaProvider();
    await provider.chat(messages, 'th');

    const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(fetchBody.messages[0].content).toContain('Thai');
  });

  it('should stream tokens correctly in chatStream', async () => {
    const streamChunks = [
      JSON.stringify({ message: { content: '[happy] Hi' } }) + '\n',
      JSON.stringify({ message: { content: ' there!' } }) + '\n'
    ];

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamChunks[0]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamChunks[1]) })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn()
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    const tokens: string[] = [];
    const provider = new OllamaProvider();
    const result = await provider.chatStream(messages, 'en', (token) => {
      tokens.push(token);
    });

    expect(result).toBe('[happy] Hi there!');
    expect(tokens).toEqual(['[happy] Hi', ' there!']);
  });
});

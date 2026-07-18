import { describe, it, expect } from 'vitest';
import {
  conversationReducer,
  addUserMessage,
  addAssistantMessage,
  setStatus,
  setError,
  clearHistory,
  selectTrimmedMessages
} from '../src/store/conversationSlice';

describe('conversationSlice', () => {
  it('should return the initial state', () => {
    expect(conversationReducer(undefined, { type: 'unknown' })).toEqual({
      messages: [],
      status: 'idle',
      error: null
    });
  });

  it('should handle addUserMessage', () => {
    const previousState = { messages: [], status: 'idle', error: 'some error' as any };
    expect(conversationReducer(previousState, addUserMessage('hello'))).toEqual({
      messages: [{ role: 'user', content: 'hello' }],
      status: 'idle',
      error: null // should clear error
    });
  });

  it('should handle addAssistantMessage', () => {
    const previousState = { messages: [], status: 'idle', error: null };
    expect(conversationReducer(previousState, addAssistantMessage('hello user'))).toEqual({
      messages: [{ role: 'assistant', content: 'hello user' }],
      status: 'idle',
      error: null
    });
  });

  it('should handle setStatus and setError', () => {
    let state = conversationReducer(undefined, setStatus('loading'));
    expect(state.status).toBe('loading');

    state = conversationReducer(state, setError('An error occurred'));
    expect(state.error).toBe('An error occurred');
  });

  it('should handle clearHistory', () => {
    const previousState = {
      messages: [{ role: 'user', content: 'hi' }],
      status: 'speaking' as any,
      error: 'error'
    };
    expect(conversationReducer(previousState, clearHistory())).toEqual({
      messages: [],
      status: 'idle',
      error: null
    });
  });

  it('should trim messages selector to keep system messages + last 10 non-system messages', () => {
    const mockMessages = [
      { role: 'system', content: 'You are system' },
      { role: 'user', content: '1' },
      { role: 'assistant', content: '2' },
      { role: 'user', content: '3' },
      { role: 'assistant', content: '4' },
      { role: 'user', content: '5' },
      { role: 'assistant', content: '6' },
      { role: 'user', content: '7' },
      { role: 'assistant', content: '8' },
      { role: 'user', content: '9' },
      { role: 'assistant', content: '10' },
      { role: 'user', content: '11' },
      { role: 'assistant', content: '12' }
    ];

    const result = selectTrimmedMessages.resultFunc(mockMessages);

    // Should keep 1 system message + 10 latest non-system messages
    expect(result).toHaveLength(11);
    expect(result[0]).toEqual({ role: 'system', content: 'You are system' });
    expect(result[1]).toEqual({ role: 'user', content: '3' });
    expect(result[result.length - 1]).toEqual({ role: 'assistant', content: '12' });
  });
});

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { OllamaProvider } from '../ai-provider/ollama-provider';
import { EmotionStreamParser } from '../ai-provider/stream-parser';
import { AudioQueueScheduler } from '../ai-provider/audio-queue-scheduler';
import { PiperTTSProvider } from '../ai-provider/piper-tts-provider';
import { CoquiTTSProvider } from '../ai-provider/coqui-tts-provider';
import { setPipelineStatus, setCurrentEmotion } from './avatarSlice';
import { classifyTextEmotion } from '../ai-provider/emotion-classifier';
import type { ChatMessage } from '../ai-provider/ai-provider';

export interface ConversationState {
  messages: ChatMessage[];
  status: 'idle' | 'loading' | 'speaking' | 'error';
  error: string | null;
}

const initialState: ConversationState = {
  messages: [],
  status: 'idle',
  error: null,
};

let globalScheduler: AudioQueueScheduler | null = null;
let activeAbortController: AbortController | null = null;

/**
 * Gets or creates the global AudioQueueScheduler instance.
 */
export const getScheduler = (dispatch: any, audioContext: AudioContext) => {
  if (!globalScheduler) {
    const ttsProvider = new PiperTTSProvider();
    globalScheduler = new AudioQueueScheduler(ttsProvider, audioContext, {
      onSpeakingStart: () => {
        dispatch(setPipelineStatus('speaking'));
        dispatch(conversationSlice.actions.setStatus('speaking'));
      },
      onSpeakingEnd: () => {
        dispatch(setPipelineStatus('idle'));
        dispatch(conversationSlice.actions.setStatus('idle'));
      },
      onSentenceStart: (text, emotion) => {
        if (emotion) {
          dispatch(setCurrentEmotion(emotion));
        }
      },
    });
  }
  return globalScheduler;
};

/**
 * Thunk to orchestrate: User Input -> LLM -> Streaming Parser -> AudioQueueScheduler
 */
export const sendUserMessage = createAsyncThunk<
  string,
  { text: string; audioContext: AudioContext },
  { state: any }
>('conversation/sendUserMessage', async ({ text, audioContext }, thunkAPI) => {
  const dispatch = thunkAPI.dispatch;
  const state = thunkAPI.getState();
  const language = state.ui.uiLanguage;

  // Track start of conversation turn for latency profiling
  const turnStartTime = performance.now();

  // 1. Get scheduler and stop any active speech/synthesis
  const scheduler = getScheduler(dispatch, audioContext);
  const ttsEngine = state.ui.ttsEngine || 'piper';
  const ttsProvider = ttsEngine === 'coqui' ? new CoquiTTSProvider() : new PiperTTSProvider();
  scheduler.setTTSProvider(ttsProvider);
  
  scheduler.stop();
  scheduler.setTurnStartTime(turnStartTime);

  // Abort any active LLM stream fetch request
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  // Add user message to conversation history
  dispatch(conversationSlice.actions.addUserMessage(text));
  dispatch(conversationSlice.actions.setStatus('loading'));
  dispatch(setPipelineStatus('thinking'));

  // Classify user message emotion in background and update avatar immediately if confident (> 0.5) and different
  classifyTextEmotion(text).then((detection) => {
    const currentState = thunkAPI.getState();
    const currentEmotion = currentState.avatar.currentEmotion;
    if (detection && detection.score > 0.5 && detection.label !== currentEmotion) {
      dispatch(setCurrentEmotion(detection.label));
    }
  }).catch((err) => console.error('Emotion classification error:', err));

  try {
    // 2. Fetch the trimmed message history
    const trimmedMessages = selectTrimmedMessages(thunkAPI.getState());
    console.log('[DEBUG LLM Input] Payload sent to Ollama:', trimmedMessages);

    const aiProvider = new OllamaProvider();
    let responseText = '';
    let firstTokenReceived = false;

    // Initialize stateful parser that splits sentences and extracts emotion tags
    const streamParser = new EmotionStreamParser((sentence, emotion) => {
      scheduler.enqueueSentence(sentence, emotion, language);
    });

    // 3. Stream from Ollama
    await aiProvider.chatStream(trimmedMessages, language, (token) => {
      if (!firstTokenReceived) {
        firstTokenReceived = true;
        const ttft = performance.now() - turnStartTime;
        console.log(`[LATENCY PROFILE] LLM Time-To-First-Token (TTFT): ${ttft.toFixed(0)}ms`);
      }
      responseText += token;
      console.log('[DEBUG LLM Token] Received token:', token);
      streamParser.ingest(token);
    }, signal);

    const llmDuration = performance.now() - turnStartTime;
    console.log(`[LATENCY PROFILE] LLM total response generation time: ${llmDuration.toFixed(0)}ms`);

    // Flush any remaining tokens left in the stream buffer
    streamParser.flush();

    // Add assistant response to history
    dispatch(conversationSlice.actions.addAssistantMessage(responseText));
    
    // Status stays as 'speaking' if scheduler is speaking, otherwise 'idle'
    // This is handled by scheduler callbacks, but if stream ends and nothing was enqueued:
    // (e.g. empty response), set to idle
    const currentStatus = (thunkAPI.getState() as any).conversation.status;
    if (currentStatus === 'loading') {
      dispatch(conversationSlice.actions.setStatus('idle'));
      dispatch(setPipelineStatus('idle'));
    }

    return responseText;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[DEBUG LLM Request] LLM stream request aborted.');
      return '';
    }
    dispatch(conversationSlice.actions.setStatus('error'));
    dispatch(conversationSlice.actions.setError(error.message || 'An error occurred'));
    dispatch(setPipelineStatus('idle'));
    throw error;
  }
});

export const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    addUserMessage(state, action: PayloadAction<string>) {
      state.messages.push({ role: 'user', content: action.payload });
      state.error = null;
    },
    addAssistantMessage(state, action: PayloadAction<string>) {
      state.messages.push({ role: 'assistant', content: action.payload });
    },
    setStatus(state, action: PayloadAction<'idle' | 'loading' | 'speaking' | 'error'>) {
      state.status = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearHistory(state) {
      state.messages = [];
      state.status = 'idle';
      state.error = null;
      if (globalScheduler) {
        globalScheduler.stop();
      }
    },
  },
});

export const { addUserMessage, addAssistantMessage, setStatus, setError, clearHistory } = conversationSlice.actions;

export const conversationReducer = conversationSlice.reducer;

// Selectors
const selectConversation = (state: any) => state.conversation;

export const selectMessages = createSelector(
  [selectConversation],
  (conversation) => conversation.messages
);

export const selectConversationStatus = createSelector(
  [selectConversation],
  (conversation) => conversation.status
);

export const selectConversationError = createSelector(
  [selectConversation],
  (conversation) => conversation.error
);

/**
 * Message-trimming selector that keeps system prompts + last 10 messages (5 turns)
 */
export const selectTrimmedMessages = createSelector(
  [selectMessages],
  (messages) => {
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');
    const lastN = nonSystemMsgs.slice(-10);
    return [...systemMsgs, ...lastN];
  }
);

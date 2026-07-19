import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { avatarReducer } from './avatarSlice'
import { conversationReducer } from './conversationSlice'

interface UIState {
  uiLanguage: string
  theme: 'dark' | 'light'
  showThinking: boolean
  ttsEngine: 'piper' | 'coqui'
}

const initialState: UIState = {
  uiLanguage: 'en',
  theme: 'dark',
  showThinking: false,
  ttsEngine: 'piper',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setUILanguage(state, action: PayloadAction<string>) {
      state.uiLanguage = action.payload
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    toggleShowThinking(state) {
      state.showThinking = !state.showThinking
    },
    setTTSEngine(state, action: PayloadAction<'piper' | 'coqui'>) {
      state.ttsEngine = action.payload
    },
  },
})

export const { setUILanguage, toggleTheme, toggleShowThinking, setTTSEngine } = uiSlice.actions
export * from './avatarSlice'
export * from './conversationSlice'

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    avatar: avatarReducer,
    conversation: conversationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

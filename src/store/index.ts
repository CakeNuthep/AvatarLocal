import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { avatarReducer } from './avatarSlice'
import { conversationReducer } from './conversationSlice'

interface UIState {
  uiLanguage: string
  theme: 'dark' | 'light'
  showThinking: boolean
}

const initialState: UIState = {
  uiLanguage: 'en',
  theme: 'dark',
  showThinking: false,
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
  },
})

export const { setUILanguage, toggleTheme, toggleShowThinking } = uiSlice.actions
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

import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { avatarReducer } from './avatarSlice'

interface UIState {
  uiLanguage: string
  theme: 'dark' | 'light'
}

const initialState: UIState = {
  uiLanguage: 'en',
  theme: 'dark',
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
  },
})

export const { setUILanguage, toggleTheme } = uiSlice.actions
export * from './avatarSlice'

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    avatar: avatarReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

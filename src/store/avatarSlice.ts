import { createSlice, type PayloadAction, createSelector } from '@reduxjs/toolkit'

export interface AvatarState {
  currentEmotion: string
  pipelineStatus: 'idle' | 'thinking' | 'speaking'
  mouthOpen: number
}

const initialState: AvatarState = {
  currentEmotion: 'neutral',
  pipelineStatus: 'idle',
  mouthOpen: 0,
}

const avatarSlice = createSlice({
  name: 'avatar',
  initialState,
  reducers: {
    setCurrentEmotion(state, action: PayloadAction<string>) {
      state.currentEmotion = action.payload
    },
    setPipelineStatus(state, action: PayloadAction<'idle' | 'thinking' | 'speaking'>) {
      state.pipelineStatus = action.payload
    },
    setMouthOpen(state, action: PayloadAction<number>) {
      // Clamp high-frequency lip sync weights to a safe [0, 1] range
      state.mouthOpen = Math.max(0, Math.min(1, action.payload))
    },
  },
})

export const { setCurrentEmotion, setPipelineStatus, setMouthOpen } = avatarSlice.actions

export const avatarReducer = avatarSlice.reducer

// Selectors
interface StateWithAvatar {
  avatar: AvatarState
}

const selectAvatarState = (state: StateWithAvatar) => state.avatar

export const selectCurrentEmotion = createSelector(
  [selectAvatarState],
  (avatar) => avatar.currentEmotion
)

export const selectPipelineStatus = createSelector(
  [selectAvatarState],
  (avatar) => avatar.pipelineStatus
)

export const selectMouthOpen = createSelector(
  [selectAvatarState],
  (avatar) => avatar.mouthOpen
)

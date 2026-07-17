import { describe, expect, test } from 'vitest'
import {
  avatarReducer,
  setCurrentEmotion,
  setPipelineStatus,
  setMouthOpen,
  selectCurrentEmotion,
  selectPipelineStatus,
  selectMouthOpen,
} from '../src/store/avatarSlice'

describe('avatarSlice Reducers and Selectors', () => {
  const initialState = {
    currentEmotion: 'neutral',
    pipelineStatus: 'idle' as const,
    mouthOpen: 0,
  }

  test('should return initial state when called with undefined action', () => {
    expect(avatarReducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  test('should set current emotion', () => {
    const state = avatarReducer(initialState, setCurrentEmotion('happy'))
    expect(state.currentEmotion).toBe('happy')
  })

  test('should set pipeline status', () => {
    const state = avatarReducer(initialState, setPipelineStatus('speaking'))
    expect(state.pipelineStatus).toBe('speaking')
  })

  test('should set mouth open coefficient and clamp between 0 and 1', () => {
    // Normal update
    let state = avatarReducer(initialState, setMouthOpen(0.6))
    expect(state.mouthOpen).toBe(0.6)

    // Clamp below 0
    state = avatarReducer(initialState, setMouthOpen(-0.2))
    expect(state.mouthOpen).toBe(0)

    // Clamp above 1
    state = avatarReducer(initialState, setMouthOpen(1.5))
    expect(state.mouthOpen).toBe(1)
  })

  test('selectors should return correct state values', () => {
    const rootState = {
      avatar: {
        currentEmotion: 'sad',
        pipelineStatus: 'thinking' as const,
        mouthOpen: 0.45,
      },
    }

    expect(selectCurrentEmotion(rootState)).toBe('sad')
    expect(selectPipelineStatus(rootState)).toBe('thinking')
    expect(selectMouthOpen(rootState)).toBe(0.45)
  })
})

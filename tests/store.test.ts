import { describe, expect, test } from 'vitest'
import { store, setUILanguage, toggleTheme, setCurrentEmotion, setMouthOpen } from '../src/store'

describe('Redux store test', () => {
  test('configures with expected initial state shape', () => {
    const state = store.getState()
    expect(state).toHaveProperty('ui')
    expect(state).toHaveProperty('avatar')
    expect(state.ui).toEqual({
      uiLanguage: 'en',
      theme: 'dark',
    })
    expect(state.avatar).toEqual({
      currentEmotion: 'neutral',
      pipelineStatus: 'idle',
      mouthOpen: 0,
    })
  })

  test('updates uiLanguage on setUILanguage action', () => {
    store.dispatch(setUILanguage('th'))
    expect(store.getState().ui.uiLanguage).toBe('th')
  })

  test('toggles theme on toggleTheme action', () => {
    store.dispatch(toggleTheme())
    expect(store.getState().ui.theme).toBe('light')
  })

  test('updates avatar state on avatar actions', () => {
    store.dispatch(setCurrentEmotion('happy'))
    expect(store.getState().avatar.currentEmotion).toBe('happy')

    store.dispatch(setMouthOpen(0.75))
    expect(store.getState().avatar.mouthOpen).toBe(0.75)
  })
})

import { describe, expect, test } from 'vitest'
import i18n from '../src/i18n'

describe('i18n locales test', () => {
  test('resolves translation keys in English', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('welcome')).toBe('Welcome to your AI Avatar')
    expect(i18n.t('change_language')).toBe('Change Language')
  })

  test('resolves translation keys in Thai', async () => {
    await i18n.changeLanguage('th')
    expect(i18n.t('welcome')).toBe('ยินดีต้อนรับสู่ AI Avatar ของคุณ')
    expect(i18n.t('change_language')).toBe('เปลี่ยนภาษา')
  })

  test('falls back correctly for a missing key', () => {
    expect(i18n.t('non_existent_key')).toBe('non_existent_key')
  })
})

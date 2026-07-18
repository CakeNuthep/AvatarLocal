import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { type RootState, setUILanguage } from '../store'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const dispatch = useDispatch()
  const currentLanguage = useSelector((state: RootState) => state.ui.uiLanguage)

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    dispatch(setUILanguage(lang))
  }

  return (
    <div className="language-switcher-container">
      <button
        onClick={() => handleLanguageChange('en')}
        className={`lang-btn ${currentLanguage === 'en' ? 'active' : ''}`}
        aria-label="Switch to English"
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => handleLanguageChange('th')}
        className={`lang-btn ${currentLanguage === 'th' ? 'active' : ''}`}
        aria-label="Switch to Thai"
      >
        🇹🇭 TH
      </button>
    </div>
  )
}

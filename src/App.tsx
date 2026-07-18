import { useTranslation } from 'react-i18next'
import AvatarCanvas from './avatar/AvatarCanvas'
import ChatUI from './ui/ChatUI'
import LanguageSwitcher from './ui/LanguageSwitcher'
import './App.css'

function App() {
  const { t } = useTranslation()

  const params = new URLSearchParams(window.location.search)
  const isStreamMode = params.get('mode') === 'stream'
  const chroma = params.get('chroma') || 'transparent'

  if (isStreamMode) {
    const chromaClass = chroma === 'green' ? 'chroma-green' : 'chroma-transparent'
    return (
      <div className={`app-container streamer-mode ${chromaClass}`}>
        <main className="app-main streamer-mode">
          <div className="avatar-section streamer-mode">
            <AvatarCanvas />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">{t('app_title', { defaultValue: 'AURA AI' })}</h1>
        <LanguageSwitcher />
      </header>
      <main className="app-main">
        <div className="avatar-section">
          <AvatarCanvas />
        </div>
        <div className="chat-section">
          <ChatUI />
        </div>
      </main>
    </div>
  )
}

export default App

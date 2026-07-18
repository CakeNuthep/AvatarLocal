import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { type RootState, setUILanguage } from './store'
import AvatarCanvas from './avatar/AvatarCanvas'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import { PiperTTSProvider } from './ai-provider/piper-tts-provider'
import { AudioQueueScheduler } from './ai-provider/audio-queue-scheduler'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const uiLanguage = useSelector((state: RootState) => state.ui.uiLanguage)

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    dispatch(setUILanguage(lang))
  }

  const handleTestTTS = async () => {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) {
      alert("Web Audio API is not supported in this browser")
      return
    }
    const audioCtx = new AudioCtx()
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }
    const ttsProvider = new PiperTTSProvider()
    const scheduler = new AudioQueueScheduler(ttsProvider, audioCtx)
    scheduler.enqueueText(
      "Hello! I am your AI avatar. Let's verify that the voice works and my lips move in sync with the audio.",
      "en"
    )
  }

  return (
    <>
      <section id="center">
        <div className="hero" style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
          <AvatarCanvas />
        </div>
        <div>
          <h1>{t('welcome')}</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
          <div style={{ margin: '15px 0' }}>
            <span style={{ marginRight: '10px' }}>{t('change_language')}:</span>
            <button
              onClick={() => handleLanguageChange('en')}
              style={{ fontWeight: uiLanguage === 'en' ? 'bold' : 'normal', marginRight: '5px' }}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange('th')}
              style={{ fontWeight: uiLanguage === 'th' ? 'bold' : 'normal' }}
            >
              TH
            </button>
          </div>
          <div style={{ margin: '15px 0' }}>
            <button
              onClick={handleTestTTS}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Test Voice & Lip-Sync
            </button>
          </div>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          {t('count_is', { count })}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App

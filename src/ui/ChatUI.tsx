import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  type AppDispatch,
  type RootState,
  sendUserMessage,
  clearHistory,
  selectMessages,
  selectConversationStatus,
  selectConversationError,
  toggleShowThinking,
} from '../store'

export default function ChatUI() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const messages = useSelector(selectMessages)
  const status = useSelector(selectConversationStatus)
  const error = useSelector(selectConversationError)
  const pipelineStatus = useSelector((state: RootState) => state.avatar.pipelineStatus)
  const currentEmotion = useSelector((state: RootState) => state.avatar.currentEmotion)
  const showThinking = useSelector((state: RootState) => state.ui.showThinking)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Auto-scroll messages to the bottom
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Get or resume audio context in response to user gesture
  const initAudioContext = async (): Promise<AudioContext> => {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput || status === 'loading') return

    setInput('')

    try {
      const audioContext = await initAudioContext()
      await dispatch(sendUserMessage({ text: trimmedInput, audioContext }))
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Helper to format/strip emotion tags and think blocks for display
  const parseMessageContent = (text: string, showThinking: boolean) => {
    let rawText = text
    let thinkingContent = ''
    
    // Extract <think>...</think> blocks if present
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
    const match = thinkRegex.exec(rawText)
    if (match) {
      thinkingContent = match[1].trim()
      rawText = rawText.replace(thinkRegex, '').trim()
    }

    if (!showThinking) {
      const cleanedText = rawText.replace(/\[(happy|sad|angry|surprised|neutral)\]/gi, '').trim()
      return { cleanedText, thinkingContent: '' }
    }

    return { cleanedText: rawText, thinkingContent }
  }

  // Highlight emotion tags inline with styled spans
  const highlightEmotionTags = (text: string) => {
    const regex = /\[(happy|sad|angry|surprised|neutral)\]/gi
    const parts = text.split(regex)
    const matches = [...text.matchAll(regex)]

    if (matches.length === 0) return text

    const elements: React.ReactNode[] = []
    let matchIndex = 0

    for (let i = 0; i < parts.length; i++) {
      elements.push(parts[i])
      if (matchIndex < matches.length && i < parts.length - 1) {
        const fullTag = matches[matchIndex][0]
        const emotion = matches[matchIndex][1].toLowerCase()
        elements.push(
          <span key={matchIndex} className={`inline-emotion-tag ${emotion}`}>
            {fullTag}
          </span>
        )
        matchIndex++
      }
    }

    return elements
  }

  // Get first emotion tag in message to show as mood indicator
  const getMessageEmotion = (text: string) => {
    const match = text.match(/\[(happy|sad|angry|surprised|neutral)\]/i)
    return match ? match[1].toLowerCase() : null
  }

  return (
    <div className="chat-panel glass-panel">
      {/* Panel Header */}
      <div className="chat-header">
        <div className="avatar-status">
          <span className={`status-indicator ${pipelineStatus}`}></span>
          <span className="status-text">
            {pipelineStatus === 'thinking'
              ? t('status_thinking', { defaultValue: 'Thinking...' })
              : pipelineStatus === 'speaking'
              ? t('status_speaking', { defaultValue: 'Speaking...' })
              : t('status_idle', { defaultValue: 'Online' })}
          </span>
        </div>
        
        {pipelineStatus !== 'idle' && (
          <div className={`emotion-badge ${currentEmotion}`}>
            🎭 {currentEmotion.toUpperCase()}
          </div>
        )}

        <div className="chat-header-actions">
          <button
            onClick={() => dispatch(toggleShowThinking())}
            className={`thinking-toggle-btn ${showThinking ? 'active' : ''}`}
            title={showThinking ? t('hide_thinking', { defaultValue: 'Hide Thinking' }) : t('show_thinking', { defaultValue: 'Show Thinking' })}
          >
            🧠
          </button>
          <button
            onClick={() => dispatch(clearHistory())}
            className="clear-btn"
            title="Clear History"
          >
            🧹
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="message-list">
        {messages.length === 0 ? (
          <div className="welcome-placeholder">
            <p className="welcome-title">{t('welcome')}</p>
            <p className="welcome-subtitle">
              {t('chat_start_hint', { defaultValue: 'Ask me anything to start chatting!' })}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            const emotion = !isUser ? getMessageEmotion(msg.content) : null
            const { cleanedText, thinkingContent } = parseMessageContent(msg.content, showThinking)

            return (
              <div key={index} className={`message-bubble-wrapper ${isUser ? 'user' : 'assistant'}`}>
                {!isUser && emotion && (
                  <span className="bubble-emotion-tag" title={`Expressed: ${emotion}`}>
                    {emotion === 'happy' ? '😊' : emotion === 'sad' ? '😭' : emotion === 'angry' ? '😡' : emotion === 'surprised' ? '😲' : '😐'}
                  </span>
                )}
                <div className={`message-bubble ${isUser ? 'user' : 'assistant'} ${emotion || ''}`}>
                  {showThinking && thinkingContent && (
                    <div className="thinking-process">
                      <div className="thinking-process-header">
                        🧠 {t('thinking_process', { defaultValue: 'Thought Process' })}
                      </div>
                      <div className="thinking-process-body">{thinkingContent}</div>
                    </div>
                  )}
                  <p className="message-content">
                    {showThinking && !isUser ? highlightEmotionTags(cleanedText) : cleanedText}
                  </p>
                </div>
              </div>
            )
          })
        )}

        {status === 'loading' && (
          <div className="message-bubble-wrapper assistant">
            <div className="message-bubble assistant typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            ⚠️ {t('error_message', { defaultValue: 'Error' })}: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="chat-input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={t('chat_placeholder', { defaultValue: 'Say something...' })}
          rows={1}
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!input.trim() || status === 'loading'}
        >
          {t('send', { defaultValue: 'Send' })}
        </button>
      </form>
    </div>
  )
}

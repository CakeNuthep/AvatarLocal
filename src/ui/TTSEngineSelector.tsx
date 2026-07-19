import { useSelector, useDispatch } from 'react-redux'
import { type RootState, setTTSEngine } from '../store'
import React from 'react'

export default function TTSEngineSelector() {
  const dispatch = useDispatch()
  const currentEngine = useSelector((state: RootState) => state.ui.ttsEngine)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const engine = e.target.value as 'piper' | 'coqui'
    dispatch(setTTSEngine(engine))
  }

  return (
    <div className="tts-selector-container">
      <label htmlFor="tts-engine-select" className="tts-label">TTS:</label>
      <select
        id="tts-engine-select"
        value={currentEngine}
        onChange={handleChange}
        className="tts-select"
        aria-label="Select TTS Engine"
      >
        <option value="piper">Piper (Local)</option>
        <option value="coqui">Coqui (Local)</option>
      </select>
    </div>
  )
}

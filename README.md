# AI Avatar Project — Setup & Testing Guide

A local-GPU first, Web-ready 3D AI Avatar system built with React, React Three Fiber (R3F), and Redux Toolkit.

---

## 1. Local Services Setup

To run this project fully, you need three services running: Ollama (LLM), Piper (TTS), and the Vite frontend.

### A. Large Language Model (Ollama)
The application streams chat requests from a local Ollama service running on port `11434` (proxied via Vite at `/api/ollama`).

1. Download and start [Ollama](https://ollama.com/).
2. Pull the default model configured in the provider:
   ```bash
   ollama run qwen3.5:latest
   ```
3. Verify Ollama is running and responsive on `http://localhost:11434`.

### B. Text-to-Speech (TTS) Server
The application communicates with a local text-to-speech engine running on port `5002` (proxied via Vite at `/api/tts`).

1. Run the zero-dependency Python HTTP server script inside the virtual environment:
   ```powershell
   .\.venv-tts\Scripts\python.exe tts_server.py
   ```
2. The server will start on `http://127.0.0.1:5002`.
3. **Auto-Download Support**: Missing voice models (e.g. Thai `th_TH-apatcha-medium` or English `en_US-lessac-medium`) are automatically pulled from Hugging Face and saved to the `resource/tts` directory on the first corresponding request.

---

## 2. Frontend Development

1. Start the Vite development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to the printed local URL (typically `http://localhost:5173`).

---

## 3. Verification & Testing

### Automated Checks
To run the full suite of unit and integration tests (validating math, slices, R3F loop triggers, stream parsing, and edge handlers):
```bash
npm run test
```

### Manual Visual E2E Check (Phase 3 — LLM Chat Integration)
To manually check the entire pipeline end-to-end:
1. Ensure the local **Ollama** service, local **`tts_server.py`**, and the **Vite dev server** are all running.
2. Open the page in your browser (`http://localhost:5173`).
3. Verify the layout: The 3D VRM viewport should occupy the left panel, and the chat console should occupy the right panel in a unified dark theme.
4. Test the conversation flow:
   *   Select a language switcher button in the header (🇺🇸 EN or 🇹🇭 TH).
   *   Type a message into the chat bar and click **Send** (or press Enter).
   *   Verify that:
       1. The status bar immediately transitions to **Thinking...** while the LLM streams.
       2. Once sentences start completing, the status changes to **Speaking...** and TTS audio starts playing.
       3. The avatar's lips synchronize with the audio output.
       4. The avatar's facial emotion dynamically changes based on emotion tags parsed from the stream (e.g., `[happy]` triggers a smiling expression).
       5. Once playback finishes, the avatar returns to **Online** (idle) with normal breathing and gaze-tracking.

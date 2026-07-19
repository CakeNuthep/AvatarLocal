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
The application supports two local text-to-speech engines: **Piper (Local)** on port `5002` (proxied via Vite at `/api/tts`), and **Coqui (Local)** on port `5003` (proxied via Vite at `/api/coqui`). You can dynamically switch between them using the glassmorphic select dropdown menu in the app header.

#### Option 1: Piper TTS Server (Port 5002)
1. Run the zero-dependency Python HTTP server script inside the virtual environment:
   ```powershell
   .\.venv-tts\Scripts\python.exe tts_server.py
   ```
2. The server will start on `http://127.0.0.1:5002`.
3. **Auto-Download Support**: Missing voice models (e.g. English `en_US-lessac-medium`) are automatically pulled from Hugging Face and saved to the `resource/tts` directory on the first corresponding request.
   > [!NOTE]
   > Official Piper repositories lack stable Thai voice models. If Piper is selected for Thai language requests, it will speak using the English model phonetic fallback. Use Coqui for full native Thai voice support.

#### Option 2: Coqui XTTS Server (Port 5003)
For high-quality native Thai speech synthesis and advanced multilingual voice cloning:
1. Start the local Coqui/XTTS server on port `5003`:
   ```powershell
   $env:TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD="1"; .\.venv-tts\Scripts\python.exe -m TTS.server.server --model_path "C:\Users\Cake\AppData\Local\tts\tts_models--multilingual--multi-dataset--xtts_v2" --config_path "C:\Users\Cake\AppData\Local\tts\tts_models--multilingual--multi-dataset--xtts_v2\config.json" --port 5003
   ```
2. The server will automatically load the local cached **XTTS v2** multilingual model files (pre-downloaded to your AppData Local directory) and listen on port `5003` (ignoring PyTorch 2.6+ weights-only pickling checks).
3. Switch the active engine to **Coqui (Local)** and the language to **TH** in the header to get proper Thai speech.

#### Option 3: Kokoro-82M ONNX Server (Port 5004)
For fast, lightweight, CPU-friendly speech synthesis:
1. Start the local Kokoro HTTP server on port `5004`:
   ```powershell
   .\.venv-tts\Scripts\python.exe kokoro_server.py
   ```
2. **Auto-Download Support**: Missing model files (`kokoro-v1.0.onnx` and `voices-v1.0.bin`) are automatically downloaded from GitHub releases and saved to the `resource/kokoro` directory on the first run.
3. Switch the active engine to **Kokoro (Local)** in the header dropdown menu.

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

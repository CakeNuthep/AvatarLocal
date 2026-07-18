# AI Avatar Project — Setup & Testing Guide

A local-GPU first, Web-ready 3D AI Avatar system built with React, React Three Fiber (R3F), and Redux Toolkit.

---

## 1. Local Services Setup

### Text-to-Speech (TTS) Server
The application communicates with a local text-to-speech engine running on port `5002` (proxied via Vite at `/api/tts`).

1. Run the zero-dependency Python HTTP server script inside the virtual environment:
   ```powershell
   .\.venv-tts\Scripts\python.exe tts_server.py
   ```
2. The server will start on `http://127.0.0.1:5002`.
3. **Auto-Download Support**: Missing voice models (e.g. Thai `th_TH-apatcha-medium`) are automatically pulled from Hugging Face and saved to the `resource/tts` directory on the first corresponding request.

---

## 2. Frontend Development

1. Start the Vite development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:5173`.

---

## 3. Verification & Testing

### Automated Checks
To run the full suite of unit and integration tests (validating math, slices, R3F loop triggers, and edge handlers):
```bash
npm run test
```

### Manual Visual E2E Check (Phase 2 — TTS + Lip-Sync)
To manually check the text-to-speech synthesis and lip-syncing calculations:
1. Ensure both the local `tts_server.py` and the Vite dev server are running.
2. Click the **Test Voice & Lip-Sync** button located directly underneath the avatar canvas viewport.
3. Verify the following:
   *   **Audio**: Clear synthesized speech plays out of the speakers.
   *   **Synergistic Mouth Movement**: The avatar's mouth opens and closes (`aa` morph shape) dynamically in sync with the amplitude of the spoken text.
   *   **Mesh Safety Limit**: The mouth opening stays capped at a maximum weight of `0.85` to prevent unnatural visual stretching.
   *   **Idle Return**: Eyelid blinking, gaze lookAt tracking, and breathing movements remain active during and after playback.

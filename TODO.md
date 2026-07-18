# AI Avatar Project — Development TODO

## Project Overview

- **Stack**: React + React Three Fiber (r3f) + @react-three/drei · @pixiv/three-vrm (VRoid Hub model) · Ollama (local LLM) · Piper/Coqui XTTS (TTS) · faster-whisper (STT) · transformers.js (emotion detection) · Redux Toolkit + react-redux (state management) · react-i18next (multi-language UI + LLM prompt localization)
- **Design Goal**: Local-GPU first, swappable to browser-only (WebLLM/Web Speech API) later via provider interfaces. UI and conversation language switchable at runtime.

---

## Best Practices (Apply Throughout)

1. **Interface-first design**: Every external capability (LLM, TTS, STT) sits behind an abstract provider class. No UI or avatar code should ever call `fetch("localhost:11434")` directly — only the provider does.
2. **React component boundaries**: Keep `<AvatarCanvas />` (r3f scene), `<ChatUI />` (text/mic input + message list), and `<LanguageSwitcher />` as separate components. Avatar canvas subscribes to Redux via `useSelector` for emotion/mouth state only — it should not know about LLM/TTS/STT providers directly; those are called from `<ChatUI />` or thunks.
3. **OpenAI-compatible chat format**: Use OpenAI-compatible format for LLM prompts (`{role, content}` messages) so switching Ollama → WebLLM needs zero prompt rewrites.
4. **Single source of truth via Redux**: Conversation history, current language, current emotion, and pipeline status (`idle`/`thinking`/`speaking`) live in the Redux store — not scattered `useState`. Providers dispatch actions/thunks; components only read via selectors.
5. **Language as state, not config**: Current UI/conversation language is a Redux slice value, changeable at runtime, not baked into a build-time env var. Every provider (LLM prompt, TTS voice, STT recognition locale) reads the active language from the store.
6. **Separate UI language from conversation language**: If they can differ (e.g., UI in English, chat in Thai), use two distinct slice fields, not one.
7. **Config over hardcoding**: Model names, endpoints, and blendshape keys go in a single `config.js` / `.env`, never inline.
8. **Fail gracefully**: Every async call (LLM, TTS, STT) needs a timeout + fallback (e.g., show text if TTS fails, don't freeze the avatar).
9. **Version-pin dependencies**: Pin `three`, `@react-three/fiber`, `@react-three/drei`, `three-vrm`, `transformers.js`, and `@reduxjs/toolkit`. VRM/animation code breaks silently across major versions, and r3f is version-locked to specific React + three.js version ranges.
10. **Git from day one**: Small commits per TODO item, feature branches per phase.
11. **Write tests as you go, not after**: Pure logic (blendshape mapping, emotion mapping, provider interfaces with mocked responses, Redux reducers/selectors) should hit ~70-80% coverage. React component rendering uses React Testing Library; r3f/GPU rendering is integration-tested manually.
12. **Decisions Log**: Keep a `docs/decisions.md` logging why you picked each model/library — saves re-litigating choices later.

---

## Phase 0 — Environment Setup

- [x] **0.1 Download a VRM model from VRoid Hub**
  - *Skills*: License literacy (commercial vs. personal use restrictions).
  - *AI Prompt*: `"I downloaded a .vrm file from VRoid Hub under a [CC-BY / personal-use] license. What are my restrictions if I use it in a commercial app?"`
- [x] **0.2 Install Ollama, pull a model (Typhoon or Qwen3.5)**
  - *Skills*: CLI basics, Docker/package management fundamentals.
  - *AI Prompt*: `"Give me step-by-step instructions to install Ollama on [Windows/Mac/Linux] and pull the qwen3.5:4b model. How do I test it responds via curl?"`
- [x] **0.3 Install Piper TTS or Coqui XTTS locally**
  - *Skills*: Python environment setup, CLI.
  - *AI Prompt*: `"Walk me through installing Coqui XTTS in a Python virtual environment on [OS], including GPU (CUDA) support, and give me a minimal script that converts text to a .wav file."`
- [x] **0.4 Scaffold project structure**
  - *Details*: Create `/src/ai-provider`, `/src/avatar` (r3f components), `/src/ui`, `/src/store`, `/src/locales`, `tests/` (React + Vite).
  - *Skills*: React fundamentals, JS/TS project setup (npm, Vite).
  - *AI Prompt*: `"Set up a Vite + React + TypeScript project with folders src/ai-provider, src/avatar (r3f components), src/ui, src/store, src/locales, tests/. Include ESLint, Prettier, and Vitest + React Testing Library configured for unit testing."`
  - *Unit tests*: Vitest config sanity check (`npm run test` runs with 0 tests, no errors); confirm React Testing Library renders a placeholder `<App />` without throwing.
- [x] **0.5 Install and wire up Redux Toolkit (react-redux) + react-i18next**
  - *Skills*: Redux Toolkit fundamentals (slices, thunks, store config), react-redux hooks, react-i18next basics.
  - *AI Prompt*: `"Set up @reduxjs/toolkit + react-redux with a root store in src/store/index.ts, wrap <App /> in <Provider store={store}>, and configure react-i18next with a language-detector and at least two locale JSON files (en.json, th.json) for UI strings. Show a minimal component using useTranslation() and useSelector()."`
  - *Unit tests*: Test store configures without error and has expected initial state shape; test i18next resolves a key in both locales and falls back correctly for a missing key.
- [x] **0.6 Install React Three Fiber + drei**
  - *Skills*: React Three Fiber fundamentals (Canvas, useFrame, useLoader).
  - *AI Prompt*: `"Install @react-three/fiber and @react-three/drei compatible with my React and three.js versions, and create a minimal <Canvas> component rendering an empty scene with OrbitControls from drei, to confirm the setup works before loading the VRM."`
  - *Unit tests*: Smoke test — render `<AvatarCanvas />` with React Testing Library / `@react-three/test-renderer` and assert it mounts without throwing.
- [x] **0.7 Configure local proxy and CORS configurations for local services**
  - *Skills*: Vite configuration, networking proxy setup, Ollama configuration.
  - *AI Prompt*: `"How do I configure Vite's development proxy (vite.config.ts) to forward requests from my React app to local Ollama (port 11434) and Coqui/Piper TTS (port 5002) to avoid CORS issues? Also, how do I configure Ollama via environment variables (like OLLAMA_ORIGINS) to allow direct browser requests?"`
  - *Unit tests*: Test Vite configuration logic to verify target API proxies are set up correctly.

---

## Phase 1 — Avatar Rendering (React Three Fiber + three-vrm)

- [x] **1.1 Build `<AvatarCanvas />` component that loads VRM via r3f**
  - *Skills*: React Three Fiber (Canvas, useLoader/useFrame), async loading in React, Three.js fundamentals.
  - *AI Prompt*: `"Create an <AvatarCanvas /> React component using @react-three/fiber that loads a .vrm file (via a custom hook useVRM(url) wrapping @pixiv/three-vrm's GLTFLoader plugin), adds basic lighting and OrbitControls from drei, and renders the model inside a <Canvas>."`
  - *Unit tests*: Test `useVRM` hook (mocked loader) resolves and returns a VRM instance; test error state when the URL fails to load.
- [x] **1.2 Build a `useBlendshapeController(vrm)` hook to set/get expression weights**
  - *Skills*: React hooks (`useRef`, `useCallback`), understanding VRM expression/blendshape spec.
  - *AI Prompt*: `"Create a useBlendshapeController(vrm) custom hook wrapping a three-vrm VRMExpressionManager that returns { setExpression(name, weight), lerpTo(name, weight, duration), reset() }, safe to call every frame via useFrame without triggering React re-renders (use refs internally, not state)."`
  - *Unit tests*: Mock `VRMExpressionManager`; test `setExpression` clamps weight to [0,1], `lerpTo` interpolates correctly over mocked time steps, `reset()` zeroes all known expressions.
- [x] **1.3 Add debug UI (sliders) to manually test each blendshape range**
  - *Skills*: React component composition, a UI lib (leva or lil-gui).
  - *AI Prompt*: `"Add a leva control panel (React-native alternative to dat.GUI, works cleanly inside r3f) with a slider for every expression name found on the loaded VRM's VRMExpressionManager, calling setExpression from the hook on change."`
- [x] **1.4 Implement idle animation (blink, subtle breathing) inside `useFrame`**
  - *Skills*: r3f `useFrame` loop, animation loops, easing functions.
  - *AI Prompt*: `"Inside <AvatarCanvas />, use r3f's useFrame to add an idle animation system: random blinking every 2-6 seconds using the VRM's blink expression, and a subtle sine-wave chest/breathing bone movement."`
  - *Unit tests*: Test blink-interval randomizer returns values within configured bounds; test breathing offset function output is a pure function of time (deterministic given seeded time input) — test the pure math functions independent of the `useFrame` callback itself.
- [x] **1.5 Create Redux `avatarSlice`**
  - *State*: `{ currentEmotion, pipelineStatus: 'idle'|'thinking'|'speaking', mouthOpen }`
  - *Skills*: Redux Toolkit `createSlice`, selector design, `useSelector` in `<AvatarCanvas />`.
  - *AI Prompt*: `"Create a Redux Toolkit slice avatarSlice with state { currentEmotion, pipelineStatus: 'idle'|'thinking'|'speaking', mouthOpen }, reducers to update each field, and memoized selectors using createSelector. Show how <AvatarCanvas /> reads currentEmotion via useSelector and applies it inside useFrame without causing the whole canvas to re-render on every mouth-open update (use a ref synced via a subscription instead of useSelector for the high-frequency mouthOpen value)."`
  - *Unit tests*: Test each reducer produces the expected state transition; test selectors return correct derived values given a mock state.
- [x] **1.6 Bind VRM eye movement to camera or mouse cursor target**
  - *Skills*: React Three Fiber, VRM LookAt specification, linear interpolation (lerp).
  - *AI Prompt*: `"How do I configure the VRM's LookAt system in @pixiv/three-vrm so that the avatar's eyes track the mouse cursor or the main R3F camera position? Show me how to calculate the look-at target vector and apply linear interpolation (lerp) inside useFrame to smooth the movement."`
  - *Unit tests*: Verify that look-at target positions are updated correctly in the loop, and that weights/ranges are clamped.
- [x] **1.7 Add procedural neck and head bone rotation to follow look target**
  - *Skills*: Three.js bone manipulation, Euler angles, clamping coordinates.
  - *AI Prompt*: `"Using three-vrm, how do I retrieve the neck and head bones from the VRM humanoid hierarchy and rotate them procedurally inside useFrame towards the look-at target? Include code to clamp the rotation angles to realistic human limits (e.g., max 15 degrees) and smooth the transition."`
  - *Unit tests*: Test rotation calculation math in isolation; verify bone rotation angles do not exceed defined clamps.
- [x] **1.8 Set up shadows, lighting, and post-processing in `<AvatarCanvas />`**
  - *Skills*: Three.js lighting & shadow configuration, R3F postprocessing.
  - *AI Prompt*: `"How do I set up high-quality lighting in my React Three Fiber scene, including a DirectionalLight with soft shadows, and wrap my scene in an EffectComposer from @react-three/postprocessing using Bloom and ACESFilmic ToneMapping for a cinematic look?"`
  - *Unit tests*: Smoke test that light sources and EffectComposer are properly rendered within the React Three Fiber Canvas hierarchy.

---

## Phase 2 — TTS + Lip-Sync

- [x] **2.1 Build `TTSProvider` interface + `PiperTTSProvider` (or Coqui) implementation, language-aware**
  - *Skills*: Async JS, HTTP/local process communication.
  - *AI Prompt*: `"Define an abstract TTSProvider class with an async synthesize(text, language): Promise<AudioBuffer> method. Implement PiperTTSProvider that selects the correct voice model based on the language argument (e.g., 'th' → Thai voice, 'en' → English voice) and calls a local Piper HTTP server, returning decoded audio."`
  - *Unit tests*: Mock the HTTP layer; test `synthesize` selects the correct voice/model id per language argument, throws a typed error on non-200 response, and resolves an `AudioBuffer`-like object on success.
- [x] **2.2 Implement amplitude-based lip-sync using Web Audio API**
  - *Skills*: Web Audio API (`AnalyserNode`, FFT concepts).
  - *AI Prompt*: `"Write a LipSyncDriver class that takes an AudioBufferSourceNode, uses an AnalyserNode to read amplitude each frame, maps RMS volume to a 0-1 mouth-open value with smoothing, and calls a callback with that value."`
  - *Unit tests*: Given a synthetic `Float32Array` waveform (silence, full-volume sine), assert RMS calculation and smoothing function output known expected ranges — no need to mock the browser AudioContext, test the math function in isolation.
- [x] **2.3 Wire lip-sync output into `useBlendshapeController` mouth expression via `useFrame`**
  - *Skills*: Integration of 1.2 + 2.2, r3f `useFrame`.
  - *AI Prompt*: `"Connect the LipSyncDriver's per-frame amplitude value to setExpression('aa', value) from the useBlendshapeController hook inside <AvatarCanvas />'s useFrame loop, with a max cap to avoid over-opening the mouth. Read the live amplitude via a ref, not React state, to avoid re-render overhead at 60fps."`
- [x] **2.4 Implement sentence chunking and a sequential TTS audio playback queue**
  - *Skills*: Javascript async queue design, Web Audio API scheduler, string tokenizing.
  - *AI Prompt*: `"Write an AudioQueueScheduler class that manages a queue of TTS synthesis requests. It should accept a stream of text, split it at sentence boundaries (using punctuation like '.', '!', '?'), fetch TTS audio buffers for each sentence in the background, and play them back sequentially without overlaps or gaps. Provide a Vitest unit test."`
  - *Unit tests*: Test sentence-splitting regex with various punctuation marks and languages (EN/TH); test queue executes tasks in correct FIFO order.
- [x] **2.5 (Optional, higher fidelity) Integrate Rhubarb Lip Sync for pre-recorded audio → viseme timing**
  - *Skills*: CLI tooling, phoneme/viseme mapping concepts.
  - *AI Prompt*: `"Show me how to run Rhubarb Lip Sync on a .wav file to get viseme JSON output, and how to map its viseme codes (A, B, C...) to VRM standard mouth expression names."`

---

## Phase 3 — LLM Chat Integration

- [ ] **3.1 Build `AIProvider` interface + `OllamaProvider`, language-aware**
  - *Skills*: Async JS, REST APIs, prompt engineering basics.
  - *AI Prompt*: `"Define an abstract AIProvider class with async chat(messages: {role, content}[], language: string): Promise<string>. Implement OllamaProvider calling POST http://localhost:11434/api/chat, injecting a system instruction to respond in the given language, with streaming disabled first, then add streaming support."`
  - *Unit tests*: Mock fetch; test `chat()` correctly serializes the messages array (including the language system instruction), parses the response body, and throws on malformed JSON or connection failure.
- [ ] **3.2 Create Redux `conversationSlice` (message history, active language)**
  - *Skills*: Redux Toolkit `createSlice` + `createAsyncThunk`.
  - *AI Prompt*: `"Convert a ConversationManager class into a Redux Toolkit slice conversationSlice with state { messages: [], language: 'en', status: 'idle'|'loading'|'error' }. Add reducers addUserMessage, addAssistantMessage, setLanguage, clearHistory, and a message-trimming selector that keeps system prompt + last N turns."`
  - *Unit tests*: Test trimming selector keeps system prompt + last N turns exactly; test message ordering is preserved; test `setLanguage` updates state without mutating history; test reducers are pure.
- [ ] **3.3 Wire `setLanguage` action to a UI language switcher, dispatch to all providers**
  - *Skills*: Redux `useSelector` / `useDispatch` (or vanilla `store.subscribe`), `i18next.changeLanguage`.
  - *AI Prompt*: `"Build a language switcher dropdown that on change: (1) dispatches conversationSlice.actions.setLanguage, (2) calls i18next.changeLanguage() for UI strings, (3) triggers no immediate LLM call — language only applies to the next message sent."`
  - *Unit tests*: Test dispatching `setLanguage` updates the store's `conversation.language` field; test UI language change does not clear existing conversation history.
- [ ] **3.4 Connect: user input → AIProvider.chat → TTSProvider.synthesize → LipSyncDriver**
  - *Skills*: Async pipeline orchestration, error boundaries, Redux thunks.
  - *AI Prompt*: `"Write a Redux thunk sendUserMessage(text) that reads current language from the store, sends text through OllamaProvider → PiperTTSProvider (both language-aware) → plays audio while driving lip-sync, dispatching avatarSlice pipeline-status updates (thinking → speaking → idle) along the way, with try/catch fallback to display text-only if TTS fails."`
  - *Unit tests*: Test thunk dispatches actions in the correct order (`thinking`, then `speaking`, then `idle`) given mocked providers; test failure path dispatches an error state instead of hanging on `thinking`.
- [ ] **3.5 Structure LLM system prompts for emotion-tagging and write a stream parser**
  - *Skills*: System prompt engineering, stream parsing, regex.
  - *AI Prompt*: `"How do I write an Ollama system prompt instructing a model to output emotional tags (e.g. [happy], [sad], [neutral]) prefixing sentences? Write a JS stream parser that processes LLM output token-by-token, extracts these emotion tags, and dispatches Redux events to change the avatar's expression BEFORE playing that sentence's audio."`
  - *Unit tests*: Test parser correctly extracts tags and separates them from clean text; test various formatting edge cases (missing tags, multiple tags in one response).

---

## Phase 4 — Emotion Detection

- [ ] **4.1 Integrate `transformers.js` sentiment/emotion classification model**
  - *Skills*: ML model basics (classification, labels/scores), `transformers.js` API.
  - *AI Prompt*: `"Show me how to load a small emotion-classification ONNX model in transformers.js in the browser, and get a label + confidence score from a text string."`
- [ ] **4.2 Build emotion → blendshape preset mapping table**
  - *Skills*: JS data structures, animation/UX judgement.
  - *AI Prompt*: `"Create an EMOTION_PRESETS map (happy, sad, angry, surprised, neutral) where each key maps to a set of {expressionName, weight} pairs matching typical VRM expression names. Include a function applyEmotion(controller, emotionLabel) that lerps to the preset."`
  - *Unit tests*: Test `applyEmotion` picks the correct preset for a known label, falls back to neutral for unknown labels, and calls `lerpTo` (mocked) with expected arguments.
- [ ] **4.3 Smooth transitions between emotions (avoid jitter)**
  - *Skills*: Easing/interpolation.
  - *AI Prompt*: `"Add debouncing so emotion changes only apply if the new label differs from current AND confidence exceeds a threshold, to avoid flickering between similar emotions."`
  - *Unit tests*: Test debounce logic rejects low-confidence or repeated-label updates, accepts a genuinely new high-confidence label.
- [ ] **4.4 Map emotions to body posture poses by manipulating humanoid bones**
  - *Skills*: VRM humanoid bone mapping, skeletal animation.
  - *AI Prompt*: `"How do I modify body posture bone rotations (like spine, leftShoulder, rightShoulder) in a VRM model based on the active emotion? Provide a mapping table (e.g. sad slumps the shoulders and tilts the head down) and show how to lerp these bone rotations smoothly in useFrame."`
  - *Unit tests*: Test pose mapping returns correct rotation matrices/quaternions for each emotion; test lerp function correctly transitions from neutral to target pose.

---

## Phase 5 — Speech-to-Text (Optional, if mic input desired)

- [ ] **5.1 Build `STTProvider` interface + `WhisperSTTProvider` (faster-whisper, local), language-aware**
  - *Skills*: Python (for whisper server), audio streaming basics.
  - *AI Prompt*: `"Set up a minimal local faster-whisper HTTP server that accepts audio plus a language parameter and returns transcribed text, and write a browser-side WhisperSTTProvider with transcribe(audioBlob, language) that records mic audio via MediaRecorder and posts it to that server, reading the active language from the Redux store."`
  - *Unit tests*: Mock the HTTP layer for the provider class; test correct multipart/form-data construction including the language field, and error handling on empty/failed transcription.
- [ ] **5.2 Integrate client-side Voice Activity Detection (VAD) for hands-free speech**
  - *Skills*: Web Audio API, WebAssembly execution, VAD libraries (e.g. Silero VAD / @ricky0123/vad-web).
  - *AI Prompt*: `"How do I integrate @ricky0123/vad-web (Voice Activity Detection) in a React component to automatically start recording the microphone when the user begins speaking, and stop/submit the audio buffer when they pause? Include handling for loading the WASM model."`
  - *Unit tests*: Mock VAD callbacks; test state changes (`onSpeechStart`, `onSpeechEnd`) trigger appropriate action dispatches.
- [ ] **5.3 Create an interactive audio waveform visualizer for mic input**
  - *Skills*: Web Audio API (AnalyserNode), HTML5 Canvas/SVG rendering.
  - *AI Prompt*: `"Create a React component <WaveformVisualizer /> that takes an active audio MediaStream, uses AnalyserNode to retrieve frequency or time-domain data, and draws a clean, animated neon waveform on an HTML5 canvas."`
  - *Unit tests*: Test components render correctly when mic stream is active; verify AnalyserNode is properly disconnected when component unmounts.

---

## Phase 6 — Integration & Polish

- [ ] **6.1 Full pipeline wiring**
  - *Skills*: Systems integration, debugging async chains, Redux DevTools.
  - *AI Prompt*: `"Review this pipeline code [paste] for race conditions — specifically, what happens if the user sends a new message while TTS/lip-sync from the previous response is still playing, or if they switch language mid-pipeline?"`
- [ ] **6.2 Add "interrupt" handling**
  - *Skills*: State machines, Redux middleware.
  - *AI Prompt*: `"Add an interrupt mechanism: if a new user message arrives while avatarSlice.pipelineStatus === 'speaking', cancel the current audio playback and lip-sync loop cleanly, dispatch status back to idle, before starting the new response."`
  - *Unit tests*: Test state machine transitions (idle → thinking → speaking → idle) reject invalid transitions and correctly reset on interrupt.
- [ ] **6.3 Localize all UI strings with `react-i18next`; add `<LanguageSwitcher />` component**
  - *Skills*: `react-i18next`, React component design.
  - *AI Prompt*: `"Extract all hardcoded UI strings into locales/en.json and locales/th.json, wire components to use useTranslation(), and build a <LanguageSwitcher /> component (dropdown) placed in the app header that updates both UI and conversation language."`
  - *Unit tests*: Test every key used in components exists in all locale files (a simple script/test comparing key sets across JSON files catches missing translations); React Testing Library test that `<LanguageSwitcher />` dispatches `setLanguage` and calls `i18next.changeLanguage` on selection.
- [ ] **6.4 Error handling UI (Ollama down, TTS failed, model still loading)**
  - *Skills*: UX for error states.
  - *AI Prompt*: `"Design simple UI states/toasts for: LLM unreachable, TTS synthesis failed, model still loading — each with a retry action, all strings pulled from i18next."`
- [ ] **6.5 Latency measurement + optimization pass**
  - *Skills*: Performance profiling.
  - *AI Prompt*: `"Add timing instrumentation around each pipeline stage (STT, LLM, TTS, first-audio-byte) and log them, so I can identify the slowest stage."`
- [ ] **6.6 Add OBS Chroma-key and Transparent window capture modes**
  - *Skills*: CSS transparency, React routing / query parameters, R3F clearColor.
  - *AI Prompt*: `"How do I implement a streamer overlay mode in my React application? When a query param like ?mode=stream is present, it should hide all UI overlays, center the avatar in the viewport, and configure the R3F Canvas and body styles to be transparent or solid green (#00ff00) for OBS chroma-key capture."`
  - *Unit tests*: Test components hide themselves when overlay mode is active; test Canvas options are configured correctly when transparent flag is set.

---

## Phase 7 — Browser-Only Migration Path (Future)

- [ ] **7.1 Implement `WebLLMProvider` (same AIProvider interface, language param)**
  - *Skills*: WebGPU basics, WebLLM API.
  - *AI Prompt*: `"Implement WebLLMProvider extends AIProvider using the WebLLM library with a small model (Qwen3.5-4B-Instruct), matching the same chat(messages, language) signature as OllamaProvider, injecting the language instruction the same way."`
  - *Unit tests*: Same test suite written for `OllamaProvider.chat()` contract should pass against `WebLLMProvider` with the WebLLM call mocked — this validates the interface contract holds, including the language argument.
- [ ] **7.2 Implement `WebSpeechTTSProvider` / `WebSpeechSTTProvider` (language-aware)**
  - *Skills*: Web Speech API.
  - *AI Prompt*: `"Implement TTSProvider and STTProvider using the browser's SpeechSynthesis and SpeechRecognition APIs, selecting utterance.lang / recognition.lang from the language argument, matching the existing interfaces exactly."`
- [ ] **7.3 Swap providers via config flag, run full regression test suite**
  - *Skills*: Config management, regression testing.
  - *AI Prompt*: `"Add a PROVIDER_MODE config ('local-gpu' | 'browser-only') that selects which provider classes get instantiated at app startup, with no other code changes required."`

---

## Testing Summary

| Layer | Test Type | Tooling |
| :--- | :--- | :--- |
| **Provider classes** (AI/TTS/STT) | Unit, mocked network calls | Vitest + `vi.fn()` / `msw` |
| **Redux slices/reducers/selectors/thunks** | Unit, pure functions + mocked async | Vitest + Redux Toolkit test utils |
| **React components** (`<ChatUI />`, `<LanguageSwitcher />`, etc.) | Unit/integration, mocked store | Vitest + React Testing Library |
| **i18next locale completeness** | Unit, key-set comparison across locale files | Vitest |
| **Blendshape/emotion mapping logic** | Unit, pure functions | Vitest |
| **Lip-sync math** (RMS, smoothing) | Unit, pure functions | Vitest |
| **`<AvatarCanvas />` (r3f) / VRM loading** | Smoke test (mounts without throwing) + manual/visual | `@react-three/test-renderer`, manual, optional Playwright screenshot diff |
| **Full pipeline** (incl. language switching) | Integration, manual | Manual QA checklist |

---

## General AI Prompt (Fallback)
If you are unsure how to start a specific TODO item:
> *"I'm implementing [TODO item] as part of an AI avatar project using [relevant stack]. Explain the approach, write the code with comments, flag any common pitfalls, and include a Vitest unit test file if the logic is testable in isolation."*

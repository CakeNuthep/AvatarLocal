# Rhubarb Lip Sync Integration Guide

This guide describes how to run the **Rhubarb Lip Sync** CLI tool to generate viseme cues and how to map them to your 3D VRM model's facial expressions.

---

## 1. What is Rhubarb Lip Sync?

[Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) is a command-line tool that automatically generates mouth-cue animations from audio files (supporting English, and adaptable for other languages). It outputs mouth shapes (cues) labeled **A** through **H** and **X** (representing silence).

---

## 2. CLI Execution Instructions

To analyze a pre-recorded `.wav` or `.ogg` audio file and output JSON formatted viseme cues, use the following command:

```bash
rhubarb -f json input.wav -o output.json
```

### JSON Output Format
The resulting `output.json` file contains metadata and a chronological list of non-overlapping mouth cues:

```json
{
  "metadata": {
    "soundFile": "input.wav",
    "duration": 2.14
  },
  "mouthCues": [
    { "start": 0.00, "end": 0.12, "value": "X" },
    { "start": 0.12, "end": 0.24, "value": "B" },
    { "start": 0.24, "end": 0.48, "value": "C" },
    { "start": 0.48, "end": 1.95, "value": "F" },
    { "start": 1.95, "end": 2.14, "value": "X" }
  ]
}
```

---

## 3. Viseme to VRM Expression Mapping

The mouth cue letters represent distinct phonetic mouth shapes. They can be mapped to standard VRM expressions (`aa`, `ee`, `ih`, `oh`, `ou`) as follows:

| Cue | Description | Mapped VRM Shapes |
| :---: | :--- | :--- |
| **A** | Closed mouth (neutral) | All set to `0.0` |
| **B** | Slightly open mouth (for consonants like M, P, B) | `aa: 0.15`, `ih: 0.15` |
| **C** | Medium open mouth (for vowels like 'a' in father) | `aa: 0.70` |
| **D** | Very wide open mouth (for vowels like 'a' in class) | `aa: 0.95` |
| **E** | Slightly open mouth showing tongue (vowels like 'e' in met) | `ee: 0.70`, `ih: 0.20` |
| **F** | Slightly open mouth showing teeth (consonants like S, T, Z) | `ih: 0.60`, `ee: 0.20` |
| **G** | Puckered forward lips (sounds like W, Q, or vowel 'oo') | `ou: 0.80`, `oh: 0.20` |
| **H** | Wide open mouth, tongue visible (consonant L, or 'th') | `aa: 0.40`, `ih: 0.30` |
| **X** | Idle/silent | All set to `0.0` |

---

## 4. Integration with React Three Fiber (R3F)

To drive the VRM's lips dynamically during audio playback:
1.  **Retrieve Audio Elapsed Time**: Track the exact elapsed time of the running `AudioBufferSourceNode` or HTML5 `Audio` element (using `audioContext.currentTime` or `audioElement.currentTime`).
2.  **Find Current Cue**: Look up which cue in `mouthCues` covers the current elapsed time.
3.  **Resolve Weights**: Extract the mapped blendshape weights from `RHUBARB_VISEME_MAP`.
4.  **Drive Expressions**: Apply the weights via the `useBlendshapeController` hook inside your R3F `useFrame` loop:

```typescript
import { getVisemeWeightsAtTime } from '../ai-provider/rhubarb-lip-sync';

// Inside your R3F render frame loop:
useFrame(() => {
  if (isPlaying && vrmController) {
    const elapsed = audioContext.currentTime - playbackStartTime;
    const weights = getVisemeWeightsAtTime(mouthCues, elapsed);
    
    vrmController.setExpression('aa', weights.aa);
    vrmController.setExpression('ee', weights.ee);
    vrmController.setExpression('ih', weights.ih);
    vrmController.setExpression('oh', weights.oh);
    vrmController.setExpression('ou', weights.ou);
  }
});
```

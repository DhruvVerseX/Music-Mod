# 🎙️ Gesture Deck Studio

> **Transform your voice with a wave of your hand.** Gesture Deck Studio is a professional-grade, browser-based vocal performance environment that combines real-time AI hand tracking with a powerful Web Audio effects engine.

![Premium UI](https://img.shields.io/badge/UI-Premium-62ffd9)
![Audio](https://img.shields.io/badge/Engine-Web_Audio_API-ff7a18)
![AI](https://img.shields.io/badge/Tracking-MediaPipe-blue)

## ✨ Core Features

- **🎮 Gesture Control**: High-precision hand tracking translates your movements into live vocal modulations.
- **🔊 Real-Time FX Bus**: Professional-grade DSP for instant Vocoder, Autotune, and Talkbox effects.
- **⏺️ Interactive Recording**: Start and stop recordings using hands-free gestures. Takes are stored locally and are instantly downloadable.
- **🎧 Live Monitoring**: True zero-latency feedback loop with a professional "Dynamics Compressor" and "Vocal Pre-Amp."
- **⚙️ Hardware Calibration**: Full control over input/output routing, pre-amp gain, and master monitor levels.
- **📊 Visual Feedback**: Real-time spectral analyzer and VU meters for precise performance monitoring.

---

## 🖐️ Gesture Legend (Cheat Sheet)

Perform these gestures in front of your camera to trigger the corresponding effect:

| Gesture | Effect / Action | Sound Profile |
| :--- | :--- | :--- |
| **✋ Palm (4 Fingers)** | **Talkbox** | Formant-shifted "Wah" sound with heavy saturation. |
| **✊ Fist** | **Autotune** | Metallic, hard-tuned resonance (C Major Triad). |
| **🤟 Love-You Sign** | **Vocoder** | Thick, robotic super-saw bank (Robot Voice). |
| **✌️ Two-Finger (V)** | **Record Toggle** | Holds for 0.7s to Toggle Start/Stop recording. |
| **👋 No Hand** | **Live Pass** | Clean modulated signal without active FX. |

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Animations**: Framer Motion
- **AI/Tracking**: MediaPipe Hands (WASM-accelerated)
- **Audio Engine**: Custom Web Audio API implementation (DSP)
- **Styling**: Vanilla CSS & Tailwind CSS (Modern Dark Aesthetic)
- **Storage**: IndexedDB (for audio blobs) & LocalStorage (for metadata)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+) or **Bun**
- **Hardware**: A working WebCam and Microphone.
- **Recommendation**: Use **Headphones** to prevent audio feedback from speakers.

### 2. Installation
Clone the repository and install dependencies:
```bash
bun install
# or
npm install
```

### 3. Run Development Server
```bash
bun dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Setup Calibration
1. Click **Start Deck** to request camera/mic access.
2. Scroll to the **Hardware Calibration** rack at the bottom.
3. Use the **Ping** button to verify your speakers.
4. Adjust the **Mic Pre-Amp** until you see the green input meter moving as you speak.
5. Toggle **Live Monitor** to hear your modulated voice in real-time.

---

## 📝 Usage Tips

- **Lighting**: Ensure your hand is well-lit for the most stable gesture tracking.
- **Persistence**: Recording is a "sticky toggle." Once you show two fingers to start, you can move your hand freely; show two fingers again only when you want to stop.
- **Clipping**: If the orange output meter stays at 100%, lower your **Monitor Gain** or **Mic Pre-Amp** to avoid distortion.

---

*Built for performers, by creators.*

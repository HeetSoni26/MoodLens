# 🎭 MoodLens: Real-Time Emotion AI, 100% On-Device

**MoodLens** reads emotions from your **face, words, photos, videos and voice**, and every single byte of inference runs *inside your browser*. No servers, no uploads, no accounts. Built with Next.js 16, TensorFlow.js and ONNX Runtime Web.

## ✨ What it does

| Mode | What happens |
| :--- | :--- |
| 🔴 **Live Detection** | Real-time webcam emotion recognition: smooth multi-face tracking with glowing mood boxes, live probability bars, FPS/latency telemetry, snapshot capture and a live emotion-over-time chart. |
| 🖼️ **Photo Batch** | Drop up to 12 photos; every face in every picture gets its own emotion read with an annotated, downloadable copy. |
| 🎞️ **Video Analysis** | Upload a clip and MoodLens scans it frame-by-frame, charting its emotional arc on a timeline synced to the player with a click-to-seek heat strip. |
| 💬 **Text Emotions** | Paste any text: a quantized DistilRoBERTa transformer reads the feeling behind the words, sentence by sentence. |
| 🎙️ **Voice Fusion** | Speak naturally; MoodLens converts speech to text, reads the emotion in your words, and compares it with what your face is showing ("say it vs show it"). |
| 📊 **Mood Dashboard** | Every recorded session lands in a private journal with aggregate charts, activity streaks and one-click JSON/CSV export. |

### Seven emotions, everywhere

Happy 😊 · Neutral 😐 · Sad 😢 · Angry 😠 · Fear 😨 · Disgust 🤢 · Surprise 😲, the same spectrum across face, text and voice, so results are always comparable.

## 🔒 Privacy by architecture

MoodLens isn't private because of a policy, it's private because there is **nowhere to send your data**. The neural networks are shipped to your browser and executed locally:

- **Vision**: TinyFaceDetector + FaceExpressionNet (TensorFlow.js / WebGL), ~530 KB of weights served from the app itself.
- **Text & voice**: `emotion-english-distilroberta-base` quantized to int8 (~79 MB, downloaded once from the Hugging Face hub and cached by the browser; runs offline after that) on ONNX Runtime WASM.

Only anonymous, aggregate emotion summaries are saved in your own browser's `localStorage`, and only when you choose to record.

## 🧱 Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**: aurora-glass design system, animated backdrop, fully responsive
- **@vladmandic/face-api** (TensorFlow.js): face detection & expression recognition
- **@huggingface/transformers** (ONNX Runtime Web): in-browser transformer inference
- **Framer Motion**: spring-driven UI and page transitions
- **Recharts**: emotion timelines, arcs and distributions
- **Web Speech API**: speech-to-text for Voice Fusion

## 🚀 Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

> The text/voice model (~79 MB) is fetched from the Hugging Face hub on first use and cached, everything else is bundled.

## 📁 Structure

```
src/
├─ app/                  # / · /live · /image · /video · /text · /voice · /dashboard
├─ components/
│  ├─ shell/             # AppShell (glass nav + transitions), AuroraBackground
│  ├─ ui/                # EmotionBars, MoodOrb, headers & reveal primitives
├─ hooks/
│  └─ useFaceEngine.ts   # camera lifecycle + detection loop + stats + journaling
├─ lib/
│  ├─ emotions.ts        # 7-emotion spectrum, palettes, mapping tables
│  ├─ vision.ts          # face-api engine loader, detector, EMA smoothing
│  ├─ textEngine.ts      # transformers.js loader + classification
│  └─ session.ts         # localStorage journal + CSV/JSON export
└─ public/models/faceapi # self-hosted vision weights
```

---

Built with 💜 by [Heet Soni](https://github.com/HeetSoni26) · AI & Full-Stack Developer

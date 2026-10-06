'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mic, MicOff, ScanFace, Square } from 'lucide-react';
import EmotionBars from '@/components/ui/EmotionBars';
import FeatureHeader from '@/components/ui/FeatureHeader';
import { useFaceEngine } from '@/hooks/useFaceEngine';
import { classifyTextScores, loadTextEngine, type TextEngineProgress } from '@/lib/textEngine';
import {
  EMOTIONS,
  dominantEmotion,
  type EmotionKey,
  type EmotionScores,
  emptyScores,
} from '@/lib/emotions';
import { saveSession } from '@/lib/session';

/* Minimal Web Speech API typings (not in TS DOM lib yet) */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface Line {
  id: number;
  text: string;
  top: EmotionKey;
  confidence: number;
}

export default function VoiceClient() {
  const face = useFaceEngine({ targetFps: 8, smoothing: true });
  const [speechSupported, setSpeechSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [interim, setInterim] = useState('');
  const [wordScores, setWordScores] = useState<EmotionScores | null>(null);
  const [modelProgress, setModelProgress] = useState<TextEngineProgress | null>(null);
  const [saved, setSaved] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wordHistRef = useRef<EmotionScores[]>([]);
  const lineIdRef = useRef(0);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, interim]);

  const startListening = useCallback(async () => {
    setSaved(false);
    const SRClass =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SRClass) {
      setSpeechSupported(false);
      return;
    }
    await loadTextEngine(setModelProgress);
    wordHistRef.current = [];
    setLines([]);
    setWordScores(null);

    const rec = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = async (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal && transcript.trim().length > 1) {
          const text = transcript.trim();
          const scores = await classifyTextScores(text);
          wordHistRef.current.push(scores);
          if (wordHistRef.current.length > 12) wordHistRef.current.shift();
          const avg = emptyScores();
          for (const h of wordHistRef.current) {
            for (const key of Object.keys(avg) as EmotionKey[]) avg[key] += h[key];
          }
          for (const key of Object.keys(avg) as EmotionKey[]) avg[key] /= wordHistRef.current.length;
          setWordScores(avg);
          const id = ++lineIdRef.current;
          setLines((prev) => [
            ...prev.slice(-30),
            { id, text, top: dominantEmotion(scores), confidence: scores[dominantEmotion(scores)] },
          ]);
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim('');

    const wordDist = emptyScores();
    const words = wordHistRef.current;
    if (words.length === 0 && !cameraOn) return;
    for (const w of words) {
      for (const key of Object.keys(wordDist) as EmotionKey[]) wordDist[key] += w[key];
    }
    // blend: 60% words, 40% face (when camera is on)
    const faceDist = emptyScores();
    for (const key of Object.keys(faceDist) as EmotionKey[]) faceDist[key] = 0.25; // neutral prior
    if (cameraOn) {
      const blend = emptyScores();
      for (const key of Object.keys(blend) as EmotionKey[]) {
        blend[key] = words.length > 0 ? wordDist[key] * 0.6 + faceDist[key] * 0.4 : faceDist[key];
      }
      saveSession({
        mode: 'voice',
        startedAt: Date.now(),
        durationMs: 0,
        samples: words.length,
        distribution: blend,
        preview: `${words.length} spoken line${words.length !== 1 ? 's' : ''}${cameraOn ? ' + camera' : ''}`,
      });
      setSaved(true);
    } else if (words.length > 0) {
      const norm = emptyScores();
      for (const key of Object.keys(norm) as EmotionKey[]) norm[key] = wordDist[key] / words.length;
      saveSession({
        mode: 'voice',
        startedAt: Date.now(),
        durationMs: 0,
        samples: words.length,
        distribution: norm,
        preview: `${words.length} spoken line${words.length !== 1 ? 's' : ''}`,
      });
      setSaved(true);
    }
  }, [cameraOn]);

  const wordsDominant = wordScores ? dominantEmotion(wordScores) : null;
  const faceDominant = face.faces[0] ? dominantEmotion(face.faces[0].scores) : null;
  const inSync = wordsDominant && faceDominant && wordsDominant === faceDominant;

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      face.stop();
      setCameraOn(false);
    } else {
      void face.start();
      setCameraOn(true);
    }
  }, [cameraOn, face]);

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Voice Fusion"
        title="Say it. Show it. Compare."
        description="Speak naturally: MoodLens converts your speech to text, reads the emotion in your words, and (optionally) watches your face at the same time to see if the two agree."
      />

      {!speechSupported && (
        <div className="mx-auto w-full max-w-6xl px-5 pt-6">
          <div className="rounded-[22px] border border-mood-disgust/30 bg-mood-disgust/10 p-4 text-sm text-mood-disgust">
            Live speech recognition needs Chrome, Edge or another Chromium browser. You can still use the
            camera and Text modes elsewhere.
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-5 pt-8 lg:grid-cols-[380px_1fr]">
        {/* ─── Left: camera + controls ─── */}
        <div className="flex flex-col gap-4">
          <div className="glass-strong edge-glow relative aspect-video overflow-hidden rounded-[26px] bg-ink-900">
            <video
              ref={face.videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-900/90">
                <ScanFace size={28} className="text-white/50" aria-hidden="true" />
                <p className="max-w-[220px] text-center text-xs text-white/50">
                  Camera is optional, enable it to add facial expressions to the fusion read.
                </p>
                <button
                  onClick={toggleCamera}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/85 transition-all hover:bg-white/[0.12] active:scale-95"
                >
                  <ScanFace size={13} aria-hidden="true" />
                  {face.status === 'starting-camera' || face.status === 'loading-model' ? 'Starting…' : 'Enable Camera'}
                </button>
              </div>
            )}
          </div>

          <div className="glass flex flex-wrap items-center gap-2.5 rounded-[22px] p-3">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={!speechSupported || (!listening && modelProgress?.status !== 'ready' && modelProgress !== null && modelProgress.status === 'error')}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                listening
                  ? 'border border-mood-angry/50 bg-mood-angry/15 text-mood-angry'
                  : 'bg-gradient-to-r from-aurora-violet to-aurora-cyan text-ink-950 shadow-[0_8px_26px_-8px_rgba(139,92,246,0.7)]'
              }`}
            >
              {listening ? <Square size={12} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}
              {listening ? 'Stop Session' : 'Start Speaking'}
            </button>
            {listening && (
              <span className="flex items-center gap-1.5 rounded-full border border-mood-happy/30 bg-mood-happy/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-mood-happy">
                <span className="h-1.5 w-1.5 rounded-full bg-mood-happy animate-pulse-soft" aria-hidden="true" />
                Listening
              </span>
            )}
            {modelProgress && modelProgress.status !== 'ready' && modelProgress.status !== 'error' && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                <Loader2 size={12} className="animate-spin text-aurora-cyan" aria-hidden="true" />
                loading model {typeof modelProgress.progress === 'number' ? `${Math.round(modelProgress.progress * 100)}%` : ''}
              </span>
            )}
            {saved && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase text-mood-happy">
                <CheckCircle2 size={12} aria-hidden="true" /> saved
              </span>
            )}
          </div>

          {/* fusion verdict */}
          <div className="glass-strong edge-glow rounded-[26px] p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Fusion verdict</h3>
            {wordsDominant ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-center">
                    <div className="text-2xl" aria-hidden="true">{EMOTIONS[wordsDominant].emoji}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45">Words say</div>
                    <div className="font-display text-sm font-bold" style={{ color: EMOTIONS[wordsDominant].color }}>
                      {EMOTIONS[wordsDominant].label}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-center">
                    <div className="text-2xl" aria-hidden="true">{faceDominant ? EMOTIONS[faceDominant].emoji : '🫥'}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45">Face shows</div>
                    <div className="font-display text-sm font-bold text-white/80">
                      {faceDominant ? EMOTIONS[faceDominant].label : 'Camera off'}
                    </div>
                  </div>
                </div>
                <motion.p
                  key={String(inSync)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border px-4 py-3 text-xs font-semibold leading-relaxed ${
                    faceDominant == null
                      ? 'border-white/10 bg-white/[0.04] text-white/60'
                      : inSync
                        ? 'border-mood-happy/30 bg-mood-happy/10 text-mood-happy'
                        : 'border-mood-surprise/30 bg-mood-surprise/10 text-mood-surprise'
                  }`}
                >
                  {faceDominant == null
                    ? 'Enable the camera to compare your words with your expressions.'
                    : inSync
                      ? 'In sync: your words and your face tell the same story.'
                      : 'Interesting: your words and your face disagree. MoodLens flags mixed signals like sarcasm or masked feelings.'}
                </motion.p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                Start speaking and MoodLens will compare the emotion in your words with what your face shows.
              </p>
            )}
          </div>
        </div>

        {/* ─── Right: transcript + readings ─── */}
        <div className="flex flex-col gap-4">
          <div className="glass-strong edge-glow flex min-h-[300px] flex-1 flex-col rounded-[26px] p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Live transcript</h3>
            <div ref={feedRef} className="mt-4 flex max-h-[380px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {lines.length === 0 && !interim && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <span className="text-4xl" aria-hidden="true">🎙️</span>
                  <p className="max-w-[260px] text-xs leading-relaxed text-white/45">
                    Your spoken lines will appear here, each tagged with the emotion MoodLens hears.
                  </p>
                </div>
              )}
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-lg leading-none" aria-hidden="true">{EMOTIONS[line.top].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-white/85">{line.text}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(line.confidence * 100)}%`, background: EMOTIONS[line.top].color }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              {interim && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm italic text-white/40">
                  {interim}…
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-[26px] p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Emotion in your words</h3>
            <div className="mt-4">
              {wordScores ? (
                <EmotionBars scores={wordScores} />
              ) : (
                <p className="text-xs text-white/45">Rolling emotion average across your last dozen lines.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

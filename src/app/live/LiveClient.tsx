'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Circle,
  Download,
  Loader2,
  Maximize2,
  RefreshCcw,
  ScanFace,
  Square,
  SwitchCamera,
  Waves,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmotionBars, { DominantEmotion } from '@/components/ui/EmotionBars';
import FeatureHeader from '@/components/ui/FeatureHeader';
import { useFaceEngine } from '@/hooks/useFaceEngine';
import { EMOTIONS, dominantEmotion, type EmotionKey, type EmotionScores } from '@/lib/emotions';
import type { DetectedFace } from '@/lib/vision';
import { drawFaceBox, mapFaceBox, prepareCanvas } from '@/lib/overlay';
import { saveSession } from '@/lib/session';

const FPS_OPTIONS = [8, 12, 18, 24] as const;

type ChartPoint = { t: number } & EmotionScores;

function drawOverlay(
  canvas: HTMLCanvasElement,
  faces: DetectedFace[],
  video: HTMLVideoElement,
  mirrored: boolean,
) {
  const prep = prepareCanvas(canvas, video.videoWidth, video.videoHeight);
  if (!prep) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { pw, t, dpr } = prep;
  ctx.clearRect(0, 0, pw, canvas.height);

  for (const face of faces) {
    drawFaceBox(ctx, face, mapFaceBox(face, pw, t, mirrored), dpr);
  }
}

export default function LiveClient() {
  const engine = useFaceEngine({ targetFps: 12, smoothing: true });
  const { videoRef, status, statusMessage, faces, stats, recording } = engine;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const facesRef = useRef<DetectedFace[]>([]);
  const [mirrored, setMirrored] = useState(true);
  const [smooth, setSmooth] = useState(true);
  const [fps, setFps] = useState<number>(12);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  facesRef.current = faces;
  engine.drawRef.current = (f, meta) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) drawOverlay(canvas, f, video, meta.mirrored);
  };

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const sampleFaces = facesRef.current;
      if (sampleFaces.length === 0) return;
      const avg = { happy: 0, neutral: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0 } as EmotionScores;
      for (const f of sampleFaces) {
        for (const k of Object.keys(avg) as EmotionKey[]) avg[k] += f.scores[k];
      }
      setChart((prev) => {
        const next = [...prev, { t: Date.now(), ...avg }];
        return next.slice(-64);
      });
    }, 700);
    return () => clearInterval(t);
  }, [recording]);

  const handleToggle = useCallback(() => {
    if (status === 'running') {
      engine.stop();
    } else if (status === 'idle' || status === 'error' || status === 'stopped') {
      setChart([]);
      void engine.start();
    }
  }, [engine, status]);

  const handleRecord = useCallback(() => {
    if (recording) {
      const summary = engine.stopRecording();
      if (summary) {
        saveSession({ mode: 'live', ...summary });
        setToast('Session saved to your dashboard');
        setTimeout(() => setToast(null), 3200);
      } else {
        setToast('No faces were detected, nothing to save');
        setTimeout(() => setToast(null), 3200);
      }
    } else {
      engine.startRecording();
    }
  }, [engine, recording]);

  const handleSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const out = document.createElement('canvas');
    out.width = video.videoWidth;
    out.height = video.videoHeight;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.save();
    if (mirrored) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    // stamp
    const top = facesRef.current[0];
    if (top) {
      const meta = EMOTIONS[dominantEmotion(top.scores)];
      ctx.font = '700 42px Outfit, ui-sans-serif, sans-serif';
      ctx.fillStyle = 'rgba(6, 8, 18, 0.72)';
      ctx.fillRect(24, out.height - 92, 460, 62);
      ctx.fillStyle = meta.color;
      ctx.fillText(`${meta.emoji} ${meta.label} · MoodLens`, 44, out.height - 50);
    }
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moodlens-snapshot-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }, [mirrored, videoRef]);

  const handleFullscreen = useCallback(() => {
    void stageRef.current?.requestFullscreen?.();
  }, []);

  const isRunning = status === 'running';
  const busy = status === 'loading-model' || status === 'starting-camera';

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Live Detection"
        title="Real-time emotion recognition"
        description="Turn on your camera and watch MoodLens track every face and read seven emotions simultaneously, processed entirely on this device."
      />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-5 pt-8 lg:grid-cols-[1fr_360px]">
        {/* ─── Stage ─── */}
        <div className="flex flex-col gap-4">
          <div
            ref={stageRef}
            className="glass-strong edge-glow relative aspect-video w-full overflow-hidden rounded-[28px] bg-ink-900"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

            {/* idle / loading veil */}
            {!isRunning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-900/85 backdrop-blur-sm">
                <motion.div
                  animate={busy ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]"
                >
                  {busy ? (
                    <Loader2 size={30} className="animate-spin text-aurora-cyan" aria-hidden="true" />
                  ) : status === 'error' ? (
                    <CameraOff size={30} className="text-mood-angry" aria-hidden="true" />
                  ) : (
                    <ScanFace size={30} className="text-white/70" aria-hidden="true" />
                  )}
                </motion.div>
                <div className="max-w-sm text-center">
                  <p className="font-display text-lg font-bold text-white">
                    {busy ? statusMessage || 'Warming up…' : status === 'error' ? 'Camera unavailable' : 'Camera standby'}
                  </p>
                  <p className="mt-1.5 text-sm text-white/55">
                    {status === 'error'
                      ? statusMessage
                      : 'Frames are processed locally, nothing is ever uploaded.'}
                  </p>
                </div>
              </div>
            )}

            {/* status chips */}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md ${
                  isRunning
                    ? 'bg-mood-happy/15 text-mood-happy border border-mood-happy/30'
                    : 'bg-white/[0.06] text-white/60 border border-white/10'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-mood-happy animate-pulse-soft' : 'bg-white/40'}`} aria-hidden="true" />
                {isRunning ? 'Live' : busy ? 'Preparing' : 'Offline'}
              </span>
              {recording && (
                <span className="flex items-center gap-1.5 rounded-full border border-mood-angry/40 bg-mood-angry/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mood-angry backdrop-blur-md">
                  <Circle size={8} className="fill-mood-angry" aria-hidden="true" />
                  Recording
                </span>
              )}
            </div>

            <button
              onClick={handleFullscreen}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-colors hover:text-white"
              aria-label="Fullscreen"
            >
              <Maximize2 size={13} aria-hidden="true" />
            </button>
          </div>

          {/* ─── Controls ─── */}
          <div className="glass flex flex-wrap items-center gap-2.5 rounded-[22px] p-3">
            <button
              onClick={handleToggle}
              disabled={busy}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                isRunning
                  ? 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]'
                  : 'bg-gradient-to-r from-aurora-violet to-aurora-cyan text-ink-950 shadow-[0_8px_26px_-8px_rgba(139,92,246,0.7)]'
              }`}
            >
              {isRunning ? <Square size={13} aria-hidden="true" /> : <Camera size={13} aria-hidden="true" />}
              {isRunning ? 'Stop Camera' : busy ? 'Starting…' : 'Start Camera'}
            </button>

            <button
              onClick={handleRecord}
              disabled={!isRunning}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
                recording
                  ? 'border border-mood-angry/50 bg-mood-angry/20 text-mood-angry'
                  : 'border border-white/15 bg-white/[0.04] text-white/75 hover:text-white'
              }`}
            >
              {recording ? <Square size={12} aria-hidden="true" /> : <Circle size={11} className="fill-mood-angry text-mood-angry" aria-hidden="true" />}
              {recording ? 'Stop & Save' : 'Record'}
            </button>

            <button
              onClick={handleSnapshot}
              disabled={!isRunning}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/75 transition-all hover:text-white active:scale-95 disabled:opacity-40"
            >
              <Download size={13} aria-hidden="true" />
              Snapshot
            </button>

            <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

            <button
              onClick={() => setMirrored((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                mirrored
                  ? 'border border-aurora-cyan/40 bg-aurora-cyan/10 text-aurora-cyan'
                  : 'border border-white/15 bg-white/[0.04] text-white/70'
              }`}
            >
              <SwitchCamera size={13} aria-hidden="true" />
              Mirror: {mirrored ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => setSmooth((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                smooth
                  ? 'border border-aurora-violet/40 bg-aurora-violet/10 text-[#c4b5fd]'
                  : 'border border-white/15 bg-white/[0.04] text-white/70'
              }`}
            >
              <Waves size={13} aria-hidden="true" />
              Smooth: {smooth ? 'On' : 'Off'}
            </button>

            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <RefreshCcw size={12} className="text-white/45" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">FPS</span>
              <div className="flex gap-0.5">
                {FPS_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                      fps === f ? 'bg-white text-ink-950' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Live timeline chart ─── */}
          <div className="glass rounded-[22px] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                Emotion over time
              </h3>
              <span className="text-[10px] font-semibold text-white/35">
                {recording ? 'recording session' : 'starts when you record'}
              </span>
            </div>
            <div className="h-[130px]">
              {chart.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 1]} hide />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(10, 13, 28, 0.94)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14,
                        fontSize: 11,
                      }}
                      labelFormatter={() => ''}
                      formatter={(value, name) => [
                        `${Math.round(Number(value) * 100)}%`,
                        EMOTIONS[name as EmotionKey].label,
                      ]}
                    />
                    {(Object.keys(EMOTIONS) as EmotionKey[]).map((key) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        stroke={EMOTIONS[key].color}
                        fill={EMOTIONS[key].color}
                        fillOpacity={0.14}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-white/35">
                  The emotion timeline will stream here while recording
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right rail ─── */}
        <div className="flex flex-col gap-4">
          <div className="glass-strong edge-glow rounded-[26px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Live reading</h3>
              <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-mood-happy animate-pulse-soft' : 'bg-white/25'}`} aria-hidden="true" />
            </div>
            <DominantEmotion scores={faces[0]?.scores ?? { happy: 0, neutral: 0.34, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0 }} size="lg" />
            <div className="mt-5">
              <EmotionBars
                scores={faces[0]?.scores ?? { happy: 0, neutral: 0.34, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0 }}
              />
            </div>
            {faces.length > 1 && (
              <p className="mt-3 text-[11px] font-semibold text-aurora-cyan">
                + {faces.length - 1} more face{faces.length > 2 ? 's' : ''} tracked on the stage
              </p>
            )}
          </div>

          <div className="glass grid grid-cols-2 gap-3 rounded-[26px] p-4">
            {[
              { label: 'Speed', value: `${stats.fps}` , unit: 'fps' },
              { label: 'Latency', value: `${stats.latencyMs}`, unit: 'ms' },
              { label: 'Faces', value: `${stats.faces}`, unit: 'tracked' },
              { label: 'Dropped', value: `${stats.dropped}`, unit: 'frames' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                <div className="font-display text-xl font-bold tabular-nums text-white">
                  {s.value}
                  <span className="ml-1 text-[10px] font-semibold uppercase text-white/40">{s.unit}</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-[26px] p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Session journal</h3>
            <p className="mt-2.5 text-xs leading-relaxed text-white/55">
              {recording
                ? 'Recording, mood samples are being collected for your private dashboard.'
                : 'Press Record while detecting to save this session, then review everything on the Dashboard.'}
            </p>
            {toast && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-mood-happy/30 bg-mood-happy/10 px-3 py-2 text-[11px] font-semibold text-mood-happy"
              >
                {toast}
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

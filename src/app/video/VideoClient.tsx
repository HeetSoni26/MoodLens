'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clapperboard, Download, Loader2, Play, ScanFace, Search, Trash2 } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import FeatureHeader from '@/components/ui/FeatureHeader';
import { DominantEmotion } from '@/components/ui/EmotionBars';
import {
  EMOTIONS,
  EMOTION_ORDER,
  dominantEmotion,
  type EmotionKey,
  type EmotionScores,
  emptyScores,
} from '@/lib/emotions';
import { detectFaces, loadVisionEngine, makeDetectorOptions, type DetectedFace, type VisionEngine } from '@/lib/vision';
import { drawFaceBox, mapFaceBox, prepareCanvas } from '@/lib/overlay';
import { downloadBlob, saveSession } from '@/lib/session';

interface TimelineSample {
  t: number;
  scores: EmotionScores;
  faces: DetectedFace[];
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler);
      resolve();
    };
    video.addEventListener('seeked', handler);
    video.currentTime = t;
  });
}

export default function VideoClient() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);
  const [timeline, setTimeline] = useState<TimelineSample[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const engineRef = useRef<VisionEngine | null>(null);
  const timelineRef = useRef<TimelineSample[]>([]);
  const rafRef = useRef(0);
  timelineRef.current = timeline;

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setTimeline([]);
    setPhase('idle');
    setProgress(0);
    setVideoUrl(URL.createObjectURL(file));
    setFileName(file.name);
  }, [videoUrl]);

  const drawAt = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const prep = prepareCanvas(canvas, video.videoWidth, video.videoHeight);
    if (!prep) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { pw, ph, t, dpr } = prep;
    ctx.clearRect(0, 0, pw, ph);
    const tl = timelineRef.current;
    if (tl.length === 0) return;

    // nearest sample
    let lo = 0;
    let hi = tl.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tl[mid].t < time) lo = mid + 1;
      else hi = mid;
    }
    const sample = tl[lo];

    for (const face of sample.faces) {
      drawFaceBox(ctx, face, mapFaceBox(face, pw, t, false), dpr);
    }
  }, []);

  /* overlay refresh loop while playing */
  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      if (video && phase === 'ready') drawAt(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, drawAt]);

  const analyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 1 || phase === 'scanning') return;
    setPhase('scanning');
    setProgress(0);
    try {
      if (!engineRef.current) engineRef.current = await loadVisionEngine();
      const engine = engineRef.current;
      const options = makeDetectorOptions(engine);
      video.pause();

      const duration = video.duration || 0;
      const step = Math.max(0.75, duration / 240);
      const tl: TimelineSample[] = [];
      for (let t = 0; t < duration; t += step) {
        await seekTo(video, Math.min(t, duration - 0.05));
        const faces = await detectFaces(engine, video, options);
        const scores = emptyScores();
        if (faces.length > 0) {
          for (const face of faces) {
            for (const key of EMOTION_ORDER) scores[key] += face.scores[key];
          }
          for (const key of EMOTION_ORDER) scores[key] /= faces.length;
        }
        tl.push({ t, scores, faces });
        setProgress(t / duration);
      }
      setTimeline(tl);
      setPhase('ready');

      // journal
      const counts = emptyScores();
      let samples = 0;
      for (const s of tl) {
        if (s.faces.length > 0) {
          counts[dominantEmotion(s.scores)] += 1;
          samples += 1;
        }
      }
      if (samples > 0) {
        const norm = emptyScores();
        for (const key of EMOTION_ORDER) norm[key] = counts[key] / samples;
        saveSession({
          mode: 'video',
          startedAt: Date.now(),
          durationMs: Math.round(duration * 1000),
          samples,
          distribution: norm,
          preview: fileName.slice(0, 80),
        });
      }
      await seekTo(video, 0);
    } catch {
      setPhase('idle');
    }
  }, [fileName, phase]);

  const overallAvg: EmotionScores | null = (() => {
    const withFaces = timeline.filter((s) => s.faces.length > 0);
    if (withFaces.length === 0) return null;
    const avg = emptyScores();
    for (const s of withFaces) {
      for (const key of EMOTION_ORDER) avg[key] += s.scores[key];
    }
    for (const key of EMOTION_ORDER) avg[key] /= withFaces.length;
    return avg;
  })();

  const exportCsv = useCallback(() => {
    const header = 'time_s,' + EMOTION_ORDER.map((k) => k).join(',');
    const rows = timeline.map((s) => [s.t.toFixed(2), ...EMOTION_ORDER.map((k) => s.scores[k].toFixed(4))].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    downloadBlob(blob, `moodlens-video-timeline-${Date.now()}.csv`);
  }, [timeline]);

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Video Analysis"
        title="Chart a video's emotional arc"
        description="Upload a clip and MoodLens scans it frame by frame, charting the emotional journey on a timeline synced to the player."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-8">
        {!videoUrl ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
            }}
            className="glass-strong edge-glow flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border-dashed border-white/12 px-6 py-16 text-center transition-all hover:border-white/25"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-aurora-rose/25 to-aurora-violet/20">
              <Clapperboard size={24} className="text-white/85" aria-hidden="true" />
            </div>
            <p className="font-display text-base font-bold text-white">Drop a video here, or click to browse</p>
            <p className="text-xs text-white/45">MP4 / WebM / MOV · analyzed frame-by-frame on this device</p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) loadFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-4">
              <div className="glass-strong edge-glow relative aspect-video overflow-hidden rounded-[28px] bg-ink-900">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  onLoadedMetadata={() => phase === 'scanning' && videoRef.current?.pause()}
                />
                {phase !== 'scanning' && <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />}
                {phase === 'scanning' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/80 backdrop-blur-sm">
                    <Loader2 size={30} className="animate-spin text-aurora-cyan" aria-hidden="true" />
                    <div className="w-64">
                      <div className="mb-1.5 flex justify-between text-[11px] font-bold text-white/70">
                        <span>Scanning emotional arc…</span>
                        <span className="tabular-nums text-aurora-cyan">{Math.round(progress * 100)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan transition-all"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* controls + heat strip */}
              <div className="glass flex flex-wrap items-center gap-2.5 rounded-[22px] p-3">
                {phase === 'idle' ? (
                  <button
                    onClick={analyze}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan px-5 py-2.5 text-xs font-bold text-ink-950 shadow-[0_8px_26px_-8px_rgba(139,92,246,0.7)] transition-all active:scale-95"
                  >
                    <Search size={13} aria-hidden="true" />
                    Analyze Video
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTimeline([]);
                      setPhase('idle');
                      setProgress(0);
                    }}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-xs font-bold text-white/80 transition-all active:scale-95"
                  >
                    <Play size={13} aria-hidden="true" />
                    Re-scan
                  </button>
                )}
                <button
                  onClick={() => {
                    if (videoUrl) URL.revokeObjectURL(videoUrl);
                    setVideoUrl(null);
                    setFileName('');
                    setTimeline([]);
                    setPhase('idle');
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition-all hover:text-white active:scale-95"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Remove
                </button>
                <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/55">
                  <ScanFace size={12} aria-hidden="true" />
                  {fileName}
                </span>
              </div>

              {/* heat strip */}
              {phase === 'ready' && timeline.length > 1 && (
                <div
                  className="flex h-7 w-full cursor-pointer overflow-hidden rounded-full border border-white/10"
                  onClick={(e) => {
                    const video = videoRef.current;
                    if (!video) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const frac = (e.clientX - rect.left) / rect.width;
                    video.currentTime = frac * (video.duration || 0);
                  }}
                  role="slider"
                  aria-label="Emotion heat strip, click to seek"
                  aria-valuenow={0}
                  tabIndex={0}
                >
                  {timeline.map((s, i) => {
                    const hasFaces = s.faces.length > 0;
                    const key = dominantEmotion(s.scores);
                    return (
                      <div
                        key={i}
                        className="h-full flex-1 transition-all"
                        style={{
                          background: hasFaces ? EMOTIONS[key].color : 'rgba(255,255,255,0.06)',
                          opacity: hasFaces ? 0.28 + s.scores[key] * 0.62 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* timeline chart */}
              {phase === 'ready' && timeline.length > 1 && (
                <div className="glass rounded-[22px] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                      Emotion arc
                    </h3>
                    <button
                      onClick={exportCsv}
                      className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-white/60 transition-colors hover:text-white"
                    >
                      <Download size={10} aria-hidden="true" />
                      CSV
                    </button>
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timeline.map((s) => ({ t: s.t, ...s.scores }))}
                        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          if (state?.activeLabel != null && videoRef.current) {
                            videoRef.current.currentTime = Number(state.activeLabel);
                          }
                        }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                          dataKey="t"
                          tickFormatter={(v: number) => `${Math.round(v)}s`}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          stroke="rgba(255,255,255,0.12)"
                        />
                        <YAxis domain={[0, 1]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} stroke="rgba(255,255,255,0.12)" width={30} />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(10, 13, 28, 0.94)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14,
                            fontSize: 11,
                          }}
                          formatter={(value, name) => [
                            `${Math.round(Number(value) * 100)}%`,
                            EMOTIONS[name as EmotionKey].label,
                          ]}
                          labelFormatter={(label) => `at ${Math.round(Number(label))}s`}
                        />
                        {EMOTION_ORDER.map((key) => (
                          <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stackId="1"
                            stroke={EMOTIONS[key].color}
                            fill={EMOTIONS[key].color}
                            fillOpacity={0.13}
                            strokeWidth={1.4}
                            isAnimationActive={false}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* right rail */}
            <div className="flex flex-col gap-4">
              <div className="glass-strong edge-glow rounded-[26px] p-5">
                <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Overall reading
                </h3>
                {overallAvg ? (
                  <>
                    <DominantEmotion scores={overallAvg} size="lg" />
                    <div className="mt-5 flex flex-col gap-2">
                      {EMOTION_ORDER.map((key) => {
                        const meta = EMOTIONS[key];
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <span className="w-5 text-center text-sm" aria-hidden="true">{meta.emoji}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${overallAvg[key] * 100}%` }}
                                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                style={{ background: meta.color }}
                              />
                            </div>
                            <span className="w-9 text-right font-mono text-[10px] tabular-nums text-white/55">
                              {Math.round(overallAvg[key] * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <span className="text-4xl" aria-hidden="true">🎞️</span>
                    <p className="max-w-[220px] text-xs text-white/45">
                      Run a scan to see the video&apos;s overall emotional profile.
                    </p>
                  </div>
                )}
              </div>

              <div className="glass rounded-[26px] p-5">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Scan info</h3>
                <div className="mt-3 space-y-2 text-xs text-white/55">
                  <div className="flex justify-between">
                    <span>Samples</span>
                    <span className="font-semibold text-white/80">{timeline.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frames with faces</span>
                    <span className="font-semibold text-white/80">
                      {timeline.filter((s) => s.faces.length > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sample step</span>
                    <span className="font-semibold text-white/80">
                      {timeline.length > 1 && videoRef.current
                        ? `${((videoRef.current.duration || 0) / timeline.length).toFixed(2)}s`
                        : 'n/a'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

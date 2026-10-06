'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ImagePlus, Loader2, ScanFace, Trash2, X } from 'lucide-react';
import FeatureHeader from '@/components/ui/FeatureHeader';
import { EMOTIONS, dominantEmotion, type EmotionScores, emptyScores } from '@/lib/emotions';
import { detectFaces, loadVisionEngine, makeDetectorOptions, type DetectedFace, type VisionEngine } from '@/lib/vision';
import { downloadBlob, saveSession } from '@/lib/session';

interface AnalyzedImage {
  id: string;
  file: File;
  url: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  faces: DetectedFace[];
  width: number;
  height: number;
}

export default function ImageClient() {
  const [images, setImages] = useState<AnalyzedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [engineProgress, setEngineProgress] = useState<'idle' | 'loading' | 'ready'>('idle');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const engineRef = useRef<VisionEngine | null>(null);
  const imagesRef = useRef<AnalyzedImage[]>([]);
  imagesRef.current = images;

  const patchImage = useCallback((id: string, patch: Partial<AnalyzedImage>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }, []);

  const processQueue = useCallback(async () => {
    if (!engineRef.current) {
      setEngineProgress('loading');
      engineRef.current = await loadVisionEngine();
      setEngineProgress('ready');
    }
    const engine = engineRef.current;
    const options = makeDetectorOptions(engine);
    const processed: { name: string; faces: DetectedFace[] }[] = [];

    for (const img of imagesRef.current) {
      if (img.status !== 'queued') continue;
      patchImage(img.id, { status: 'processing' });
      try {
        const el = new Image();
        el.src = img.url;
        await el.decode();
        const faces = await detectFaces(engine, el, options);
        patchImage(img.id, { status: 'done', faces, width: el.naturalWidth, height: el.naturalHeight });
        processed.push({ name: img.file.name, faces });
      } catch {
        patchImage(img.id, { status: 'error' });
      }
    }
    return processed;
  }, [patchImage]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 12);
      if (list.length === 0) return;
      const entries: AnalyzedImage[] = list.map((file) => ({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
        status: 'queued',
        faces: [],
        width: 0,
        height: 0,
      }));
      setImages((prev) => [...prev, ...entries]);
      // save a session once the batch settles
      setTimeout(() => {
        void (async () => {
          try {
            const processed = await processQueue();
            const dist = emptyScores();
            let total = 0;
            for (const item of processed) {
              for (const face of item.faces) {
                dist[dominantEmotion(face.scores)] += 1;
                total += 1;
              }
            }
            if (total > 0) {
              // normalize counts into weights
              const norm = emptyScores();
              for (const key of Object.keys(norm) as (keyof EmotionScores)[]) norm[key] = dist[key] / total;
              saveSession({
                mode: 'image',
                startedAt: Date.now(),
                durationMs: 0,
                samples: total,
                distribution: norm,
                preview: `${processed.length} photo${processed.length > 1 ? 's' : ''} · ${total} face${total > 1 ? 's' : ''}`,
              });
            }
          } catch {
            /* engine load failure surfaces per-image */
          }
        })();
      }, 60);
    },
    [processQueue],
  );

  const downloadAnnotated = useCallback((img: AnalyzedImage) => {
    const el = new Image();
    el.src = img.url;
    void el.decode().then(() => {
      const out = document.createElement('canvas');
      out.width = el.naturalWidth;
      out.height = el.naturalHeight;
      const ctx = out.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(el, 0, 0);
      for (const face of img.faces) {
        const top = dominantEmotion(face.scores);
        const meta = EMOTIONS[top];
        const { x, y, width, height } = face.box;
        ctx.save();
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = Math.max(2, out.width / 400);
        ctx.shadowColor = `${meta.color}aa`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 12);
        ctx.stroke();
        ctx.restore();
        const label = `${meta.emoji} ${meta.label} ${Math.round(face.scores[top] * 100)}%`;
        ctx.font = `600 ${Math.max(14, out.width / 60)}px Outfit, sans-serif`;
        const padX = 10;
        const textW = ctx.measureText(label).width;
        const chipH = Math.max(24, out.height / 34);
        const chipY = Math.max(0, y - chipH - 6);
        ctx.fillStyle = 'rgba(6, 8, 18, 0.82)';
        ctx.beginPath();
        ctx.roundRect(x, chipY, textW + padX * 2, chipH, chipH / 2);
        ctx.fill();
        ctx.fillStyle = meta.color;
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + padX, chipY + chipH / 2);
      }
      out.toBlob((blob) => {
        if (blob) downloadBlob(blob, `moodlens-${img.file.name.replace(/\.[^.]+$/, '')}-annotated.png`);
      }, 'image/png');
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const totalFaces = images.reduce((acc, i) => acc + i.faces.length, 0);
  const anyProcessing = images.some((i) => i.status === 'queued' || i.status === 'processing');

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Photo Batch"
        title="Read an entire album at once"
        description="Drop in up to 12 photos. MoodLens finds every face in every picture and stamps each with its own emotion read — then you can download annotated copies."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-8">
        {/* dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`glass-strong edge-glow flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border-dashed px-6 py-12 text-center transition-all ${
            dragOver ? 'border-aurora-cyan/60 bg-aurora-cyan/[0.06]' : 'border-white/12 hover:border-white/25'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-cyan/25 to-aurora-violet/20 border border-white/10">
            {anyProcessing || engineProgress === 'loading' ? (
              <Loader2 size={24} className="animate-spin text-aurora-cyan" aria-hidden="true" />
            ) : (
              <ImagePlus size={24} className="text-white/80" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-display text-base font-bold text-white">
              {engineProgress === 'loading' ? 'Loading the vision engine…' : 'Drop photos here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-white/45">
              JPG / PNG / WebP · up to 12 at a time · analyzed locally, never uploaded
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* summary */}
        {images.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="glass rounded-full px-4 py-1.5 text-xs font-bold text-white/75">
              {images.length} photo{images.length > 1 ? 's' : ''} · {totalFaces} face{totalFaces !== 1 ? 's' : ''} found
            </span>
            {anyProcessing && (
              <span className="flex items-center gap-1.5 rounded-full border border-aurora-cyan/30 bg-aurora-cyan/10 px-4 py-1.5 text-xs font-bold text-aurora-cyan">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                Analyzing…
              </span>
            )}
            <button
              onClick={() => images.forEach((i) => removeImage(i.id))}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-xs font-bold text-white/60 transition-colors hover:text-white"
            >
              <Trash2 size={12} aria-hidden="true" />
              Clear all
            </button>
          </div>
        )}

        {/* results grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {images.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass group overflow-hidden rounded-[24px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.file.name} className="absolute inset-0 h-full w-full object-cover" />
                  {/* overlay boxes */}
                  {img.status === 'done' && (
                    <canvas
                      className="absolute inset-0 h-full w-full"
                      ref={(canvas) => {
                        if (!canvas) return;
                        const el = new Image();
                        el.src = img.url;
                        void el.decode().then(() => {
                          canvas.width = el.naturalWidth;
                          canvas.height = el.naturalHeight;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          for (const face of img.faces) {
                            const top = dominantEmotion(face.scores);
                            const meta = EMOTIONS[top];
                            const { x, y, width, height } = face.box;
                            ctx.save();
                            ctx.strokeStyle = meta.color;
                            ctx.lineWidth = 2.5;
                            ctx.shadowColor = `${meta.color}aa`;
                            ctx.shadowBlur = 10;
                            ctx.beginPath();
                            ctx.roundRect(x, y, width, height, 12);
                            ctx.stroke();
                            ctx.restore();
                          }
                        });
                      }}
                    />
                  )}
                  {img.status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60 backdrop-blur-[2px]">
                      <Loader2 size={22} className="animate-spin text-aurora-cyan" aria-hidden="true" />
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:text-white"
                    aria-label="Remove photo"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 p-3.5">
                  <p className="truncate text-xs font-semibold text-white/70">{img.file.name}</p>
                  {img.status === 'done' && (
                    <button
                      onClick={() => downloadAnnotated(img)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition-colors hover:text-white"
                      aria-label="Download annotated copy"
                    >
                      <Download size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {img.status === 'done' && (
                  <div className="flex flex-wrap gap-1.5 px-3.5 pb-3.5">
                    {img.faces.slice(0, 4).map((face, i) => {
                      const top = dominantEmotion(face.scores);
                      return (
                        <span
                          key={i}
                          className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            borderColor: `${EMOTIONS[top].color}55`,
                            color: EMOTIONS[top].color,
                            background: `${EMOTIONS[top].color}14`,
                          }}
                        >
                          {EMOTIONS[top].emoji} {EMOTIONS[top].label} {Math.round(face.scores[top] * 100)}%
                        </span>
                      );
                    })}
                    {img.faces.length === 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-white/40">
                        <ScanFace size={11} aria-hidden="true" /> no faces detected
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

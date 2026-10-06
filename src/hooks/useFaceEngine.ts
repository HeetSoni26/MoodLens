'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadVisionEngine,
  makeDetectorOptions,
  detectFaces,
  FaceSmoother,
  type DetectedFace,
  type VisionEngine,
} from '@/lib/vision';
import { dominantEmotion, type EmotionKey, type EmotionScores, emptyScores } from '@/lib/emotions';

export interface EngineStats {
  fps: number;
  latencyMs: number;
  faces: number;
  dropped: number;
}

export type EngineStatus = 'idle' | 'loading-model' | 'starting-camera' | 'running' | 'error' | 'stopped';

interface UseFaceEngineOptions {
  targetFps?: number;
  smoothing?: boolean;
}

const SAMPLE_INTERVAL_MS = 500;

/* Drives the whole live pipeline: camera → detection loop → stats.
   Drawing is delegated to a per-frame draw callback so pages can render
   their own overlay style. */
export function useFaceEngine({ targetFps = 12, smoothing = true }: UseFaceEngineOptions = {}) {
  const [status, setStatus] = useState<EngineStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [stats, setStats] = useState<EngineStats>({ fps: 0, latencyMs: 0, faces: 0, dropped: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<VisionEngine | null>(null);
  const smootherRef = useRef(new FaceSmoother());
  const runningRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const configRef = useRef({ targetFps, smoothing });
  const drawRef = useRef<((faces: DetectedFace[], meta: { mirrored: boolean }) => void) | null>(null);

  /* recording journal */
  const recordingRef = useRef({ active: false, startedAt: 0, counts: emptyScores(), samples: 0 });
  const [recording, setRecording] = useState(false);

  configRef.current = { targetFps, smoothing };

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => loop());
      return;
    }

    let lastDetect = performance.now();
    let lastEma = lastDetect;
    let lastStats = lastDetect;
    let latencyEma = 0;
    let fpsEma = 0;
    let dropped = 0;
    let busy = false;
    let lastSample = 0;
    let latest: DetectedFace[] = [];

    const tick = async () => {
      if (!runningRef.current) return;
      const now = performance.now();

      // fps ema (frame loop rate)
      const frameDt = now - lastEma;
      if (frameDt > 0) fpsEma = fpsEma * 0.92 + (1000 / frameDt) * 0.08;
      lastEma = now;

      const interval = 1000 / configRef.current.targetFps;
      if (!busy && now - lastDetect >= interval) {
        busy = true;
        lastDetect = now;
        const t0 = performance.now();
        try {
          const raw = await detectFaces(engine, video, makeDetectorOptions(engine));
          const result = configRef.current.smoothing ? smootherRef.current.smooth(raw) : raw;
          latencyEma = latencyEma * 0.85 + (performance.now() - t0) * 0.15;
          latest = result;

          // mirror-aware draw
          drawRef.current?.(result, { mirrored: true });
          setFaces(result);

          // sampling for the session journal + chart
          if (recordingRef.current.active && now - lastSample >= SAMPLE_INTERVAL_MS) {
            lastSample = now;
            const rec = recordingRef.current;
            for (const face of result) {
              const top = dominantEmotion(face.scores);
              rec.counts[top] += 1;
            }
            if (result.length > 0) rec.samples += 1;
          }
        } catch {
          dropped += 1;
        }
        busy = false;
      }

      if (now - lastStats >= 250) {
        lastStats = now;
        setStats({
          fps: Math.round(fpsEma * 10) / 10,
          latencyMs: Math.round(latencyEma),
          faces: latest.length,
          dropped,
        });
      }

      rafRef.current = requestAnimationFrame(() => void tick());
    };

    void tick();
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    smootherRef.current.reset();
    drawRef.current?.([], { mirrored: true });
    setFaces([]);
    setRecording(false);
    setStatus('stopped');
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    try {
      setStatus('starting-camera');
      setStatusMessage('Requesting camera access…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error('Video element is not mounted');
      video.srcObject = stream;
      await video.play();

      if (!engineRef.current) {
        setStatus('loading-model');
        setStatusMessage('Loading neural networks…');
        engineRef.current = await loadVisionEngine();
      }

      smootherRef.current.reset();
      runningRef.current = true;
      setStatus('running');
      setStats({ fps: 0, latencyMs: 0, faces: 0, dropped: 0 });
      loop();
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      runningRef.current = false;
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access and try again.'
          : err instanceof Error
            ? err.message
            : 'Failed to start the camera';
      setStatus('error');
      setStatusMessage(msg);
    }
  }, [loop]);

  /* journal controls */
  const startRecording = useCallback(() => {
    recordingRef.current = { active: true, startedAt: Date.now(), counts: emptyScores(), samples: 0 };
    setRecording(true);
  }, []);

  const stopRecording = useCallback((): {
    startedAt: number;
    durationMs: number;
    samples: number;
    distribution: EmotionScores;
    dominant: EmotionKey;
  } | null => {
    const rec = recordingRef.current;
    recordingRef.current = { active: false, startedAt: 0, counts: emptyScores(), samples: 0 };
    setRecording(false);
    if (rec.samples === 0) return null;
    return {
      startedAt: rec.startedAt,
      durationMs: Date.now() - rec.startedAt,
      samples: rec.samples,
      distribution: rec.counts,
      dominant: dominantEmotion(rec.counts),
    };
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    videoRef,
    status,
    statusMessage,
    faces,
    stats,
    recording,
    drawRef,
    start,
    stop,
    startRecording,
    stopRecording,
  };
}

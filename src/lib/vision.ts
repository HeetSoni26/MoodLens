import type {
  FaceDetectionOptions,
  TinyFaceDetectorOptions,
} from '@vladmandic/face-api';
import { FACE_EXPRESSION_MAP, type EmotionKey, type EmotionScores, emptyScores } from './emotions';

/* Client-side vision engine built on @vladmandic/face-api (TensorFlow.js).
   Models are self-hosted from /public/models/faceapi, nothing ever leaves
   the device. Only two models are needed: TinyFaceDetector (localization)
   and FaceExpressionNet (7-class expression probabilities). */

export type VisionEngine = typeof import('@vladmandic/face-api');

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  scores: EmotionScores;
}

let enginePromise: Promise<VisionEngine> | null = null;

export function loadVisionEngine(): Promise<VisionEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models/faceapi'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models/faceapi'),
      ]);
      return faceapi;
    })().catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

export function makeDetectorOptions(engine: VisionEngine): TinyFaceDetectorOptions {
  return new engine.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 });
}

interface RawFace {
  detection: { box: { x: number; y: number; width: number; height: number }; score: number };
  expressions: Record<string, number>;
}

export async function detectFaces(
  engine: VisionEngine,
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options: FaceDetectionOptions,
): Promise<DetectedFace[]> {
  const results = (await engine
    .detectAllFaces(input, options)
    .withFaceExpressions()) as unknown as RawFace[];

  return results.map((face) => {
    const scores = emptyScores();
    for (const [expr, value] of Object.entries(face.expressions ?? {})) {
      const key = FACE_EXPRESSION_MAP[expr];
      if (key) scores[key] = value;
    }
    return {
      box: face.detection.box,
      score: face.detection.score,
      scores,
    };
  });
}

/* Exponential moving average smoother, keeps bars & boxes calm without
   freezing genuine changes (alpha 0.4 ≈ ~3 frame settle time). */
const SMOOTH_ALPHA = 0.4;

export class FaceSmoother {
  private prev: DetectedFace[] = [];

  reset() {
    this.prev = [];
  }

  smooth(faces: DetectedFace[]): DetectedFace[] {
    const smoothed = faces.map((face, i) => {
      const p = this.prev[i];
      if (!p) return face;
      const lerp = (a: number, b: number) => a + (b - a) * SMOOTH_ALPHA;
      const scores = { ...face.scores };
      for (const key of Object.keys(scores) as EmotionKey[]) {
        scores[key] = lerp(p.scores[key], face.scores[key]);
      }
      return {
        box: {
          x: lerp(p.box.x, face.box.x),
          y: lerp(p.box.y, face.box.y),
          width: lerp(p.box.width, face.box.width),
          height: lerp(p.box.height, face.box.height),
        },
        score: lerp(p.score, face.score),
        scores,
      };
    });
    this.prev = smoothed;
    return smoothed;
  }
}

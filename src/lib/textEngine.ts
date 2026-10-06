import { TEXT_LABEL_MAP, type EmotionKey, type EmotionScores, emptyScores } from './emotions';

/* Client-side text emotion engine. Uses a quantized (int8) DistilRoBERTa
   model fine-tuned on 7 emotion classes, executed fully in-browser via
   transformers.js (ONNX Runtime WASM). The ~79 MB model is downloaded once
   and cached by the browser; no text ever leaves the device. */

export interface TextEngineProgress {
  status: 'init' | 'download' | 'ready' | 'error';
  progress?: number; // 0..1
  message?: string;
}

export interface TextPrediction {
  key: EmotionKey;
  label: string;
  score: number;
}

const MODEL_ID = 'onnx-community/emotion-english-distilroberta-base-ONNX';

type Classifier = (
  text: string,
  opts?: Record<string, unknown>,
) => Promise<{ label: string; score: number }[]>;

let enginePromise: Promise<Classifier> | null = null;

export function loadTextEngine(
  onProgress?: (p: TextEngineProgress) => void,
): Promise<Classifier> {
  if (!enginePromise) {
    enginePromise = (async () => {
      try {
        onProgress?.({ status: 'init' });
        const { pipeline, env } = await import('@huggingface/transformers');
        env.allowLocalModels = false;
        const pipe = await pipeline('text-classification', MODEL_ID, {
          dtype: 'q8',
          progress_callback: (info: { status?: string; progress?: number }) => {
            if (info?.status === 'progress' && typeof info.progress === 'number') {
              onProgress?.({ status: 'download', progress: info.progress / 100 });
            }
          },
        });
        onProgress?.({ status: 'ready' });
        return ((text: string, opts?: Record<string, unknown>) =>
          pipe(text, opts)) as Classifier;
      } catch (err) {
        enginePromise = null;
        onProgress?.({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load the model',
        });
        throw err;
      }
    })();
  }
  return enginePromise;
}

export async function classifyText(text: string): Promise<TextPrediction[]> {
  const classify = await loadTextEngine();
  const raw = await classify(text, { top_k: 7 });
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((r) => ({
      key: TEXT_LABEL_MAP[r.label] ?? ('neutral' as EmotionKey),
      label: r.label,
      score: r.score,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function classifyTextScores(text: string): Promise<EmotionScores> {
  const preds = await classifyText(text);
  const scores = emptyScores();
  for (const p of preds) scores[p.key] = p.score;
  return scores;
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, SendHorizontal, Sparkles, Trash2 } from 'lucide-react';
import EmotionBars, { DominantEmotion } from '@/components/ui/EmotionBars';
import FeatureHeader from '@/components/ui/FeatureHeader';
import { classifyText, loadTextEngine, type TextEngineProgress, type TextPrediction } from '@/lib/textEngine';
import { dominantEmotion, type EmotionScores, emptyScores } from '@/lib/emotions';
import { saveSession } from '@/lib/session';

const EXAMPLES = [
  'I just got the job offer I have been dreaming about for months!!',
  'Honestly this is the worst experience I have ever had with support.',
  'The movie was okay I guess, nothing really special either way.',
  'I can’t believe they announced a sequel, nobody saw that coming!',
  'Walking home alone at night through that alley felt terrifying.',
];

interface SentenceResult {
  text: string;
  scores: EmotionScores;
}

export default function TextClient() {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState<TextEngineProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<TextPrediction[] | null>(null);
  const [sentences, setSentences] = useState<SentenceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleAnalyze = useCallback(async () => {
    const input = text.trim();
    if (!input || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setSaved(false);
    try {
      await loadTextEngine(setProgress);
      const preds = await classifyText(input);
      setResults(preds);

      // per-sentence breakdown for longer inputs
      const parts = input
        .split(/(?<=[.!?…])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .slice(0, 12);
      if (parts.length > 1) {
        const per: SentenceResult[] = [];
        for (const part of parts) {
          const p = await classifyText(part);
          const scores = emptyScores();
          for (const item of p) scores[item.key] = item.score;
          per.push({ text: part, scores });
        }
        setSentences(per);
      } else {
        setSentences([]);
      }

      const scores = emptyScores();
      for (const p of preds) scores[p.key] = p.score;
      saveSession({
        mode: 'text',
        startedAt: Date.now(),
        durationMs: 0,
        samples: 1,
        distribution: scores,
        preview: input.slice(0, 80),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while analyzing.');
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, text]);

  const overall: EmotionScores | null = results
    ? (() => {
        const s = emptyScores();
        for (const r of results) s[r.key] = r.score;
        return s;
      })()
    : null;

  const modelReady = progress?.status === 'ready';

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Text Emotions"
        title="What do your words feel like?"
        description="Paste a message, email, review or journal entry. A quantized DistilRoBERTa transformer runs right here in your browser and reads the emotion behind the words."
      />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-5 pt-8 lg:grid-cols-[1fr_380px]">
        {/* ─── Input ─── */}
        <div className="flex flex-col gap-4">
          <div className="glass-strong edge-glow flex flex-col rounded-[26px] p-5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste anything: a tweet, a review, a message from a friend…"
              rows={8}
              maxLength={2000}
              className="w-full flex-1 resize-none rounded-2xl border border-white/[0.08] bg-ink-900/70 p-4 text-sm leading-relaxed text-white/90 placeholder:text-white/30 outline-none transition-colors focus:border-aurora-violet/50"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !text.trim()}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan px-6 py-2.5 text-xs font-bold text-ink-950 shadow-[0_8px_26px_-8px_rgba(139,92,246,0.7)] transition-all hover:shadow-[0_12px_34px_-8px_rgba(34,211,238,0.5)] active:scale-95 disabled:opacity-40"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <SendHorizontal size={14} aria-hidden="true" />}
                {analyzing ? 'Reading…' : 'Analyze Emotion'}
              </button>
              <button
                onClick={() => {
                  setText('');
                  setResults(null);
                  setSentences([]);
                }}
                disabled={!text || analyzing}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition-all hover:text-white active:scale-95 disabled:opacity-40"
              >
                <Trash2 size={13} aria-hidden="true" />
                Clear
              </button>
              <span className="ml-auto text-[11px] font-semibold tabular-nums text-white/35">
                {text.length}/2000
              </span>
            </div>
          </div>

          {/* model download progress */}
          {progress && progress.status !== 'ready' && progress.status !== 'error' && (
            <div className="glass rounded-[22px] p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-display font-bold text-white/80">
                  {progress.status === 'init' ? 'Preparing neural engine…' : 'Downloading emotion model (one-time, ~79 MB)'}
                </span>
                {typeof progress.progress === 'number' && (
                  <span className="font-mono tabular-nums text-aurora-cyan">{Math.round(progress.progress * 100)}%</span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan"
                  animate={{ width: `${Math.round((progress.progress ?? 0) * 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                The model is cached by your browser, so next time it loads instantly, fully offline.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-[22px] border border-mood-angry/30 bg-mood-angry/10 p-4 text-sm text-mood-angry">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{error}. Check your connection; the model needs to be fetched once from the Hugging Face hub.</span>
            </div>
          )}

          {/* example prompts */}
          {!results && (
            <div className="glass rounded-[22px] p-4">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Try an example</h3>
              <div className="mt-3 flex flex-col gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setText(ex);
                      textareaRef.current?.focus();
                    }}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-left text-xs text-white/60 transition-all hover:border-white/15 hover:text-white/90"
                  >
                    “{ex}”
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* per-sentence breakdown */}
          {sentences.length > 0 && (
            <div className="glass rounded-[22px] p-5">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                Sentence by sentence
              </h3>
              <div className="mt-4 flex flex-col gap-3">
                {sentences.map((s, i) => {
                  const top = dominantEmotion(s.scores);
                  const meta = { happy: '😊', neutral: '😐', sad: '😢', angry: '😠', fear: '😨', disgust: '🤢', surprise: '😲' }[top];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
                    >
                      <span className="text-lg leading-none" aria-hidden="true">{meta}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-white/75">{s.text}</p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(s.scores[top] * 100)}%`,
                              background: { happy: '#34d399', neutral: '#94a3b8', sad: '#60a5fa', angry: '#f87171', fear: '#c084fc', disgust: '#fbbf24', surprise: '#f472b6' }[top],
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── Results ─── */}
        <div className="flex flex-col gap-4">
          <div className="glass-strong edge-glow rounded-[26px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Reading</h3>
              {saved && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-mood-happy">
                  <Sparkles size={11} aria-hidden="true" />
                  Saved
                </span>
              )}
            </div>
            {overall ? (
              <>
                <DominantEmotion scores={overall} size="lg" />
                <div className="mt-5">
                  <EmotionBars scores={overall} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="text-4xl" aria-hidden="true">💬</span>
                <p className="max-w-[240px] text-xs leading-relaxed text-white/45">
                  The emotion breakdown will appear here once you analyze your text.
                </p>
              </div>
            )}
          </div>

          <div className="glass rounded-[26px] p-5">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">Model</h3>
            <div className="mt-3 space-y-2 text-xs text-white/55">
              <div className="flex justify-between">
                <span>Architecture</span>
                <span className="font-semibold text-white/80">DistilRoBERTa</span>
              </div>
              <div className="flex justify-between">
                <span>Precision</span>
                <span className="font-semibold text-white/80">int8 quantized</span>
              </div>
              <div className="flex justify-between">
                <span>Runtime</span>
                <span className="font-semibold text-white/80">ONNX · WASM</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className={`font-semibold ${modelReady ? 'text-mood-happy' : 'text-white/60'}`}>
                  {modelReady ? 'Ready' : 'Not loaded yet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

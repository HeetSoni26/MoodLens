'use client';

import { motion } from 'framer-motion';
import { EMOTIONS, EMOTION_ORDER, fmtPct, sortedScores, type EmotionScores } from '@/lib/emotions';

/* Sorted probability bars with spring animation. */
export default function EmotionBars({
  scores,
  compact = false,
  animate = true,
}: {
  scores: EmotionScores;
  compact?: boolean;
  animate?: boolean;
}) {
  const sorted = sortedScores(scores);
  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
      {sorted.map(({ key, value }, idx) => {
        const meta = EMOTIONS[key];
        const pct = Math.max(0, Math.min(1, value));
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span className={compact ? 'w-5 text-center text-sm' : 'w-6 text-center text-base'} aria-hidden="true">
              {meta.emoji}
            </span>
            <span className={`w-16 shrink-0 font-display font-semibold ${compact ? 'text-[10px]' : 'text-xs'} text-white/70`}>
              {meta.label}
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${meta.color}cc, ${meta.color})`,
                  boxShadow: `0 0 12px ${meta.color}66`,
                }}
                initial={animate ? { width: 0 } : false}
                animate={{ width: `${pct * 100}%` }}
                transition={{ type: 'spring', stiffness: 130, damping: 22, delay: animate ? idx * 0.03 : 0 }}
              />
            </div>
            <span className={`w-9 text-right font-mono ${compact ? 'text-[10px]' : 'text-[11px]'} tabular-nums text-white/60`}>
              {fmtPct(pct)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Big dominant-emotion display with emoji + aura ring. */
export function DominantEmotion({
  scores,
  size = 'md',
}: {
  scores: EmotionScores;
  size?: 'md' | 'lg';
}) {
  const sorted = sortedScores(scores);
  const top = sorted[0]?.key ?? 'neutral';
  const meta = EMOTIONS[top];
  const pct = sorted[0]?.value ?? 0;
  return (
    <div className="flex items-center gap-4">
      <motion.div
        key={top}
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className={`relative flex items-center justify-center rounded-full ${size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'}`}
        style={{ background: `${meta.color}1f`, border: `1px solid ${meta.color}55`, boxShadow: `0 0 34px ${meta.color}40` }}
      >
        <span className={size === 'lg' ? 'text-4xl' : 'text-2xl'} aria-hidden="true">{meta.emoji}</span>
      </motion.div>
      <div>
        <div className={`font-display font-bold tracking-tight text-white ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
          {meta.label}
        </div>
        <div className="text-xs font-semibold text-white/55">
          {meta.label === 'Neutral' ? 'Composure' : 'Confidence'} {fmtPct(pct)}
        </div>
      </div>
    </div>
  );
}

export { EMOTION_ORDER };

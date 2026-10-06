'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EMOTIONS, EMOTION_ORDER } from '@/lib/emotions';

/* Animated hero centerpiece: a glass orb whose core cycles through the
   seven emotions, surrounded by orbiting emoji chips and a conic aura ring. */
export default function MoodOrb() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((v) => (v + 1) % EMOTION_ORDER.length), 2100);
    return () => clearInterval(t);
  }, []);

  const current = EMOTIONS[EMOTION_ORDER[idx]];

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[380px] items-center justify-center">
      {/* conic aura ring */}
      <div
        className="absolute inset-0 rounded-full animate-spin-slow opacity-80"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.55) 18%, transparent 36%, rgba(34,211,238,0.5) 58%, transparent 74%, rgba(244,63,94,0.42) 92%, transparent 100%)',
          maskImage: 'radial-gradient(circle, transparent 62%, black 66%, black 72%, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 66%, black 72%, transparent 76%)',
        }}
        aria-hidden="true"
      />

      {/* orbiting emotion chips */}
      {EMOTION_ORDER.map((key, i) => {
        const meta = EMOTIONS[key];
        const angle = (i / EMOTION_ORDER.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 46;
        const y = Math.sin(angle) * 46;
        return (
          <motion.span
            key={key}
            className="glass absolute flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ left: `${50 + x}%`, top: `${50 + y}%`, translate: '-50% -50%' }}
            animate={{ y: [0, -7, 0], opacity: key === current.key ? 1 : 0.55 }}
            transition={{
              y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 },
              opacity: { duration: 0.5 },
            }}
            aria-hidden="true"
          >
            {meta.emoji}
          </motion.span>
        );
      })}

      {/* core orb */}
      <motion.div
        className="glass-strong relative flex h-[52%] w-[52%] items-center justify-center rounded-full"
        animate={{
          boxShadow: [
            `0 0 60px ${current.color}30`,
            `0 0 90px ${current.color}55`,
            `0 0 60px ${current.color}30`,
          ],
        }}
        transition={{ duration: 2.1, ease: 'easeInOut' }}
      >
        <motion.span
          key={current.key}
          initial={{ scale: 0.4, opacity: 0, rotate: -14 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 15 }}
          className="text-[5.5rem] leading-none"
          aria-hidden="true"
        >
          {current.emoji}
        </motion.span>
        {/* glass highlight */}
        <span
          className="pointer-events-none absolute inset-x-6 top-4 h-10 rounded-full opacity-60"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.16), transparent)' }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  );
}

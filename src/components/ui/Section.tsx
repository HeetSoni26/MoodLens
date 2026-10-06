'use client';

import { motion } from 'framer-motion';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: 'center' | 'left';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : 'items-start text-left'}`}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-aurora-violet/25 bg-aurora-violet/[0.08] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4b5fd]">
        {eyebrow}
      </span>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">{description}</p>
      )}
    </motion.div>
  );
}

export function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="glass edge-glow flex min-w-[130px] flex-1 flex-col items-center gap-0.5 rounded-2xl px-5 py-4"
    >
      <span className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</span>
    </motion.div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

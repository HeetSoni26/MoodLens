'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  FileVideo,
  Gauge,
  LayoutDashboard,
  MessageCircleHeart,
  Mic,
  ScanFace,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import MoodOrb from '@/components/ui/MoodOrb';
import { Reveal, SectionHeading, StatChip } from '@/components/ui/Section';

const FEATURES = [
  {
    icon: ScanFace,
    href: '/live',
    title: 'Live Detection',
    desc: 'Real-time webcam emotion reading with smooth multi-face tracking, glowing mood boxes and live probability bars.',
    accent: 'from-mood-happy/25 to-transparent',
    tag: '7 emotions · 30+ FPS',
  },
  {
    icon: Camera,
    href: '/image',
    title: 'Photo Batch',
    desc: 'Drop a whole album — every face in every photo gets its own emotion read, crop and confidence score.',
    accent: 'from-aurora-cyan/25 to-transparent',
    tag: 'Batch upload',
  },
  {
    icon: FileVideo,
    href: '/video',
    title: 'Video Timeline',
    desc: 'Upload a clip and watch its emotional arc charted second by second, synced to the player as a heat strip.',
    accent: 'from-aurora-rose/25 to-transparent',
    tag: 'Emotion arc',
  },
  {
    icon: MessageCircleHeart,
    href: '/text',
    title: 'Text Emotions',
    desc: 'Paste a message, review or journal entry — a real transformer model reads the feeling behind the words.',
    accent: 'from-mood-fear/25 to-transparent',
    tag: 'Transformer NLP',
  },
  {
    icon: Mic,
    href: '/voice',
    title: 'Voice Fusion',
    desc: 'Speak your mind and MoodLens reads your words and your face at the same time — then compares the two.',
    accent: 'from-mood-surprise/25 to-transparent',
    tag: 'Say it vs show it',
  },
  {
    icon: LayoutDashboard,
    href: '/dashboard',
    title: 'Mood Dashboard',
    desc: 'Every session lands in a private journal with aggregate charts, streaks and one-click JSON/CSV export.',
    accent: 'from-mood-sad/25 to-transparent',
    tag: 'Exportable reports',
  },
] as const;

const STEPS = [
  {
    icon: Sparkles,
    title: 'Pick a mode',
    desc: 'Camera, photos, video, text or voice — each one runs a purpose-built emotion pipeline.',
  },
  {
    icon: Gauge,
    title: 'AI runs on your device',
    desc: 'Neural networks execute in your browser with WebGL/WASM acceleration. No servers, no queues.',
  },
  {
    icon: LayoutDashboard,
    title: 'Track & export',
    desc: 'Sessions land in your private dashboard with charts, streaks and downloadable reports.',
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-5 pb-20 pt-32 sm:pt-40 lg:flex-row lg:items-center lg:gap-14">
        <div className="flex flex-1 flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c4b5fd]"
          >
            <ShieldCheck size={13} className="text-mood-happy" aria-hidden="true" />
            100% on-device emotion AI
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]"
          >
            Read the room.
            <br />
            <span className="text-aurora">Read the feelings.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            MoodLens reads emotions from your face, your words, photos and videos — all inside
            your browser. Seven emotions, five senses, zero uploads.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href="/live"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan px-6 py-3 text-sm font-bold text-ink-950 shadow-[0_10px_36px_-8px_rgba(139,92,246,0.65)] transition-all hover:shadow-[0_14px_44px_-8px_rgba(34,211,238,0.55)] active:scale-95"
            >
              Start Live Detection
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/text"
              className="glass flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white/85 transition-all hover:border-white/25 hover:text-white active:scale-95"
            >
              <MessageCircleHeart size={15} aria-hidden="true" />
              Try Text Emotions
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[380px] flex-1"
        >
          <MoodOrb />
        </motion.div>
      </section>

      {/* ─── Stats band ─── */}
      <section className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-3 px-5 pb-24">
        <StatChip value="7" label="Emotion classes" />
        <StatChip value="5" label="Input senses" />
        <StatChip value="30+" label="FPS on device" />
        <StatChip value="0" label="Bytes uploaded" />
        <StatChip value="100%" label="Private" />
      </section>

      {/* ─── Feature grid ─── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-28">
        <SectionHeading
          eyebrow="Five senses, one lens"
          title={<>Every way to read a mood</>}
          description="Each mode is a complete pipeline — from raw pixels or plain words to calibrated emotion probabilities, visualized in real time."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, href, title, desc, accent, tag }, i) => (
            <Reveal key={href} delay={i * 0.06}>
              <Link
                href={href}
                className="glass group flex h-full flex-col gap-4 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_24px_60px_-20px_rgba(139,92,246,0.4)]"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${accent}`}>
                  <Icon size={20} className="text-white/90" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold tracking-tight text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{desc}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                    {tag}
                  </span>
                  <ArrowRight size={15} className="text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-aurora-cyan" aria-hidden="true" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-28">
        <SectionHeading
          eyebrow="How it works"
          title="Neural nets in your browser, not the cloud"
          description="MoodLens ships compact quantized neural networks straight to your browser. They run on your GPU via WebGL — private, instant and free to use."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="glass edge-glow relative h-full rounded-3xl p-7">
                <span className="font-display absolute right-6 top-5 text-5xl font-bold text-white/[0.05]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-violet/30 to-aurora-cyan/20 border border-white/10">
                  <Icon size={19} className="text-aurora-cyan" aria-hidden="true" />
                </div>
                <h3 className="font-display text-base font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Privacy strip ─── */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-28">
        <Reveal>
          <div className="glass-strong edge-glow relative overflow-hidden rounded-[32px] p-8 sm:p-12">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.5), transparent 65%)', filter: 'blur(30px)' }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-start gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mood-happy/15 border border-mood-happy/30">
                <ShieldCheck size={22} className="text-mood-happy" aria-hidden="true" />
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Your face never leaves this device.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
                Unlike cloud emotion APIs, MoodLens has no backend to send anything to. Every frame,
                word and waveform is analyzed locally and disappears when you close the tab. Only
                anonymous emotion summaries (never raw data) are stored — in your own browser, and
                only if you let them.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="mx-auto w-full max-w-4xl px-5 pb-28 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Curious what your face says?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
            Turn on the camera and watch MoodLens read you in real time — or start with a sentence you wrote today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/live"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan px-7 py-3.5 text-sm font-bold text-ink-950 shadow-[0_10px_36px_-8px_rgba(139,92,246,0.65)] transition-all hover:shadow-[0_14px_44px_-8px_rgba(34,211,238,0.55)] active:scale-95"
            >
              Open Live Detection
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="glass rounded-full px-7 py-3.5 text-sm font-bold text-white/85 transition-all hover:border-white/25 hover:text-white active:scale-95"
            >
              View Dashboard
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

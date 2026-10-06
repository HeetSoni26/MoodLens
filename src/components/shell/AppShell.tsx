'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Camera,
  FileVideo,
  LayoutDashboard,
  Menu,
  MessageCircleHeart,
  Mic,
  ScanFace,
  X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/live', label: 'Live', icon: ScanFace },
  { href: '/image', label: 'Photo', icon: Camera },
  { href: '/video', label: 'Video', icon: FileVideo },
  { href: '/text', label: 'Text', icon: MessageCircleHeart },
  { href: '/voice', label: 'Voice', icon: Mic },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
] as const;

export function MoodLensLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 select-none" aria-label="MoodLens home">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-violet via-[#6d28d9] to-aurora-cyan shadow-[0_0_24px_rgba(139,92,246,0.45)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
        <span className="absolute inset-[3px] rounded-[13px] bg-ink-900/80" />
        <Activity size={16} className="relative text-aurora-cyan" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Mood<span className="text-aurora">Lens</span>
        </span>
      )}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Floating glass navigation */}
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
        className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4"
      >
        <nav className="glass-strong edge-glow flex w-full max-w-3xl items-center justify-between gap-2 rounded-full py-2 pl-4 pr-2 sm:pl-5">
          <MoodLensLogo />

          {/* Desktop links */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${
                    active ? 'text-ink-950' : 'text-white/65 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={13} className="relative" aria-hidden="true" />
                  <span className="relative">{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/HeetSoni26/MoodLens"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-all hover:border-white/25 hover:text-white sm:flex"
              aria-label="MoodLens on GitHub"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:text-white lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </nav>

        {/* Mobile sheet */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong absolute inset-x-3 top-[64px] rounded-3xl p-2 lg:hidden"
            >
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Page transitions */}
      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="flex min-h-dvh flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/[0.06] py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-white/45 sm:flex-row">
          <div className="flex items-center gap-2">
            <MoodLensLogo compact />
            <span>© {new Date().getFullYear()} MoodLens · Built by Heet Soni</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-mood-happy animate-pulse-soft" aria-hidden="true" />
            <span>100% on-device · your data never leaves this browser</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

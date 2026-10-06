import type { EmotionKey, EmotionScores } from './emotions';
import { dominantEmotion, emptyScores } from './emotions';

/* Lightweight session journal persisted to localStorage. Every analysis run
   (live, photo, video, text, voice) can record a summary that the dashboard
   aggregates. Kept deliberately small — only aggregated emotion data, never
   raw frames or text. */

export type SessionMode = 'live' | 'image' | 'video' | 'text' | 'voice';

export interface MoodSession {
  id: string;
  mode: SessionMode;
  startedAt: number; // epoch ms
  durationMs: number;
  samples: number;
  dominant: EmotionKey;
  distribution: EmotionScores; // averaged weights or counts, per emotion
  preview?: string; // short label of what was analyzed (text snippet, file name…)
}

const STORAGE_KEY = 'moodlens.sessions.v1';
const CHANGE_EVENT = 'moodlens:sessions-changed';
const MAX_SESSIONS = 60;

function safeRead(): MoodSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(sessions: MoodSession[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* storage full or unavailable — journal is best-effort */
  }
}

export function onSessionsChanged(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function getSessions(): MoodSession[] {
  return safeRead().sort((a, b) => b.startedAt - a.startedAt);
}

export function saveSession(input: Omit<MoodSession, 'id' | 'dominant'> & { dominant?: EmotionKey }): MoodSession {
  const distribution = { ...emptyScores(), ...input.distribution };
  const session: MoodSession = {
    ...input,
    distribution,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    dominant: input.dominant ?? dominantEmotion(distribution),
  };
  safeWrite([session, ...safeRead()]);
  return session;
}

export function clearSessions() {
  safeWrite([]);
}

/* ── Aggregations for the dashboard ── */

export function aggregateDistribution(sessions: MoodSession[]): EmotionScores {
  const total = { ...emptyScores() };
  for (const s of sessions) {
    for (const key of Object.keys(total) as EmotionKey[]) {
      total[key] += s.distribution[key] ?? 0;
    }
  }
  const sum = Object.values(total).reduce((a, b) => a + b, 0) || 1;
  for (const key of Object.keys(total) as EmotionKey[]) total[key] /= sum;
  return total;
}

export function streakDays(sessions: MoodSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // Walk back from today, skipping days with no entry, count consecutive set members.
  for (;;) {
    const key = cursor.toDateString();
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && days.size > 0) {
      // allow streak to start yesterday
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(cursor.toDateString())) break;
    } else break;
  }
  return streak;
}

export function exportSessionsJson(sessions: MoodSession[]) {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `moodlens-sessions-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportSessionsCsv(sessions: MoodSession[]) {
  const header = 'id,mode,startedAt,durationMs,samples,dominant,happy,neutral,sad,angry,fear,disgust,surprise,preview';
  const rows = sessions.map((s) => {
    const d = s.distribution;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [
      s.id,
      s.mode,
      new Date(s.startedAt).toISOString(),
      s.durationMs,
      s.samples,
      s.dominant,
      (d.happy ?? 0).toFixed(4),
      (d.neutral ?? 0).toFixed(4),
      (d.sad ?? 0).toFixed(4),
      (d.angry ?? 0).toFixed(4),
      (d.fear ?? 0).toFixed(4),
      (d.disgust ?? 0).toFixed(4),
      (d.surprise ?? 0).toFixed(4),
      esc((s.preview ?? '').slice(0, 80)),
    ].join(',');
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  downloadBlob(blob, `moodlens-sessions-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

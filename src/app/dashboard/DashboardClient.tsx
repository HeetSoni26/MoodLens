'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Clapperboard,
  Download,
  FileVideo,
  ImagePlus,
  MessageCircleHeart,
  Mic,
  ScanFace,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import FeatureHeader from '@/components/ui/FeatureHeader';
import {
  aggregateDistribution,
  clearSessions,
  exportSessionsCsv,
  exportSessionsJson,
  getSessions,
  onSessionsChanged,
  type MoodSession,
  type SessionMode,
} from '@/lib/session';
import { EMOTIONS, EMOTION_ORDER, type EmotionKey } from '@/lib/emotions';

const MODE_META: Record<SessionMode, { label: string; icon: typeof Camera }> = {
  live: { label: 'Live', icon: ScanFace },
  image: { label: 'Photo', icon: ImagePlus },
  video: { label: 'Video', icon: FileVideo },
  text: { label: 'Text', icon: MessageCircleHeart },
  voice: { label: 'Voice', icon: Mic },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function DashboardClient() {
  const [sessions, setSessions] = useState<MoodSession[]>([]);
  const [confirmedClear, setConfirmedClear] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
    return onSessionsChanged(() => setSessions(getSessions()));
  }, []);

  const dist = aggregateDistribution(sessions);
  const totalFaces = sessions.reduce((a, s) => a + s.samples, 0);
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + s.durationMs, 0) / 60000);

  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const key = new Date(s.startedAt).toISOString().slice(5, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const out: { day: string; count: number }[] = [];
    const cursor = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      out.push({ day: key, count: counts.get(key) ?? 0 });
    }
    return out;
  }, [sessions]);

  const pieData = EMOTION_ORDER.map((key) => ({
    name: EMOTIONS[key].label,
    value: Math.max(dist[key], 0.0001),
    color: EMOTIONS[key].color,
  })).filter((d) => d.value > 0.0002);

  const handleClear = useCallback(() => {
    if (!confirmedClear) {
      setConfirmedClear(true);
      setTimeout(() => setConfirmedClear(false), 4000);
      return;
    }
    clearSessions();
    setSessions([]);
    setConfirmedClear(false);
  }, [confirmedClear]);

  return (
    <div className="flex flex-col pb-20">
      <FeatureHeader
        eyebrow="Mood Dashboard"
        title="Your private emotion journal"
        description="Every recorded session lands here — aggregated into charts and exportable reports. Stored only in this browser, never on a server."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pt-8">
        {/* stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: String(sessions.length), label: 'Sessions' },
            { value: String(totalFaces), label: 'Samples read' },
            { value: String(totalMinutes), label: 'Minutes tracked' },
            { value: String(new Set(sessions.map((s) => new Date(s.startedAt).toDateString())).size), label: 'Active days' },
          ].map((s) => (
            <div key={s.label} className="glass edge-glow flex flex-col items-center gap-0.5 rounded-3xl px-4 py-5">
              <span className="font-display text-3xl font-bold tabular-nums text-white">{s.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{s.label}</span>
            </div>
          ))}
        </div>

        {sessions.length === 0 ? (
          <div className="glass mt-6 flex flex-col items-center gap-4 rounded-[28px] px-6 py-16 text-center">
            <span className="text-5xl" aria-hidden="true">📈</span>
            <h3 className="font-display text-lg font-bold text-white">No sessions yet</h3>
            <p className="max-w-sm text-sm leading-relaxed text-white/50">
              Run the Live Detection camera or analyze some text, then hit Record / finish a session —
              your emotion journal will build itself here.
            </p>
          </div>
        ) : (
          <>
            {/* charts */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="glass rounded-[26px] p-5">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Overall emotion mix
                </h3>
                <div className="mt-2 flex items-center">
                  <div className="h-[200px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="88%"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(10, 13, 28, 0.94)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14,
                            fontSize: 11,
                          }}
                          formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 pr-1">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-[11px] font-semibold text-white/70">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-[26px] p-5">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Sessions · last 14 days
                </h3>
                <div className="mt-2 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} stroke="rgba(255,255,255,0.12)" interval={2} />
                      <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} stroke="rgba(255,255,255,0.12)" />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{
                          background: 'rgba(10, 13, 28, 0.94)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 14,
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#8b5cf6" fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* sessions list */}
            <div className="glass mt-4 rounded-[26px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Session journal
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportSessionsJson(getSessions())}
                    className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-bold text-white/70 transition-colors hover:text-white"
                  >
                    <Download size={11} aria-hidden="true" />
                    JSON
                  </button>
                  <button
                    onClick={() => exportSessionsCsv(getSessions())}
                    className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-bold text-white/70 transition-colors hover:text-white"
                  >
                    <Download size={11} aria-hidden="true" />
                    CSV
                  </button>
                  <button
                    onClick={handleClear}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                      confirmedClear
                        ? 'bg-mood-angry text-ink-950'
                        : 'border border-white/12 bg-white/[0.04] text-white/70 hover:text-white'
                    }`}
                  >
                    <Trash2 size={11} aria-hidden="true" />
                    {confirmedClear ? 'Sure? Click again' : 'Clear'}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {sessions.slice(0, 24).map((s) => {
                  const mode = MODE_META[s.mode];
                  const meta = EMOTIONS[s.dominant];
                  const Icon = mode.icon;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <Icon size={14} className="text-white/75" aria-hidden="true" />
                      </span>
                      <span className="text-xl" aria-hidden="true">{meta.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                            {mode.label}
                          </span>
                        </div>
                        {s.preview && <p className="truncate text-[11px] text-white/50">{s.preview}</p>}
                      </div>
                      <div className="hidden w-36 sm:block">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          {EMOTION_ORDER.map((key: EmotionKey) =>
                            s.distribution[key] > 0.01 ? (
                              <div
                                key={key}
                                style={{
                                  width: `${s.distribution[key] * 100}%`,
                                  background: EMOTIONS[key].color,
                                }}
                              />
                            ) : null,
                          )}
                        </div>
                      </div>
                      <span className="w-16 shrink-0 text-right text-[10px] font-semibold tabular-nums text-white/40">
                        {timeAgo(s.startedAt)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageNavBar } from '@/components/PageNavBar';
import { EquityCurve } from '@/app/components/equity-curve';

type Period = '7d' | '30d' | 'all';

interface HistoryRecord {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number;
  tp1?: number;
  sl?: number;
  outcomes: {
    '4h': { hit: boolean; pnlPct: number } | null;
    '24h': { hit: boolean; pnlPct: number } | null;
  };
}

interface HistoryStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number;
  avgConfidence: number;
  bestSignal: { pair: string; pnlPct: number } | null;
  streak: number;
}

interface AssetStats {
  pair: string;
  totalSignals: number;
  hitRate4h: number;
  hitRate24h: number;
  avgConfidence: number;
  avgPnl: number;
  bestStreak: number;
  worstStreak: number;
  recentHits: boolean[];
}

interface LeaderboardData {
  assets: AssetStats[];
  overall: {
    totalSignals: number;
    resolvedSignals: number;
    overallHitRate4h: number;
    overallHitRate24h: number;
    topPerformer: string;
    worstPerformer: string;
    lastUpdated: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function HitRateBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-emerald-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = value >= 60 ? 'text-emerald-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-1 rounded-full bg-[var(--glass-bg)]">
        <div
          className={`absolute h-1 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-10 text-right ${textColor}`}>
        {value > 0 ? `${value}%` : '—'}
      </span>
    </div>
  );
}

function Sparkline({ hits }: { hits: boolean[] }) {
  if (hits.length === 0) return <span className="text-[var(--text-secondary)] text-[10px]">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {hits.map((h, i) => (
        <div
          key={i}
          className={`w-1.5 h-3 rounded-[2px] ${h ? 'bg-emerald-500/70' : 'bg-red-500/40'}`}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function TrackRecordClient() {
  const [period, setPeriod] = useState<Period>('all');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const [historyRes, leaderboardRes] = await Promise.allSettled([
        fetch('/api/signals/history?limit=50&sort=resolved-first'),
        fetch(`/api/leaderboard?period=${p}`),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        setStats(data.stats ?? null);
        setRecords(data.records ?? []);
      }

      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const data = await leaderboardRes.value.json();
        setLeaderboard(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const resolvedRecords = records.filter(r => r.outcomes['24h'] !== null);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Signal Track Record</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Verified performance of TradeClaw AI trading signals. Every signal tracked, every outcome recorded.
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/[0.04] w-fit">
          {(['7d', '30d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                period === p
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {p === 'all' ? 'All Time' : p === '30d' ? '30 Days' : '7 Days'}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <StatCard label="Total Signals" value={String(stats.totalSignals)} />
            <StatCard label="Resolved" value={String(stats.resolved)} />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate}%`}
              accent={stats.winRate >= 55 ? 'emerald' : stats.winRate >= 45 ? 'yellow' : 'red'}
            />
            <StatCard
              label="Avg P&L"
              value={`${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%`}
              accent={stats.avgPnlPct >= 0 ? 'emerald' : 'red'}
            />
            <StatCard
              label="Total P&L"
              value={`${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%`}
              accent={stats.totalPnlPct >= 0 ? 'emerald' : 'red'}
            />
            <StatCard
              label="Streak"
              value={`${stats.streak > 0 ? '+' : ''}${stats.streak}`}
              accent={stats.streak > 0 ? 'emerald' : stats.streak < 0 ? 'red' : 'default'}
            />
          </div>
        )}

        {loading && !stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                <div className="h-3 w-16 bg-white/[0.06] rounded mb-2" />
                <div className="h-6 w-12 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Equity Curve */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">
            Equity Curve <span className="text-[var(--text-secondary)] opacity-50">(All Time)</span>
          </h2>
          <div className="glass-card rounded-2xl p-4">
            <EquityCurve />
          </div>
        </section>

        {/* Per-Symbol Breakdown */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">
            Per-Symbol Performance
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-left font-medium">Pair</th>
                    <th className="px-3 py-2.5 text-center font-medium">Signals</th>
                    <th className="px-3 py-2.5 text-left font-medium w-32">4h Hit Rate</th>
                    <th className="px-3 py-2.5 text-left font-medium w-32">24h Hit Rate</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg P&L</th>
                    <th className="px-3 py-2.5 text-center font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.assets.map(asset => (
                    <tr key={asset.pair} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-[var(--foreground)]">
                        <Link href={`/leaderboard?pair=${asset.pair}`} className="hover:text-emerald-400 transition-colors">
                          {asset.pair}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-[var(--text-secondary)]">{asset.totalSignals}</td>
                      <td className="px-3 py-2.5"><HitRateBar value={asset.hitRate4h} /></td>
                      <td className="px-3 py-2.5"><HitRateBar value={asset.hitRate24h} /></td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                        asset.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.avgPnl >= 0 ? '+' : ''}{asset.avgPnl.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2.5 flex justify-center"><Sparkline hits={asset.recentHits} /></td>
                    </tr>
                  ))}
                  {loading && !leaderboard && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-1 w-full bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-1 w-full bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-10 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))}
                  {!loading && leaderboard?.assets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        No data for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent Resolved Signals */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">
            Recent Resolved Signals
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-left font-medium">Time</th>
                    <th className="px-3 py-2.5 text-left font-medium">Pair</th>
                    <th className="px-3 py-2.5 text-center font-medium">Dir</th>
                    <th className="px-3 py-2.5 text-right font-medium">Entry</th>
                    <th className="px-3 py-2.5 text-center font-medium">4h</th>
                    <th className="px-3 py-2.5 text-center font-medium">24h</th>
                    <th className="px-4 py-2.5 text-right font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedRecords.slice(0, 20).map(r => {
                    const outcome24h = r.outcomes['24h'];
                    const outcome4h = r.outcomes['4h'];
                    const pnl = outcome24h?.pnlPct ?? outcome4h?.pnlPct ?? null;
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatTime(r.timestamp)}</td>
                        <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">{r.pair}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{r.direction}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{formatPrice(r.entryPrice)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {outcome4h == null ? (
                            <span className="text-zinc-600">—</span>
                          ) : outcome4h.hit ? (
                            <span className="text-emerald-400 font-semibold">TP</span>
                          ) : (
                            <span className="text-red-400 font-semibold">SL</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {outcome24h == null ? (
                            <span className="text-zinc-600">—</span>
                          ) : outcome24h.hit ? (
                            <span className="text-emerald-400 font-semibold">TP</span>
                          ) : (
                            <span className="text-red-400 font-semibold">SL</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                          pnl == null ? 'text-zinc-600' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                  {loading && resolvedRecords.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-3"><div className="h-3 w-20 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-14 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-8 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))}
                  {!loading && resolvedRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        No resolved signals yet. Check back after signals have aged 24+ hours.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Transparency Note */}
        <div className="glass-card rounded-2xl p-5 border-l-2 border-emerald-500/50 mb-8">
          <h3 className="text-sm font-semibold mb-1">Full Transparency</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Every signal is recorded the moment it&apos;s generated. Outcomes are verified against real OHLCV market data
            from Binance and Yahoo Finance. No cherry-picking, no hidden losses. Signals that don&apos;t hit TP or SL within
            the time window are marked as expired, not wins.
          </p>
        </div>

        {/* CTA */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Get These Signals in Real-Time</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Join our Telegram channel for instant signal alerts with entry, TP, and SL levels.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://t.me/tradeclawwin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
            >
              Join Telegram
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
            >
              View Live Signals
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = 'default',
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'red' | 'yellow' | 'default';
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400'
    : accent === 'red' ? 'text-red-400'
    : accent === 'yellow' ? 'text-yellow-400'
    : 'text-[var(--foreground)]';

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}

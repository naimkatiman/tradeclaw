'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageNavBar } from '@/components/PageNavBar';
import type { AssetStats, LeaderboardData, SignalHistoryRecord } from '@/lib/signal-history';

type Period = '7d' | '30d' | 'all';
type SortKey = 'hitRate' | 'totalSignals' | 'avgConfidence';

interface PairDetail {
  asset: AssetStats;
  records: SignalHistoryRecord[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-400/10 text-[var(--foreground)] text-[10px] font-bold">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/15 text-amber-600 text-[10px] font-bold">
        3
      </span>
    );
  return <span className="text-[10px] text-[var(--text-secondary)] font-mono w-6 text-center inline-block">{rank}</span>;
}

function HitRateBar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const color = value >= 60 ? 'bg-emerald-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = value >= 60 ? 'text-emerald-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400';
  const h = size === 'sm' ? 'h-[3px]' : 'h-1';
  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex-1 ${h} rounded-full bg-[var(--glass-bg)]`}>
        <div
          className={`absolute ${h} rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-10 text-right ${textColor}`}>
        {value > 0 ? `${value}%` : '—'}
      </span>
    </div>
  );
}

function ConfBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-[3px] rounded-full bg-[var(--glass-bg)]">
        <div
          className="absolute h-[3px] rounded-full bg-zinc-500 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-[var(--text-secondary)] tabular-nums w-8 text-right">{value}%</span>
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

function SkeletonBar({ width }: { width: string }) {
  return <div className={`h-[3px] rounded-full bg-white/[0.06] animate-pulse`} style={{ width }} />;
}

function LeaderboardSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.03]">
          {/* Rank */}
          <td className="px-4 py-3 w-10">
            <div className="w-6 h-6 rounded-full bg-white/[0.06] animate-pulse" />
          </td>
          {/* Pair */}
          <td className="px-4 py-3">
            <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
          </td>
          {/* Signals */}
          <td className="px-4 py-3 text-right">
            <div className="h-3 w-8 rounded bg-white/[0.06] animate-pulse ml-auto" />
          </td>
          {/* 4h Hit Rate */}
          <td className="px-4 py-3 w-36">
            <div className="flex items-center gap-2">
              <SkeletonBar width="60%" />
              <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" />
            </div>
          </td>
          {/* 24h Hit Rate */}
          <td className="px-4 py-3 w-36">
            <div className="flex items-center gap-2">
              <SkeletonBar width="45%" />
              <div className="h-3 w-10 rounded bg-white/[0.06] animate-pulse" />
            </div>
          </td>
          {/* Avg Conf */}
          <td className="px-4 py-3 w-32">
            <div className="flex items-center gap-2">
              <SkeletonBar width="50%" />
              <div className="h-3 w-8 rounded bg-white/[0.06] animate-pulse" />
            </div>
          </td>
          {/* Avg P&L */}
          <td className="px-4 py-3 text-right">
            <div className="h-3 w-12 rounded bg-white/[0.06] animate-pulse ml-auto" />
          </td>
          {/* Trend */}
          <td className="px-4 py-3">
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="w-1.5 h-3 rounded-[2px] bg-white/[0.06] animate-pulse" />
              ))}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <span className={`ml-1 inline-block text-[8px] ${active ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
      {active ? (asc ? '▲' : '▼') : '⬍'}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold font-mono tabular-nums ${color ?? 'text-[var(--foreground)]'}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-secondary)]">{sub}</div>}
    </div>
  );
}

function fmtAge(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function fmtPrice(n: number): string {
  if (n === 0) return '—';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

// ── PairDetailPanel ───────────────────────────────────────────────────────────

function PairDetailPanel({ pair, onClose }: { pair: string; onClose: () => void }) {
  const [data, setData] = useState<PairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(0);

  useEffect(() => {
    setTimeout(() => setLoading(true), 0);
    fetch(`/api/leaderboard?pair=${pair}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setFetchedAt(Date.now()); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [pair]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-[var(--border)]">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-bold text-[var(--foreground)]">{pair}</span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Signal Performance</span>
          </div>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-xl leading-none">×</button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-12 text-[var(--text-secondary)] text-xs">Loading…</div>
        )}

        {!loading && data && (
          <div className="flex-1 overflow-y-auto">
            {/* stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              <StatCard label="Signals" value={data.asset.totalSignals.toString()} />
              <StatCard label="4h Hit Rate" value={`${data.asset.hitRate4h}%`} color={data.asset.hitRate4h >= 55 ? 'text-emerald-400' : 'text-red-400'} />
              <StatCard label="24h Hit Rate" value={`${data.asset.hitRate24h}%`} color={data.asset.hitRate24h >= 55 ? 'text-emerald-400' : 'text-red-400'} />
              <StatCard label="Avg Confidence" value={`${data.asset.avgConfidence}%`} />
            </div>
            <div className="grid grid-cols-3 gap-3 px-4 pb-4">
              <StatCard label="Best Streak" value={`+${data.asset.bestStreak}`} color="text-emerald-400" />
              <StatCard label="Worst Streak" value={data.asset.worstStreak.toString()} color="text-red-400" />
              <StatCard label="Avg P&L" value={`${data.asset.avgPnl >= 0 ? '+' : ''}${data.asset.avgPnl}%`} color={data.asset.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            </div>

            {/* recent signals */}
            <div className="px-4 pb-4">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Recent Signals</div>
              <div className="glass-card rounded-xl overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-3 py-2 text-left text-[10px] text-[var(--text-secondary)] font-medium">Dir</th>
                      <th className="px-3 py-2 text-left text-[10px] text-[var(--text-secondary)] font-medium">TF</th>
                      <th className="px-3 py-2 text-right text-[10px] text-[var(--text-secondary)] font-medium">Entry</th>
                      <th className="px-3 py-2 text-right text-[10px] text-[var(--text-secondary)] font-medium">Conf</th>
                      <th className="px-3 py-2 text-right text-[10px] text-[var(--text-secondary)] font-medium">4h</th>
                      <th className="px-3 py-2 text-right text-[10px] text-[var(--text-secondary)] font-medium">24h</th>
                      <th className="px-3 py-2 text-right text-[10px] text-[var(--text-secondary)] font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.slice(0, 20).map(r => (
                      <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold ${r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-[var(--text-secondary)] font-mono">{r.timeframe}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-[var(--text-secondary)]">{fmtPrice(r.entryPrice)}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-[var(--text-secondary)]">{r.confidence}%</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono">
                          {r.outcomes['4h'] === null
                            ? <span className="text-[var(--text-secondary)]">OPEN</span>
                            : r.outcomes['4h'].hit
                            ? <span className="text-emerald-400">HIT</span>
                            : <span className="text-red-400">MISS</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono">
                          {r.outcomes['24h'] === null
                            ? <span className="text-[var(--text-secondary)]">OPEN</span>
                            : r.outcomes['24h'].hit
                            ? <span className="text-emerald-400">{r.outcomes['24h'].pnlPct > 0 ? '+' : ''}{r.outcomes['24h'].pnlPct}%</span>
                            : <span className="text-red-400">{r.outcomes['24h'].pnlPct}%</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-[var(--text-secondary)]">
                          {fmtAge(fetchedAt - r.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* share button */}
            <div className="px-4 pb-4">
              <a
                href={`/api/og/leaderboard/${pair.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] bg-white/[0.03] border border-[var(--border)] rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M12 2L14 4M14 4L12 6M14 4H10a4 4 0 0 0 0 8H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Share {pair} Performance Card
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [sortBy, setSortBy] = useState<SortKey>('hitRate');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?period=${period}&sort=${sortBy}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: LeaderboardData) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : 'Failed to load leaderboard data'); setLoading(false); });
  }, [period, sortBy]);

  useEffect(() => { setTimeout(() => fetchData(), 0); }, [fetchData]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc(p => !p);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  const assets = data
    ? (sortAsc ? [...data.assets].reverse() : data.assets)
    : [];

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/leaderboard` : '/leaderboard';

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--background)]/50">
        <a
          href={`/api/og/leaderboard`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          Share ↗
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <rect x="2" y="9" width="2.5" height="5" rx="0.5" fill="#10B981"/>
              <rect x="6.5" y="6" width="2.5" height="8" rx="0.5" fill="#10B981" opacity="0.7"/>
              <rect x="11" y="2" width="2.5" height="12" rx="0.5" fill="#10B981" opacity="0.4"/>
            </svg>
            <h1 className="text-xl font-bold tracking-tight">Signal Performance Leaderboard</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Track AI signal accuracy across {assets.length} pairs · 4h &amp; 24h resolution · Ranked by hit rate
          </p>
        </div>

        {/* Overall stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total Signals" value={data.overall.totalSignals.toString()} />
            <StatCard label="Resolved" value={data.overall.resolvedSignals.toString()} />
            <StatCard
              label="Overall 4h Hit Rate"
              value={`${data.overall.overallHitRate4h}%`}
              color={data.overall.overallHitRate4h >= 55 ? 'text-emerald-400' : 'text-red-400'}
            />
            <StatCard
              label="Overall 24h Hit Rate"
              value={`${data.overall.overallHitRate24h}%`}
              color={data.overall.overallHitRate24h >= 55 ? 'text-emerald-400' : 'text-red-400'}
            />
            <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Top Performer</div>
              <div className="text-base font-bold font-mono text-yellow-400">{data.overall.topPerformer}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">worst: {data.overall.worstPerformer}</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Period */}
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-[var(--border)]">
            {(['7d', '30d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${
                  period === p
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>

          {/* Share */}
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).catch(() => {});
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] bg-white/[0.03] border border-[var(--border)] rounded-lg transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M12 2L14 4M14 4L12 6M14 4H10a4 4 0 0 0 0 8H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Share Leaderboard
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            Failed to load leaderboard data: {error}
          </div>
        )}

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium w-10">Rank</th>
                <th className="px-4 py-3 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Pair</th>
                <th
                  className="px-4 py-3 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none"
                  onClick={() => handleSort('totalSignals')}
                >
                  Signals<SortIcon active={sortBy === 'totalSignals'} asc={sortAsc} />
                </th>
                <th className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium w-36">4h Hit Rate</th>
                <th className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium w-36">24h Hit Rate</th>
                <th
                  className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium w-32 cursor-pointer hover:text-[var(--text-secondary)] select-none"
                  onClick={() => handleSort('avgConfidence')}
                >
                  Avg Conf<SortIcon active={sortBy === 'avgConfidence'} asc={sortAsc} />
                </th>
                <th className="px-4 py-3 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Avg P&L</th>
                <th className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {loading && <LeaderboardSkeleton />}
              {!loading && assets.map((asset, idx) => (
                <tr
                  key={asset.pair}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedPair(asset.pair)}
                >
                  <td className="px-4 py-3 w-10">
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-bold text-[var(--foreground)]">{asset.pair}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-secondary)] tabular-nums">
                    {asset.totalSignals}
                  </td>
                  <td className="px-4 py-3 w-36">
                    <HitRateBar value={asset.hitRate4h} size="sm" />
                  </td>
                  <td className="px-4 py-3 w-36">
                    <HitRateBar value={asset.hitRate24h} />
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ConfBar value={asset.avgConfidence} />
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums ${asset.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {asset.avgPnl >= 0 ? '+' : ''}{asset.avgPnl}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Sparkline hits={asset.recentHits} />
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--text-secondary)] text-xs">No signal data for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[10px] text-zinc-800 text-center">
          Click any row to see full signal breakdown · Hit rate = price moved ≥ 0.5% in signal direction within timeframe
        </p>
      </div>

      {/* Pair detail panel */}
      {selectedPair && (
        <PairDetailPanel pair={selectedPair} onClose={() => setSelectedPair(null)} />
      )}
    </div>
  );
}

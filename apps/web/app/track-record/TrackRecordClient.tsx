'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PageNavBar } from '@/components/PageNavBar';
import { useUserTier } from '@/lib/hooks/use-user-tier';
import { EquityCurve } from '@/app/components/equity-curve';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';

type Period = '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string; days: number | null }[] = [
  { value: '7d',   label: '7D',  days: 7 },
  { value: '30d',  label: '1M',  days: 30 },
  { value: '90d',  label: '3M',  days: 90 },
  { value: '180d', label: '6M',  days: 180 },
  { value: '1y',   label: '1Y',  days: 365 },
  { value: '5y',   label: '5Y',  days: 1825 },
  { value: 'all',  label: 'All', days: null },
];

/** Periods where the window pre-dates the earliest recorded signal are
 * disabled. Showing "5Y" on 26 days of history fabricates depth we don't
 * have. `all` and the smallest enabled window stay clickable. */
function isPeriodAvailable(daysWindow: number | null, earliestTs: number | null): boolean {
  if (daysWindow === null) return true; // 'all' always available
  if (earliestTs === null) return true; // unknown, don't block
  const dataAgeDays = (Date.now() - earliestTs) / 86_400_000;
  return daysWindow <= Math.ceil(dataAgeDays);
}

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
  /** Auto-expired (no TP/SL within 48h) — excluded from win-rate. */
  expired: number;
  /** Refused by the full-risk gate at emission — excluded from equity. */
  gateBlocked: number;
  /** Still open (no 24h outcome yet). */
  pending: number;
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
  totalPnl: number;
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
  const d = new Date(ts);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const tz = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(d)
    .find(p => p.type === 'timeZoneName')?.value ?? '';
  return `${month} ${day}, ${hh}:${mm} ${tz}`;
}

function HitRateBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-emerald-500' : value >= 50 ? 'bg-zinc-500' : 'bg-red-500';
  const textColor = value >= 60 ? 'text-emerald-400' : value >= 50 ? 'text-zinc-400' : 'text-red-400';
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

const PAGE_SIZE = 100;

/** Build a compact page-number list: 1 … 4 [5] 6 … 19 */
function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [];
  const near = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
  let prev = 0;
  for (let p = 1; p <= total; p++) {
    if (near.has(p)) {
      if (p - prev > 1) pages.push(null);
      pages.push(p);
      prev = p;
    }
  }
  return pages;
}

type DirectionFilter = 'ALL' | 'BUY' | 'SELL';
type Scope = 'pro' | 'free';

export function TrackRecordClient() {
  const router = useRouter();
  const tier = useUserTier();
  const isPaidUser = tier !== null && tier !== 'free';
  // Default tab: Pro track record. Everyone sees the full product's
  // verified outcomes by default — that's the marketing play. Free tab
  // is a comparison view showing what the free experience delivers.
  const [scope, setScope] = useState<Scope>('pro');
  const [period, setPeriod] = useState<Period>('30d');
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Earliest signal we have data for in the current scope. Used to grey out
  // period buttons whose window pre-dates any recorded signal — a 5Y button
  // on 26 days of data would be a fabrication.
  const [earliestTimestamp, setEarliestTimestamp] = useState<number | null>(null);

  const fetchData = useCallback(async (p: Period, off: number, pair: string, direction: DirectionFilter, s: Scope) => {
    setLoading(true);
    try {
      const historyParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(off),
        period: p,
        scope: s,
      });
      if (pair !== 'ALL') historyParams.set('pair', pair);
      if (direction !== 'ALL') historyParams.set('direction', direction);

      const [historyRes, leaderboardRes] = await Promise.allSettled([
        fetch(`/api/signals/history?${historyParams.toString()}`),
        fetch(`/api/leaderboard?period=${p}`),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        setStats(data.stats ?? null);
        setRecords(data.records ?? []);
        setTotal(data.total ?? 0);
        setEarliestTimestamp(typeof data.earliestTimestamp === 'number' ? data.earliestTimestamp : null);
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
    fetchData(period, offset, pairFilter, directionFilter, scope);
  }, [period, offset, pairFilter, directionFilter, scope, fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [period, pairFilter, directionFilter, scope]);

  const availablePairs = useMemo(() => {
    const fromLeaderboard = leaderboard?.assets.map(a => a.pair) ?? [];
    const fromRecords = records.map(r => r.pair);
    return Array.from(new Set([...fromLeaderboard, ...fromRecords])).sort();
  }, [leaderboard, records]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = useMemo(() => pageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="track-record" />
      <PageNavBar />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {/* Header — lead with Total Return (sum of per-signal % at fixed risk).
           This is a return-on-risk number, NOT compounded equity. Win rate
           alone misleads because a 35% WR with positive expectancy beats a
           70% WR with giant losers. We show both so the reader can judge. */}
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-2">
            Verified Track Record
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold tabular-nums ${
                stats && stats.totalPnlPct > 0 ? 'text-emerald-400'
                : stats && stats.totalPnlPct < 0 ? 'text-red-400'
                : 'text-[var(--foreground)]'
              }`}>
                {stats ? `${stats.totalPnlPct > 0 ? '+' : ''}${stats.totalPnlPct}%` : '—'}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">total return</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-semibold tabular-nums ${
                stats && stats.winRate >= 55 ? 'text-emerald-400'
                : stats && stats.winRate >= 45 ? 'text-zinc-400'
                : stats ? 'text-red-400' : 'text-[var(--foreground)]'
              }`}>
                {stats ? `${stats.winRate}%` : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">win rate</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-[var(--foreground)]">
                {stats ? stats.resolved : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">resolved signals</span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Total return = sum of per-signal % at fixed 1R risk. Stats below count only resolved trades —
            signals refused by the risk gate or that expired without TP/SL are surfaced separately, not folded in.
          </p>
        </div>

        {/* Period Filter — buttons whose window exceeds available history are
           disabled with a tooltip explaining how much history we actually have. */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/[0.04] w-fit overflow-x-auto max-w-full">
          {PERIOD_OPTIONS.map(({ value, label, days }) => {
            const available = isPeriodAvailable(days, earliestTimestamp);
            const dataAgeDays = earliestTimestamp
              ? Math.max(1, Math.floor((Date.now() - earliestTimestamp) / 86_400_000))
              : null;
            const tooltip = !available && dataAgeDays
              ? `Only ${dataAgeDays} days of history available`
              : undefined;
            return (
              <button
                key={value}
                onClick={() => available && setPeriod(value)}
                disabled={!available}
                title={tooltip}
                aria-disabled={!available}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all whitespace-nowrap ${
                  period === value && available
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : !available
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Scope tabs — default Pro, Free is a comparison view */}
        <div className="mb-3 flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] w-fit">
          {(
            [
              { value: 'pro', label: 'Pro track record' },
              { value: 'free', label: 'Free track record' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                scope === value
                  ? value === 'pro'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-white/[0.08] text-[var(--foreground)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scope disclaimer — explains what the viewer is looking at */}
        {scope === 'pro' ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-300">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isPaidUser
                  ? 'Pro track record — every signal across every symbol, full archive.'
                  : 'Pro track record — these are the signals Pro subscribers receive live. Your Free tier would see only a subset.'}
              </span>
            </div>
            {!isPaidUser && (
              <Link
                href="/pricing?from=track-record"
                className="shrink-0 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
              >
                Get these signals live
              </Link>
            )}
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Free-tier view — last 24 hours on {`BTC, ETH, XAU`}. This is the slice free subscribers see.
              </span>
            </div>
            <button
              onClick={() => setScope('pro')}
              className="shrink-0 rounded-md border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              Switch to Pro view
            </button>
          </div>
        )}

        {/* Stats Cards — counted side (resolved / avg / total / streak) +
           excluded counters surfaced separately so the denominator picture
           is honest. "Total Signals" was misleading because it included
           gate-blocked + expired-zero rows that don't count toward win-rate. */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <StatCard label="Resolved" value={String(stats.resolved)} hint="Trades with TP/SL within 48h" />
              <StatCard
                label="Avg P&L"
                value={`${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%`}
                accent={stats.avgPnlPct >= 0 ? 'emerald' : 'red'}
                hint="Per resolved signal"
              />
              <StatCard
                label="Total P&L"
                value={`${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%`}
                accent={stats.totalPnlPct >= 0 ? 'emerald' : 'red'}
                hint="Sum at fixed 1R"
              />
              <StatCard
                label="Streak"
                value={`${stats.streak > 0 ? '+' : ''}${stats.streak}`}
                accent={stats.streak > 0 ? 'emerald' : stats.streak < 0 ? 'red' : 'default'}
                hint="Consecutive resolved"
              />
            </div>
            {(stats.expired > 0 || stats.gateBlocked > 0 || stats.pending > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                <StatCard
                  label="Expired (no resolution)"
                  value={String(stats.expired)}
                  hint="No TP/SL hit within 48h"
                />
                <StatCard
                  label="Gate-blocked"
                  value={String(stats.gateBlocked)}
                  hint="Risk filter declined entry"
                />
                <StatCard
                  label="Pending"
                  value={String(stats.pending)}
                  hint="Still inside 24h window"
                />
              </div>
            )}
          </>
        )}

        {loading && !stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                <div className="h-3 w-16 bg-white/[0.06] rounded mb-2" />
                <div className="h-6 w-12 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* CTA — above the fold */}
        <div className="glass-card rounded-2xl p-5 mb-8 border-l-2 border-emerald-500/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold mb-0.5">Get These Signals in Real-Time</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Instant Telegram alerts with entry, SL, and 3 TP levels.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://t.me/tradeclawwin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
              >
                Join Telegram
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                Live Signals
              </Link>
            </div>
          </div>
        </div>

        {/* Equity Curve — component accepts a narrower period set; map unsupported periods to 'all'.
           Scope mirrors the tab above so Pro vs Free are clearly distinct charts. */}
        <EquityCurve
          period={period === '7d' || period === '30d' ? period : 'all'}
          scope={scope}
        />

        {/* Per-Symbol Breakdown */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-3">
            Per-Symbol Performance
          </h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-left font-medium">Pair</th>
                    <th className="px-3 py-2.5 text-center font-medium">Signals</th>
                    <th className="px-3 py-2.5 text-left font-medium w-28">4h Hit</th>
                    <th className="px-3 py-2.5 text-left font-medium w-28">24h Hit</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg P&L</th>
                    <th className="px-3 py-2.5 text-right font-medium hidden sm:table-cell">Total P&L</th>
                    <th className="px-3 py-2.5 text-center font-medium hidden sm:table-cell">Trend</th>
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
                      <td className={`px-3 py-2.5 text-right tabular-nums font-semibold hidden sm:table-cell ${
                        asset.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.totalPnl >= 0 ? '+' : ''}{asset.totalPnl.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell"><div className="flex justify-center"><Sparkline hits={asset.recentHits} /></div></td>
                    </tr>
                  ))}
                  {loading && !leaderboard && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-1 w-full bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-1 w-full bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-10 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-10 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))}
                  {!loading && leaderboard?.assets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        No data for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* All Signals */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold">
              All Signals
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {total > 0 ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}` : ''}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04]">
              <span className="px-2 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-mono">Pair</span>
              <select
                value={pairFilter}
                onChange={e => setPairFilter(e.target.value)}
                aria-label="Filter by pair"
                className="bg-transparent text-xs font-mono text-[var(--foreground)] px-2 py-1 rounded-md hover:bg-white/[0.06] focus:outline-none focus:bg-white/[0.06] cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--background)]">All</option>
                {availablePairs.map(p => (
                  <option key={p} value={p} className="bg-[var(--background)]">{p}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04]">
              {(['ALL', 'BUY', 'SELL'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirectionFilter(d)}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                    directionFilter === d
                      ? d === 'BUY'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : d === 'SELL'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-white/[0.08] text-[var(--foreground)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {(pairFilter !== 'ALL' || directionFilter !== 'ALL') && (
              <button
                onClick={() => { setPairFilter('ALL'); setDirectionFilter('ALL'); }}
                className="px-3 py-1.5 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-left font-medium">Time</th>
                    <th className="px-3 py-2.5 text-left font-medium">Pair</th>
                    <th className="px-3 py-2.5 text-center font-medium">Dir</th>
                    <th className="px-3 py-2.5 text-right font-medium hidden sm:table-cell">Entry</th>
                    <th className="px-3 py-2.5 text-center font-medium">4h</th>
                    <th className="px-3 py-2.5 text-center font-medium">24h</th>
                    <th className="px-4 py-2.5 text-right font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const outcome24h = r.outcomes['24h'];
                    const outcome4h = r.outcomes['4h'];
                    const pnl = outcome24h?.pnlPct ?? outcome4h?.pnlPct ?? null;
                    const isPending = outcome24h == null && outcome4h == null;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => router.push(`/signal/${r.id}`)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/signal/${r.id}`);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View signal ${r.pair} ${r.direction} ${formatTime(r.timestamp)}`}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{formatTime(r.timestamp)}</td>
                        <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">{r.pair}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{r.direction}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)] hidden sm:table-cell">{formatPrice(r.entryPrice)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {outcome4h == null ? (
                            <span className="text-zinc-600">{isPending ? '…' : '—'}</span>
                          ) : outcome4h.hit ? (
                            <span className="text-emerald-400 font-semibold">TP</span>
                          ) : (
                            <span className="text-red-400 font-semibold">SL</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {outcome24h == null ? (
                            <span className="text-zinc-600">{isPending ? '…' : '—'}</span>
                          ) : outcome24h.hit ? (
                            <span className="text-emerald-400 font-semibold">TP</span>
                          ) : (
                            <span className="text-red-400 font-semibold">SL</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                          pnl == null ? 'text-zinc-600' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {pnl == null ? (isPending ? 'pending' : '—') : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}
                        </td>
                      </tr>
                    );
                  })}
                  {loading && records.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-14 bg-white/[0.06] rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-8 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))}
                  {!loading && records.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        {pairFilter !== 'ALL' || directionFilter !== 'ALL'
                          ? 'No signals match these filters.'
                          : 'No signals for this period yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-[var(--border)] text-[11px] font-mono flex-wrap">
                <button
                  onClick={() => setOffset(0)}
                  disabled={currentPage === 1 || loading}
                  className="px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={currentPage === 1 || loading}
                  className="px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {pages.map((p, i) =>
                  p === null ? (
                    <span key={`gap-${i}`} className="px-1 text-[var(--text-secondary)]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setOffset((p - 1) * PAGE_SIZE)}
                      disabled={loading}
                      className={`min-w-[28px] py-1.5 rounded-md text-center transition-colors ${
                        p === currentPage
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)]'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={currentPage === totalPages || loading}
                  className="px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setOffset((totalPages - 1) * PAGE_SIZE)}
                  disabled={currentPage === totalPages || loading}
                  className="px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Transparency Note */}
        <div className="glass-card rounded-2xl p-5 border-l-2 border-emerald-500/50 mb-8">
          <h3 className="text-sm font-semibold mb-1">Full Transparency</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Every signal is recorded the moment it&apos;s generated. Outcomes are verified against real OHLCV market
            data from Binance and Yahoo Finance.
            Win rate, total P&amp;L, and the equity curve count only resolved trades — signals refused by the
            full-risk gate or that expired without hitting TP/SL within 48h are surfaced as separate counters,
            not folded into the headline numbers. No cherry-picking, no hidden losses.
          </p>
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
  hint,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'red' | 'yellow' | 'default';
  hint?: string;
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400'
    : accent === 'red' ? 'text-red-400'
    : accent === 'yellow' ? 'text-zinc-400'
    : 'text-[var(--foreground)]';

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-zinc-600 mt-1">{hint}</div>
      )}
    </div>
  );
}

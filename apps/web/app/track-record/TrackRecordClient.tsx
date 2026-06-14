'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PageNavBar } from '@/components/PageNavBar';
import { useUserTier } from '@/lib/hooks/use-user-tier';
import { EquityCurve } from '@/app/components/equity-curve';
import { TrailingWeekBandCallout } from '@/app/components/trailing-week-band-callout';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';
import { InfoHint } from '@/components/InfoHint';
import { STAT_HINTS } from '@/lib/stat-hints';
import { FREE_HISTORY_DAYS, FREE_SYMBOLS } from '@/lib/tier-client';
import { isExpiredHistoricalOutcome, isPendingHistoricalOutcome } from '@/lib/signal-history-status';
import { deriveHistoricalOutcomeStatus } from '@/lib/signal-outcome';
import { symbolsForCategory, type CategoryFilter } from '@/app/lib/symbol-config';
import { EmbedButton } from '../components/embed-button';
import { ShareOnX } from '../components/share-on-x';
import { ShareLinkedIn } from '../components/share-linkedin';

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

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'majors', label: 'Majors' },
  { value: 'thematic', label: 'Thematic' },
];

const RESOLUTION_HEARTBEAT_STALE_MS = 15 * 60 * 1000;

function formatHeartbeatAge(lastUpdated: number): string {
  const ageMs = Math.max(0, Date.now() - lastUpdated);
  const totalMinutes = Math.max(1, Math.round(ageMs / 60_000));

  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`;
  }

  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function getResolutionHeartbeat(lastUpdated: number | null | undefined, now: number) {
  if (!lastUpdated) return null;

  const ageMs = Math.max(0, now - lastUpdated);
  return {
    ageLabel: formatHeartbeatAge(lastUpdated),
    isStale: ageMs > RESOLUTION_HEARTBEAT_STALE_MS,
  };
}

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
    '4h': { hit: boolean; pnlPct: number; target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired' } | null;
    '24h': { hit: boolean; pnlPct: number; target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired' } | null;
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
    totalPnl: number;
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

/** Short "Mon D, YYYY" stamp for the headline "since <date>" provenance. */
function formatDateStamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Human window descriptor for the selected period, anchored to the earliest
 * recorded signal. "All" with no data is unbounded; a fixed window shows the
 * actual span it covers given how much history exists. */
function periodWindowLabel(period: Period, earliestTs: number | null): string {
  const opt = PERIOD_OPTIONS.find(o => o.value === period);
  if (!opt) return '';
  if (opt.days === null) {
    return earliestTs ? `since ${formatDateStamp(earliestTs)}` : 'full archive';
  }
  const start = Date.now() - opt.days * 86_400_000;
  const effectiveStart = earliestTs ? Math.max(start, earliestTs) : start;
  return `${formatDateStamp(effectiveStart)} – ${formatDateStamp(Date.now())}`;
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

function formatOutcomeCell(
  outcome: { hit: boolean; pnlPct: number; target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired' } | null,
  status: ReturnType<typeof deriveHistoricalOutcomeStatus> | null,
  isPendingWindow: boolean,
  isExpiredWindow: boolean,
) {
  if (outcome == null) {
    return {
      text: isPendingWindow ? '…' : isExpiredWindow ? 'expired' : '—',
      className: 'text-zinc-600',
    };
  }

  if (status === 'expired') {
    return { text: 'expired', className: 'text-zinc-600' };
  }

  return outcome.hit
    ? { text: 'TP', className: 'text-emerald-400 font-semibold' }
    : { text: 'SL', className: 'text-red-400 font-semibold' };
}


type DirectionFilter = 'ALL' | 'BUY' | 'SELL';
type Scope = 'pro' | 'free' | 'broadcast';
type EquityBand = 'premium' | 'standard' | 'all';

function parseEquityBand(raw: string | null): EquityBand {
  if (raw === 'premium' || raw === 'standard') return raw;
  return 'all';
}

function buildTrackRecordUrl(pathname: string, params: URLSearchParams, band: EquityBand): string {
  params.set('band', band);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

interface CategorySnapshot {
  winRate: number;
  expectancyR: number | null;
  totalSignals: number;
  breakEvenWinRate: number | null;
}

interface RollingWinRateSnapshot {
  totalSignals: number;
  resolvedSignals: number;
  winRate: number;
}

type RollingWindow = '7d' | '30d' | '90d';
type RollingWinRates = Record<RollingWindow, RollingWinRateSnapshot>;

/**
 * Side-by-side WR / expectancy comparison across All / Majors / Thematic.
 * One fetch per category — same cached endpoint as the equity curve, so
 * cost is one warm hit per category at the s-maxage=60 layer.
 */
function CategoryBreakdownRow({
  period,
  scope,
  active,
  onSelect,
}: {
  period: Period;
  scope: Scope;
  active: CategoryFilter;
  onSelect: (c: CategoryFilter) => void;
}) {
  const [data, setData] = useState<Record<CategoryFilter, CategorySnapshot | null>>({
    all: null,
    majors: null,
    thematic: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const cats: CategoryFilter[] = ['all', 'majors', 'thematic'];
      const results = await Promise.allSettled(
        cats.map(c => {
          const params = new URLSearchParams({ period, scope });
          if (c !== 'all') params.set('category', c);
          return fetch(`/api/signals/equity?${params.toString()}`).then(r => r.ok ? r.json() : null);
        }),
      );
      if (cancelled) return;
      const next: Record<CategoryFilter, CategorySnapshot | null> = {
        all: null,
        majors: null,
        thematic: null,
      };
      cats.forEach((c, i) => {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value?.summary) {
          next[c] = {
            winRate: r.value.summary.winRate,
            expectancyR: r.value.summary.expectancyR ?? null,
            totalSignals: r.value.summary.totalSignals,
            breakEvenWinRate: r.value.summary.breakEvenWinRate ?? null,
          };
        }
      });
      setData(next);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [period, scope]);

  const cells: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'majors', label: 'Majors' },
    { value: 'thematic', label: 'Thematic' },
  ];

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
      {cells.map(({ value, label }) => {
        const snap = data[value];
        const isActive = active === value;
        const winRateBeatsBE = snap && snap.breakEvenWinRate !== null
          ? snap.winRate >= snap.breakEvenWinRate
          : snap ? snap.winRate >= 50 : false;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`text-left rounded-lg px-3 py-2 transition-colors ${
              isActive
                ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
              {snap && (
                <span className="text-[9px] font-mono text-zinc-600 tabular-nums">
                  n={snap.totalSignals.toLocaleString()}
                </span>
              )}
            </div>
            {loading || !snap ? (
              <div className="mt-1 h-5 w-16 animate-pulse rounded bg-white/[0.04]" />
            ) : (
              <>
                <div className={`mt-0.5 text-base font-mono font-semibold tabular-nums ${
                  winRateBeatsBE ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {snap.winRate}%
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                  <span className={
                    snap.expectancyR !== null && snap.expectancyR > 0
                      ? 'text-emerald-500'
                      : snap.expectancyR !== null && snap.expectancyR < 0
                        ? 'text-red-500'
                        : ''
                  }>
                    {snap.expectancyR !== null
                      ? `${snap.expectancyR >= 0 ? '+' : ''}${snap.expectancyR.toFixed(2)}R`
                      : '—'}
                  </span>
                  {snap.breakEvenWinRate !== null && (
                    <span className="text-zinc-600">be {snap.breakEvenWinRate}%</span>
                  )}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TrackRecordClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tier = useUserTier();
  const isPaidUser = tier !== null && tier !== 'free';
  // Default tab: Pro track record. Everyone sees the full product's
  // verified outcomes by default — that's the marketing play. Free tab
  // is a comparison view showing what the free experience delivers.
  const [scope, setScope] = useState<Scope>('pro');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const equityBand = parseEquityBand(searchParams.get('band'));
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingWinRates, setRollingWinRates] = useState<RollingWinRates | null>(null);
  // Break-even win-rate for the current scope/period, from the equity summary.
  // Surfaced at the headline so the headline win-rate reads against the bar the
  // system needs, not a meaningless flat 50%.
  const [headlineBreakEven, setHeadlineBreakEven] = useState<number | null>(null);
  // Realized (position-sized) compounded return + max drawdown from the equity
  // summary. Surfaced at the headline so the number a subscriber could actually
  // earn sits next to the raw unsized total, not buried in the equity card.
  const [headlineCompoundedReturn, setHeadlineCompoundedReturn] = useState<number | null>(null);
  const [headlineMaxDrawdown, setHeadlineMaxDrawdown] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Earliest signal we have data for in the current scope. Used to grey out
  // period buttons whose window pre-dates any recorded signal — a 5Y button
  // on 26 days of data would be a fabrication.
  const [earliestTimestamp, setEarliestTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (p: Period, off: number, pair: string, direction: DirectionFilter, s: Scope, c: CategoryFilter, band: EquityBand, isCancelled: () => boolean) => {
    setLoading(true);
    try {
      const historyParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(off),
        period: p,
        scope: s,
      });
      if (pair !== 'ALL') historyParams.set('pair', pair);
      if (c !== 'all') historyParams.set('category', c);
      if (direction !== 'ALL') historyParams.set('direction', direction);

      const leaderboardParams = new URLSearchParams({ period: p, scope: s });
      if (c !== 'all') leaderboardParams.set('category', c);

      const equityParams = new URLSearchParams({ period: p, scope: s, band });
      if (c !== 'all') equityParams.set('category', c);
      // Headline reads summary fields only (rolling win-rates, break-even,
      // realized return, drawdown) — the curve itself is fetched by EquityCurve.
      equityParams.set('summaryOnly', '1');

      const [historyRes, leaderboardRes, equityRes] = await Promise.allSettled([
        fetch(`/api/signals/history?${historyParams.toString()}`),
        fetch(`/api/leaderboard?${leaderboardParams.toString()}`),
        fetch(`/api/signals/equity?${equityParams.toString()}`),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        if (isCancelled()) return;
        setStats(data.stats ?? null);
        setRecords(data.records ?? []);
        setTotal(data.total ?? 0);
        setEarliestTimestamp(typeof data.earliestTimestamp === 'number' ? data.earliestTimestamp : null);
      }

      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const data = await leaderboardRes.value.json();
        if (isCancelled()) return;
        setLeaderboard(data);
      }

      if (equityRes.status === 'fulfilled' && equityRes.value.ok) {
        const data = await equityRes.value.json();
        if (isCancelled()) return;
        setRollingWinRates(data.rollingWinRates ?? null);
        setHeadlineBreakEven(
          typeof data.summary?.breakEvenWinRate === 'number' ? data.summary.breakEvenWinRate : null,
        );
        setHeadlineCompoundedReturn(
          typeof data.summary?.totalReturn === 'number' ? data.summary.totalReturn : null,
        );
        setHeadlineMaxDrawdown(
          typeof data.summary?.maxDrawdown === 'number' ? data.summary.maxDrawdown : null,
        );
      } else {
        if (isCancelled()) return;
        setRollingWinRates(null);
        setHeadlineBreakEven(null);
        setHeadlineCompoundedReturn(null);
        setHeadlineMaxDrawdown(null);
      }
    } catch {
      if (isCancelled()) return;
      setRollingWinRates(null);
      setHeadlineCompoundedReturn(null);
      setHeadlineMaxDrawdown(null);
      // silently fail
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData(period, offset, pairFilter, directionFilter, scope, category, equityBand, () => cancelled);
    return () => { cancelled = true; };
  }, [period, offset, pairFilter, directionFilter, scope, category, equityBand, fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [period, pairFilter, directionFilter, scope, category]);

  const availablePairs = useMemo(() => {
    const fromLeaderboard = leaderboard?.assets.map(a => a.pair) ?? [];
    const fromRecords = records.map(r => r.pair);
    return Array.from(new Set([...fromLeaderboard, ...fromRecords])).sort();
  }, [leaderboard, records]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = useMemo(() => pageNumbers(currentPage, totalPages), [currentPage, totalPages]);
  const resolutionHeartbeat = useMemo(
    () => getResolutionHeartbeat(leaderboard?.overall.lastUpdated, now),
    [leaderboard?.overall.lastUpdated, now],
  );
  const freeCategoryHasSymbols = useMemo(() => {
    if (scope !== 'free' || category === 'all') return true;
    const freeSet = new Set<string>(FREE_SYMBOLS);
    return symbolsForCategory(category).some(symbol => freeSet.has(symbol));
  }, [scope, category]);
  const categoryCaption = useMemo(() => {
    if (category === 'majors') {
      return `${symbolsForCategory('majors').length} highest-liquidity instruments. The cleanest read on strategy quality.`;
    }
    if (category === 'thematic') {
      return `${symbolsForCategory('thematic').length} narrative-driven symbols. Wider coverage, more noise — useful for breadth, not for headline win rate.`;
    }
    if (scope === 'free') return `Every free-tier symbol in the last ${FREE_HISTORY_DAYS} days.`;
    if (scope === 'broadcast') return 'Gate-approved signals only — decisions recorded since 2026-06-10.';
    return 'Every tracked symbol, full archive.';
  }, [category, scope]);
  const noFreeSymbolsInCategory = scope === 'free' && category !== 'all' && !freeCategoryHasSymbols;

  const handleCategoryChange = (nextCategory: CategoryFilter) => {
    setCategory(nextCategory);
    setPairFilter('ALL');
  };

  const handleBandChange = useCallback((nextBand: EquityBand) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextBand === 'all') {
      params.delete('band');
    } else {
      params.set('band', nextBand);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const embeddedBand = scope === 'pro' ? equityBand : 'all';

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
            Recorded Track Record
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
              <span className="text-sm text-[var(--text-secondary)] inline-flex items-center gap-1">
                total return · unsized
                <InfoHint text={STAT_HINTS.totalReturnLinear} label="What total return means" />
              </span>
              {/* Provenance stamp — the window this headline actually covers,
                  so a number from 26 days of data doesn't read as "all time". */}
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                {periodWindowLabel(period, earliestTimestamp)}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-semibold tabular-nums ${
                headlineBreakEven !== null && stats
                  ? stats.winRate >= headlineBreakEven ? 'text-emerald-400' : 'text-red-400'
                  : stats && stats.winRate >= 55 ? 'text-emerald-400'
                  : stats && stats.winRate >= 45 ? 'text-zinc-400'
                  : stats ? 'text-red-400' : 'text-[var(--foreground)]'
              }`}>
                {stats ? `${stats.winRate}%` : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                win rate
                <InfoHint text={STAT_HINTS.winRate24h} label="What win rate means" />
              </span>
              {/* Break-even win-rate at the headline (not only in sub-cards):
                  a sub-50% win-rate above break-even is still profitable. */}
              {headlineBreakEven !== null && (
                <span className="text-[11px] font-mono text-[var(--text-secondary)] inline-flex items-center gap-1">
                  break-even {headlineBreakEven}%
                  <InfoHint text={STAT_HINTS.breakEvenWinRate} label="What break-even win rate means" />
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-[var(--foreground)]">
                {stats ? stats.resolved : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                resolved signals
                <InfoHint text={STAT_HINTS.resolved} label="What resolved signals means" />
              </span>
            </div>
            {/* Realized (position-sized) return at headline weight — the number a
               real subscriber could earn, shown next to the raw unsized total so
               the achievable figure isn't buried. Paired with max drawdown so the
               path's cost is never hidden behind the return. */}
            {headlineCompoundedReturn !== null && (
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-semibold tabular-nums ${
                  headlineCompoundedReturn > 0 ? 'text-emerald-400'
                  : headlineCompoundedReturn < 0 ? 'text-red-400'
                  : 'text-[var(--foreground)]'
                }`}>
                  {headlineCompoundedReturn > 0 ? '+' : ''}{headlineCompoundedReturn}%
                </span>
                <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                  realized · 1% risk
                  <InfoHint text={STAT_HINTS.totalReturnCompounded} label="What realized compounded return means" />
                </span>
                {headlineMaxDrawdown !== null && (
                  <span className="text-[11px] font-mono text-red-400/80 inline-flex items-center gap-1">
                    max drawdown −{headlineMaxDrawdown}%
                    <InfoHint text={STAT_HINTS.maxDrawdown} label="What max drawdown means" />
                  </span>
                )}
              </div>
            )}
            {resolutionHeartbeat && (
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono ${
                  resolutionHeartbeat.isStale
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    resolutionHeartbeat.isStale ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span>
                  {resolutionHeartbeat.isStale ? 'Resolution feed stale' : 'Outcome tracker live'}
                </span>
                <span className="text-[var(--text-secondary)]">
                  updated {resolutionHeartbeat.ageLabel}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <EmbedButton embedPath={`/embed/track-record?band=${embeddedBand}`} label="Embed this" width={600} height={360} />
            <ShareOnX
              winRate={stats?.winRate}
              resolved={stats?.resolved}
              period={period}
            />
            <ShareLinkedIn
              winRate={stats?.winRate}
              resolved={stats?.resolved}
              period={period}
            />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Headline total return is the raw sum of per-signal market % (no sizing). The equity card below
            shows the position-sized version — 1% risk per trade after blended round-trip costs — which is
            what a real subscriber would actually earn. Two views, same trades. Resolved trades only —
            gate-blocked and expired rows are surfaced separately, not folded in.
          </p>
          {rollingWinRates && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(['7d', '30d', '90d'] as const).map((window) => {
                const snap = rollingWinRates[window];
                const winTone = snap.winRate >= 55
                  ? 'text-emerald-400'
                  : snap.winRate >= 45
                    ? 'text-zinc-300'
                    : 'text-red-400';
                // Actual data span available. When the recorded history is
                // shorter than the window label, a "90d win rate" really only
                // covers N days — say so rather than imply 90 days of data.
                const windowDays = Number(window.replace('d', ''));
                const dataAgeDays = earliestTimestamp
                  ? Math.max(1, Math.floor((Date.now() - earliestTimestamp) / 86_400_000))
                  : null;
                const isThinWindow = dataAgeDays !== null && dataAgeDays < windowDays;
                return (
                  <div key={window} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)] font-mono">
                      Rolling win rate · {window}
                      {isThinWindow && (
                        <span className="ml-1 normal-case text-amber-400/80">
                          (only {dataAgeDays}d of data)
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className={`text-2xl font-bold tabular-nums ${winTone}`}>
                        {snap.resolvedSignals > 0 ? `${snap.winRate}%` : '—'}
                      </div>
                      <div className="text-right text-[10px] font-mono text-[var(--text-secondary)]">
                        <div>{snap.resolvedSignals} resolved</div>
                        <div>{snap.totalSignals} total</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

        {/* Scope tabs — default Pro (full firehose), Free is a comparison
            view, Broadcast is the subset the risk gate APPROVED for the Pro
            group (decision recorded per row since migration 048; approval is
            not delivery — outage fallbacks and failed sends differ). */}
        <div className="mb-3 flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] w-fit">
          {(
            [
              { value: 'pro', label: 'Pro track record' },
              { value: 'free', label: 'Free track record' },
              { value: 'broadcast', label: 'Pro broadcast (gated)' },
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
                    : value === 'broadcast'
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : 'bg-white/[0.08] text-[var(--foreground)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {scope === 'broadcast' && (
          <p className="mb-3 text-[11px] text-[var(--text-secondary)] max-w-xl">
            Only signals the live gate (regime + curation + risk pipeline) approved
            for the Pro Telegram broadcast. Gate decisions are recorded per row
            since 2026-06-10 — earlier signals carry no decision and are excluded
            from this view entirely.
          </p>
        )}

        {/* Category tabs — display-only segmentation over the same signal history */}
        <div className="mb-2 flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] w-fit overflow-x-auto max-w-full">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleCategoryChange(value)}
              aria-pressed={category === value}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all whitespace-nowrap ${
                category === value
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          {categoryCaption}
        </p>

        {/* Side-by-side WR + expectancy comparison so the user can see at a
            glance which category is dragging the headline. Click a cell to
            switch the active category — same effect as the tabs above. */}
        <CategoryBreakdownRow
          period={period}
          scope={scope}
          active={category}
          onSelect={handleCategoryChange}
        />

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
        ) : scope === 'broadcast' ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-cyan-300">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Pro broadcast view — only signals the live risk gate approved for the Pro Telegram group. Decisions are recorded per row since 2026-06-10; older signals are excluded.
              </span>
            </div>
            <button
              onClick={() => setScope('pro')}
              className="shrink-0 rounded-md border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              Switch to full record
            </button>
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Free-tier view — last {FREE_HISTORY_DAYS} days across {FREE_SYMBOLS.length} symbols (crypto, forex, metals, indices). This is the slice free subscribers see.
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
              <StatCard
                label="Resolved"
                value={String(stats.resolved)}
                hint="Trades with TP/SL within 48h"
                tooltip={STAT_HINTS.resolved}
              />
              <StatCard
                label="Avg P&L"
                value={`${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%`}
                accent={stats.avgPnlPct >= 0 ? 'emerald' : 'red'}
                hint="Per resolved signal"
                tooltip={STAT_HINTS.avgPnl}
              />
              <StatCard
                label="Total P&L"
                value={`${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%`}
                accent={stats.totalPnlPct >= 0 ? 'emerald' : 'red'}
                hint="Raw sum of per-signal market %"
                tooltip={STAT_HINTS.totalReturnLinear}
              />
              <StatCard
                label="Streak"
                value={`${stats.streak > 0 ? '+' : ''}${stats.streak}`}
                accent={stats.streak > 0 ? 'emerald' : stats.streak < 0 ? 'red' : 'default'}
                hint="Consecutive resolved"
                tooltip={STAT_HINTS.streak}
              />
            </div>
            {(stats.expired > 0 || stats.gateBlocked > 0 || stats.pending > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                <StatCard
                  label="Expired (no resolution)"
                  value={String(stats.expired)}
                  hint="No TP/SL hit within 48h"
                  tooltip={STAT_HINTS.expired}
                />
                <StatCard
                  label="Gate-blocked"
                  value={String(stats.gateBlocked)}
                  hint="Risk filter declined entry"
                  tooltip={STAT_HINTS.gateBlocked}
                />
                <StatCard
                  label="Pending"
                  value={String(stats.pending)}
                  hint="Still inside 24h window"
                  tooltip={STAT_HINTS.pending}
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
              <h3 className="text-base font-bold mb-0.5">Get These Signals Without Delay</h3>
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

        {/* Strategy Leaderboard proof card — reinforces Sharpe-first ranking */}
        <div className="glass-card rounded-2xl p-5 mb-8 border-l-2 border-emerald-500/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold mb-0.5">Compare Strategies by Sharpe</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Public leaderboard ranks every strategy by risk-adjusted return. Backtests, equity curves, and trade logs — open for inspection.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/strategies/leaderboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
              >
                View Leaderboard
              </Link>
              <Link
                href="/strategies"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                Browse Strategies
              </Link>
            </div>
          </div>
        </div>

        {/* Trailing-7d callout — Premium-band vs full-firehose side-by-side
           over the last week. Renders ABOVE the equity curve so the regime
           context lands before the long-form chart. Pro scope only — the
           free slice is too narrow for a band split. */}
        {scope === 'pro' && <TrailingWeekBandCallout />}

        {/* Equity Curve — component accepts a narrower period set; map unsupported periods to 'all'.
           Scope mirrors the tab above so Pro vs Free are clearly distinct charts.
           Band toggle is exposed only on Pro scope; Free scope is a narrow free-tier
           slice where a premium split isn't meaningful. */}
          <EquityCurve
          period={period === '7d' || period === '30d' ? period : 'all'}
          scope={scope}
          category={category}
          band={scope === 'pro' ? equityBand : 'all'}
          onBandChange={scope === 'pro' ? handleBandChange : undefined}
        />

        {/* Per-Symbol Breakdown */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold">
              Per-Symbol Performance
            </h2>
            {/* Date range the hit-rates below cover, for the selected period. */}
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {periodWindowLabel(period, earliestTimestamp)}
            </span>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-left font-medium">Pair</th>
                    <th className="px-3 py-2.5 text-center font-medium">Signals</th>
                    <th className="px-3 py-2.5 text-left font-medium w-28">
                      <span className="inline-flex items-center gap-1">4h Hit <InfoHint text={STAT_HINTS.winRate4h} label="What 4h hit means" /></span>
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium w-28">
                      <span className="inline-flex items-center gap-1">24h Hit <InfoHint text={STAT_HINTS.winRate24h} label="What 24h hit means" /></span>
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1 justify-end">Avg P&L <InfoHint text={STAT_HINTS.avgPnl} label="What avg P&L means" /></span>
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 justify-end">Total P&L <InfoHint text={STAT_HINTS.totalReturnLinear} label="What total P&L means" /></span>
                    </th>
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
                        {noFreeSymbolsInCategory
                          ? 'No free-tier symbols in this category.'
                          : 'No data for this period yet.'}
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
                    <th className="px-4 py-2.5 text-left font-medium">
                      <span className="inline-flex items-center gap-1">
                        Bar Open
                        <InfoHint
                          text="Candle bar open time (your local timezone). The signal anchors to this bar; the engine records it shortly after the bar closes (within the next 5-min cron tick), so wall-clock recording is up to one timeframe-period later than the value shown."
                          label="What Bar Open means"
                        />
                      </span>
                    </th>
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
                    const outcome4hStatus = outcome4h != null ? deriveHistoricalOutcomeStatus(outcome4h) : null;
                    const outcome24hStatus = outcome24h != null ? deriveHistoricalOutcomeStatus(outcome24h) : null;
                    const pnl = outcome24h?.pnlPct ?? outcome4h?.pnlPct ?? null;
                    const now = Date.now();
                    const isPending24h = isPendingHistoricalOutcome(outcome24h, r.timestamp, 24 * 60 * 60 * 1000, now);
                    const isExpired24h = isExpiredHistoricalOutcome(outcome24h, r.timestamp, 24 * 60 * 60 * 1000, now);
                    const isPending = isPending24h && outcome4h == null;
                    const outcome4hCell = formatOutcomeCell(
                      outcome4h,
                      outcome4hStatus,
                      isPending,
                      isExpiredHistoricalOutcome(outcome4h, r.timestamp, 4 * 60 * 60 * 1000, now),
                    );
                    const outcome24hCell = formatOutcomeCell(outcome24h, outcome24hStatus, isPending24h, isExpired24h);
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
                          <span className={outcome4hCell.className}>
                            {outcome4hCell.text}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={outcome24hCell.className}>
                            {outcome24hCell.text}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                          pnl == null ? 'text-zinc-600' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {outcome24hStatus === 'expired'
                            ? 'expired'
                            : pnl == null
                            ? (isPending ? 'pending' : isExpired24h ? 'expired' : '—')
                            : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}
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
                        {noFreeSymbolsInCategory
                          ? 'No free-tier symbols in this category.'
                          : pairFilter !== 'ALL' || directionFilter !== 'ALL'
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
            Every signal is recorded the moment it&apos;s generated. Outcomes are resolved against Binance and
            Yahoo Finance OHLCV candles.
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
  tooltip,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'red' | 'yellow' | 'default';
  hint?: string;
  /** Long-form explanation surfaced via the `?` icon next to the label. */
  tooltip?: string;
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400'
    : accent === 'red' ? 'text-red-400'
    : accent === 'yellow' ? 'text-zinc-400'
    : 'text-[var(--foreground)]';

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1 inline-flex items-center gap-1">
        {label}
        {tooltip && <InfoHint text={tooltip} label={`What ${label} means`} />}
      </div>
      <div className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-zinc-600 mt-1">{hint}</div>
      )}
    </div>
  );
}

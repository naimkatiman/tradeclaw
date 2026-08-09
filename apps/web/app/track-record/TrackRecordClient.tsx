'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageNavBar } from '@/components/PageNavBar';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';
import { InfoHint } from '@/components/InfoHint';
import { ProductHeroBackdrop } from '@/components/product-hero-backdrop';
import { isExpiredHistoricalOutcome, isPendingHistoricalOutcome } from '@/lib/signal-history-status';
import { deriveHistoricalOutcomeStatus } from '@/lib/signal-outcome';
import { isObservedOHLCVOutcomeSource } from '@/lib/outcome-provenance';
import { symbolsForCategory, type CategoryFilter } from '@/app/lib/symbol-config';
import { EmbedButton } from '../components/embed-button';
import { ShareOnX } from '../components/share-on-x';
import { ShareLinkedIn } from '../components/share-linkedin';
import { useLocale } from '@/app/components/locale-provider';
import { getHtmlLanguage } from '@/lib/translations';
import {
  getTrackRecordTranslations,
  type TrackRecordTranslations,
} from '@/lib/product-i18n/track-record';
import { formatMessage } from '@/lib/product-i18n/format';
import type { RollingWinRates } from '@/lib/rolling-win-rates';
import {
  EvidenceFilters,
  EvidenceSurfaceNav,
  type EvidencePeriod,
  type EvidenceScope,
} from './evidence-controls';

type Period = EvidencePeriod;

const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '1y': 365,
  '5y': 1825,
};

function formatHeartbeatAge(
  lastUpdated: number,
  now: number,
  t: TrackRecordTranslations,
): string {
  const ageMs = Math.max(0, now - lastUpdated);
  const totalMinutes = Math.max(1, Math.round(ageMs / 60_000));

  if (totalMinutes < 60) {
    return formatMessage(t.relativeTime.minutesAgo, { count: totalMinutes });
  }

  const hours = Math.round(totalMinutes / 60);
  if (hours < 24) {
    return formatMessage(t.relativeTime.hoursAgo, { count: hours });
  }

  return formatMessage(t.relativeTime.daysAgo, { count: Math.round(hours / 24) });
}

function getResolutionHeartbeat(
  lastUpdated: number | null | undefined,
  now: number,
  t: TrackRecordTranslations,
) {
  if (!lastUpdated) return null;

  return {
    ageLabel: formatHeartbeatAge(lastUpdated, now, t),
  };
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
    '4h': HistoryOutcome | null;
    '24h': HistoryOutcome | null;
  };
}

interface HistoryOutcome {
  hit: boolean;
  pnlPct: number;
  target?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'expired';
  source?: string;
  resolvedAt?: string;
}

interface HistoryStats {
  available: boolean;
  totalSignals: number;
  resolved: number;
  /** Missing/zero force-expiry placeholders — excluded from win-rate. */
  expired: number;
  /** Refused by the full-risk gate at emission — excluded from counted outcomes. */
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
  resolved4h: number;
  resolved24h: number;
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

function formatPrice(price: number, locale: Parameters<typeof getHtmlLanguage>[0]): string {
  const fractionDigits = price >= 1000 ? 2 : price >= 1 ? 4 : 6;
  return price.toLocaleString(getHtmlLanguage(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatTime(ts: number, locale: Parameters<typeof getHtmlLanguage>[0]): string {
  return new Intl.DateTimeFormat(getHtmlLanguage(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(ts));
}

/** Short "Mon D, YYYY" stamp for the headline "since <date>" provenance. */
function formatDateStamp(ts: number, locale: Parameters<typeof getHtmlLanguage>[0]): string {
  return new Date(ts).toLocaleDateString(getHtmlLanguage(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Human window descriptor for the selected period, anchored to the earliest
 * recorded signal. "All" with no data is unbounded; a fixed window shows the
 * actual span it covers given how much history exists. */
function periodWindowLabel(
  period: Period,
  earliestTs: number | null,
  locale: Parameters<typeof getHtmlLanguage>[0],
  t: TrackRecordTranslations,
): string {
  if (period === 'all') {
    return earliestTs
      ? formatMessage(t.window.storedSince, { date: formatDateStamp(earliestTs, locale) })
      : t.window.currentArchive;
  }
  const start = Date.now() - PERIOD_DAYS[period] * 86_400_000;
  const effectiveStart = earliestTs ? Math.max(start, earliestTs) : start;
  return `${formatDateStamp(effectiveStart, locale)} – ${formatDateStamp(Date.now(), locale)}`;
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
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-10 text-end ${textColor}`}>
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
  outcome: HistoryOutcome | null,
  status: ReturnType<typeof deriveHistoricalOutcomeStatus> | null,
  isPendingWindow: boolean,
  isExpiredWindow: boolean,
  t: TrackRecordTranslations,
) {
  if (outcome == null) {
    return {
      text: isPendingWindow ? '…' : isExpiredWindow ? t.status.expired : '—',
      className: 'text-zinc-600',
    };
  }

  if (status === 'expired' && outcome.pnlPct === 0) {
    return { text: t.status.expired, className: 'text-zinc-600' };
  }

  if (!isObservedOHLCVOutcomeSource(outcome.source)) {
    return {
      text: t.status.unverified,
      className: 'text-amber-400/80',
    };
  }

  if (status === 'expired') {
    if (outcome.pnlPct !== 0) {
      return {
        text: t.status.close,
        className: outcome.pnlPct > 0
          ? 'text-emerald-400 font-semibold'
          : 'text-red-400 font-semibold',
      };
    }
    return { text: t.status.expired, className: 'text-zinc-600' };
  }

  return outcome.hit
    ? { text: 'TP', className: 'text-emerald-400 font-semibold' }
    : { text: 'SL', className: 'text-red-400 font-semibold' };
}


type DirectionFilter = 'ALL' | 'BUY' | 'SELL';
type Scope = EvidenceScope;

interface CategorySnapshot {
  winRate: number;
  avgPnlPct: number | null;
  resolvedSignals: number;
}

/**
 * Side-by-side observed outcome comparison across All / Majors / Thematic.
 * This deliberately reads the leaderboard endpoint, not the modeled equity
 * endpoint, so these cards contain no sizing or cost-study fields.
 */
function CategoryBreakdownRow({
  period,
  scope,
  active,
  onSelect,
  t,
  language,
}: {
  period: Period;
  scope: Scope;
  active: CategoryFilter;
  onSelect: (c: CategoryFilter) => void;
  t: TrackRecordTranslations;
  language: string;
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
          return fetch(`/api/leaderboard?${params.toString()}`).then(r => r.ok ? r.json() : null);
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
        if (r.status === 'fulfilled' && r.value?.overall) {
          const resolvedSignals = Number(r.value.overall.resolvedSignals ?? 0);
          const totalPnl = Number(r.value.overall.totalPnl ?? 0);
          next[c] = {
            winRate: Number(r.value.overall.overallHitRate24h ?? 0),
            avgPnlPct: resolvedSignals > 0 ? totalPnl / resolvedSignals : null,
            resolvedSignals,
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
    { value: 'all', label: t.categories.all },
    { value: 'majors', label: t.categories.majors },
    { value: 'thematic', label: t.categories.thematic },
  ];

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
      {cells.map(({ value, label }) => {
        const snap = data[value];
        const isActive = active === value;
        const hasEvidence = Boolean(snap && snap.resolvedSignals > 0);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`text-start rounded-lg px-3 py-2 transition-colors ${
              isActive
                ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
              {snap && (
                <span className="text-[9px] font-mono text-zinc-600 tabular-nums">
                  n={new Intl.NumberFormat(language).format(snap.resolvedSignals)}
                </span>
              )}
            </div>
            {loading || !snap ? (
              <div className="mt-1 h-5 w-16 animate-pulse rounded bg-white/[0.04]" />
            ) : (
              <>
                <div className={`mt-0.5 text-base font-mono font-semibold tabular-nums ${
                  hasEvidence ? 'text-zinc-200' : 'text-zinc-500'
                }`}>
                  {hasEvidence ? `${snap.winRate}%` : '—'}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                  <span className={
                    snap.avgPnlPct !== null && snap.avgPnlPct > 0
                      ? 'text-emerald-500'
                      : snap.avgPnlPct !== null && snap.avgPnlPct < 0
                        ? 'text-red-500'
                        : ''
                  }>
                    {snap.avgPnlPct !== null
                      ? `${snap.avgPnlPct >= 0 ? '+' : ''}${snap.avgPnlPct.toFixed(2)}%`
                      : '—'}
                  </span>
                  <span className="text-zinc-600">{t.stats.averagePnl}</span>
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
  const { locale } = useLocale();
  const t = getTrackRecordTranslations(locale);
  const language = getHtmlLanguage(locale);
  const numberFormatter = new Intl.NumberFormat(language);
  const router = useRouter();
  // Default tab: eligible signal stream. Broadcast is the gate-approved subset.
  const [scope, setScope] = useState<Scope>('pro');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingWinRates, setRollingWinRates] = useState<RollingWinRates | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  // Earliest signal we have data for in the current scope. Used to grey out
  // period buttons whose window pre-dates any recorded signal — a 5Y button
  // on 26 days of data would be a fabrication.
  const [earliestTimestamp, setEarliestTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (p: Period, off: number, pair: string, direction: DirectionFilter, s: Scope, c: CategoryFilter, isCancelled: () => boolean) => {
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

      const [historyRes, leaderboardRes] = await Promise.allSettled([
        fetch(`/api/signals/history?${historyParams.toString()}`),
        fetch(`/api/leaderboard?${leaderboardParams.toString()}`),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        if (isCancelled()) return;
        setStats(data.stats ?? null);
        setRecords(data.records ?? []);
        setTotal(data.total ?? 0);
        setEarliestTimestamp(typeof data.earliestTimestamp === 'number' ? data.earliestTimestamp : null);
        setRollingWinRates(data.rollingWinRates ?? null);
      } else if (!isCancelled()) {
        setStats(null);
        setRecords([]);
        setTotal(0);
        setEarliestTimestamp(null);
        setRollingWinRates(null);
      }

      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const data = await leaderboardRes.value.json();
        if (isCancelled()) return;
        setLeaderboard(data);
      } else if (!isCancelled()) {
        setLeaderboard(null);
      }

    } catch {
      if (isCancelled()) return;
      setStats(null);
      setRecords([]);
      setTotal(0);
      setEarliestTimestamp(null);
      setRollingWinRates(null);
      setLeaderboard(null);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchData(period, offset, pairFilter, directionFilter, scope, category, () => cancelled);
    return () => { cancelled = true; };
  }, [period, offset, pairFilter, directionFilter, scope, category, fetchData]);

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
    () => getResolutionHeartbeat(leaderboard?.overall.lastUpdated, now, t),
    [leaderboard?.overall.lastUpdated, now, t],
  );
  const categoryCaption = useMemo(() => {
    if (category === 'majors') {
      return formatMessage(t.categoryCaption.majors, { count: symbolsForCategory('majors').length });
    }
    if (category === 'thematic') {
      return formatMessage(t.categoryCaption.thematic, { count: symbolsForCategory('thematic').length });
    }
    if (scope === 'broadcast') return t.categoryCaption.broadcast;
    return t.categoryCaption.eligible;
  }, [category, scope, t]);
  const hasResolvedEvidence = (stats?.resolved ?? 0) > 0;

  const handleCategoryChange = (nextCategory: CategoryFilter) => {
    setCategory(nextCategory);
    setPairFilter('ALL');
  };

  return (
    <div className="premium-product-shell relative isolate min-h-[100dvh] overflow-hidden text-[var(--foreground)]">
      <BackgroundDecor variant="track-record" />
      <PageNavBar />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">
        <EvidenceSurfaceNav active="record" />

        {/* Observed record header. Counted outcomes lead the hierarchy; unsized
            price statistics remain visible without reading as account P&L. */}
        <div className="relative isolate mb-6">
          <ProductHeroBackdrop
            src="/brand/hero/tradeclaw-replay-evidence-chamber-v1.webp"
            testId="track-record-hero-art"
            className="product-hero-backdrop--quiet"
          />
          <div className="relative z-10">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold mb-2">
            {t.header.eyebrow}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight tabular-nums text-[var(--foreground)] sm:text-6xl">
                {stats ? numberFormatter.format(stats.resolved) : '—'}
              </span>
              <span className="text-sm text-[var(--text-secondary)] inline-flex items-center gap-1">
                {t.header.resolvedSignals}
                <InfoHint text={t.hints.resolved} label={t.header.resolvedHelp} />
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                {periodWindowLabel(period, earliestTimestamp, locale, t)}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-zinc-200">
                {hasResolvedEvidence && stats ? `${stats.winRate}%` : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                {t.header.winRate}
                <InfoHint text={t.hints.winRate24h} label={t.header.winRateHelp} />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-semibold tabular-nums ${
                !hasResolvedEvidence || !stats
                  ? 'text-[var(--foreground)]'
                  : stats.avgPnlPct > 0
                    ? 'text-emerald-400'
                    : stats.avgPnlPct < 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
              }`}>
                {hasResolvedEvidence && stats
                  ? `${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%`
                  : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                {t.stats.averagePnl}
                <InfoHint text={t.hints.averagePnl} label={t.stats.averagePnl} />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-semibold tabular-nums ${
                !hasResolvedEvidence || !stats
                  ? 'text-[var(--foreground)]'
                  : stats.totalPnlPct > 0
                    ? 'text-emerald-400'
                    : stats.totalPnlPct < 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
              }`}>
                {hasResolvedEvidence && stats
                  ? `${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%`
                  : '—'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1">
                {t.header.priceMoveSum}
                <InfoHint text={t.hints.priceMoveSum} label={t.header.priceMoveHelp} />
              </span>
            </div>
            {resolutionHeartbeat && (
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-mono text-zinc-300"
              >
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                <span>{t.header.latestOutcome}</span>
                <span className="text-[var(--text-secondary)]">
                  {resolutionHeartbeat.ageLabel}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <EmbedButton embedPath="/embed/track-record" label={t.header.embed} width={600} height={360} />
            <ShareOnX
              winRate={stats?.winRate}
              resolved={stats?.resolved}
              period={period}
              label={t.header.shareX}
            />
            <ShareLinkedIn
              winRate={stats?.winRate}
              resolved={stats?.resolved}
              period={period}
              label={t.header.shareLinkedIn}
            />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {t.header.headlineDisclosure}
          </p>
          <p className="mt-3 rounded-md border border-zinc-600/30 bg-zinc-800/20 px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            <strong className="font-semibold text-[var(--foreground)]">{t.header.riskLabel}</strong>{' '}
            {t.header.riskBody}
          </p>
          {rollingWinRates && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(['7d', '30d', '90d'] as const).map((window) => {
                const snap = rollingWinRates[window];
                const winTone = snap.resolvedSignals > 0 ? 'text-zinc-200' : 'text-zinc-500';
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
                      {formatMessage(t.rolling.title, { window })}
                      {isThinWindow && (
                        <span className="ms-1 normal-case text-amber-400/80">
                          {formatMessage(t.rolling.onlyDays, { count: dataAgeDays ?? 0 })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className={`text-2xl font-bold tabular-nums ${winTone}`}>
                        {snap.resolvedSignals > 0 ? `${snap.winRate}%` : '—'}
                      </div>
                      <div className="text-end text-[10px] font-mono text-[var(--text-secondary)]">
                        <div>{formatMessage(t.rolling.resolved, { count: snap.resolvedSignals })}</div>
                        <div>{formatMessage(t.rolling.total, { count: snap.totalSignals })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        <EvidenceFilters
          period={period}
          onPeriodChange={setPeriod}
          earliestTimestamp={earliestTimestamp}
          scope={scope}
          onScopeChange={setScope}
          category={category}
          onCategoryChange={handleCategoryChange}
          t={t}
        />
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          {categoryCaption}
        </p>

        {/* Observed category comparison; no modeled R or break-even fields. */}
        <CategoryBreakdownRow
          period={period}
          scope={scope}
          active={category}
          onSelect={handleCategoryChange}
          t={t}
          language={language}
        />

        {/* Scope disclaimer — explains what the viewer is looking at */}
        {scope === 'pro' ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-300">
              <span>
                {t.scope.eligibleCaption}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span>
                {t.scope.broadcastCaption}
              </span>
            </div>
            <button
              onClick={() => setScope('pro')}
              className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-white/[0.06]"
            >
                {t.scope.showEligible}
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
                label={t.stats.resolved}
                value={numberFormatter.format(stats.resolved)}
                hint={t.stats.resolvedHint}
                tooltip={t.hints.resolved}
              />
              <StatCard
                label={t.stats.averagePnl}
                value={hasResolvedEvidence ? `${stats.avgPnlPct >= 0 ? '+' : ''}${stats.avgPnlPct}%` : '—'}
                accent={hasResolvedEvidence ? (stats.avgPnlPct >= 0 ? 'emerald' : 'red') : 'default'}
                hint={t.stats.averagePnlHint}
                tooltip={t.hints.averagePnl}
              />
              <StatCard
                label={t.stats.priceMoveSum}
                value={hasResolvedEvidence ? `${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%` : '—'}
                accent={hasResolvedEvidence ? (stats.totalPnlPct >= 0 ? 'emerald' : 'red') : 'default'}
                hint={t.stats.priceMoveSumHint}
                tooltip={t.hints.priceMoveSum}
              />
              <StatCard
                label={t.stats.streak}
                value={hasResolvedEvidence ? `${stats.streak > 0 ? '+' : ''}${stats.streak}` : '—'}
                accent={hasResolvedEvidence && stats.streak > 0 ? 'emerald' : hasResolvedEvidence && stats.streak < 0 ? 'red' : 'default'}
                hint={t.stats.streakHint}
                tooltip={t.hints.streak}
              />
            </div>
            {(stats.expired > 0 || stats.gateBlocked > 0 || stats.pending > 0) && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                <StatCard
                  label={t.stats.unusableOutcome}
                  value={numberFormatter.format(stats.expired)}
                  hint={t.stats.unusableOutcomeHint}
                  tooltip={t.hints.unusableOutcome}
                />
                <StatCard
                  label={t.stats.gateBlocked}
                  value={numberFormatter.format(stats.gateBlocked)}
                  hint={t.stats.gateBlockedHint}
                  tooltip={t.hints.gateBlocked}
                />
                <StatCard
                  label={t.stats.pending}
                  value={numberFormatter.format(stats.pending)}
                  hint={t.stats.pendingHint}
                  tooltip={t.hints.pending}
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
        <div className="glass-card rounded-2xl p-5 mb-8 border-s-2 border-emerald-500/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold mb-0.5">{t.alerts.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {t.alerts.detail}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://t.me/tradeclawwin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
              >
                {t.alerts.openTelegram}
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                {t.alerts.signalDashboard}
              </Link>
            </div>
          </div>
        </div>

        {/* Strategy Leaderboard proof card — reinforces Sharpe-first ranking */}
        <div className="glass-card rounded-2xl p-5 mb-8 border-s-2 border-emerald-500/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold mb-0.5">{t.research.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {t.research.detail}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/track-record/study"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
              >
                {t.surfaces.studyLabel}
              </Link>
              <Link
                href="/strategies/leaderboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                {t.research.viewLeaderboard}
              </Link>
              <Link
                href="/strategies"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-[var(--foreground)] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                {t.research.browseStrategies}
              </Link>
            </div>
          </div>
        </div>

        {/* Per-Symbol Breakdown */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold">
              {t.sections.perSymbol}
            </h2>
            {/* Date range the hit-rates below cover, for the selected period. */}
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {periodWindowLabel(period, earliestTimestamp, locale, t)}
            </span>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-start font-medium">{t.columns.pair}</th>
                    <th className="px-3 py-2.5 text-center font-medium">{t.columns.recordedRows}</th>
                    <th className="w-28 px-3 py-2.5 text-start font-medium">
                      <span className="inline-flex items-center gap-1">{t.columns.hit4h} <InfoHint text={t.hints.winRate4h} label={formatMessage(t.aria.whatMeans, { label: t.columns.hit4h })} /></span>
                    </th>
                    <th className="w-28 px-3 py-2.5 text-start font-medium">
                      <span className="inline-flex items-center gap-1">{t.columns.hit24h} <InfoHint text={t.hints.winRate24h} label={formatMessage(t.aria.whatMeans, { label: t.columns.hit24h })} /></span>
                    </th>
                    <th className="px-3 py-2.5 text-end font-medium">
                      <span className="inline-flex items-center justify-end gap-1">{t.columns.averagePnl} <InfoHint text={t.hints.averagePnl} label={formatMessage(t.aria.whatMeans, { label: t.columns.averagePnl })} /></span>
                    </th>
                    <th className="hidden px-3 py-2.5 text-end font-medium sm:table-cell">
                      <span className="inline-flex items-center justify-end gap-1">{t.columns.priceMoveSum} <InfoHint text={t.hints.priceMoveSum} label={formatMessage(t.aria.whatMeans, { label: t.columns.priceMoveSum })} /></span>
                    </th>
                    <th className="hidden px-3 py-2.5 text-center font-medium sm:table-cell">{t.columns.trend}</th>
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
                      <td className={`px-3 py-2.5 text-end tabular-nums font-semibold ${
                        asset.resolved24h === 0 ? 'text-zinc-500' : asset.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.resolved24h > 0
                          ? `${asset.avgPnl >= 0 ? '+' : ''}${asset.avgPnl.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-end tabular-nums font-semibold hidden sm:table-cell ${
                        asset.resolved24h === 0 ? 'text-zinc-500' : asset.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.resolved24h > 0
                          ? `${asset.totalPnl >= 0 ? '+' : ''}${asset.totalPnl.toFixed(2)}%`
                          : '—'}
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
                      <td className="px-3 py-3"><div className="h-3 w-10 bg-white/[0.06] rounded animate-pulse ms-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-10 bg-white/[0.06] rounded animate-pulse ms-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))}
                  {!loading && leaderboard?.assets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        {t.table.noPeriodData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recorded signal rows in the selected scope */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-mono font-semibold">
              {t.sections.recordedRows}
            </h2>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {total > 0
                ? formatMessage(t.table.range, {
                    from: offset + 1,
                    to: Math.min(offset + PAGE_SIZE, total),
                    total,
                  })
                : ''}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04]">
              <span className="px-2 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-mono">{t.filters.pair}</span>
              <select
                value={pairFilter}
                onChange={e => setPairFilter(e.target.value)}
                aria-label={t.aria.filterPair}
                className="bg-transparent text-xs font-mono text-[var(--foreground)] px-2 py-1 rounded-md hover:bg-white/[0.06] focus:outline-none focus:bg-white/[0.06] cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--background)]">{t.filters.all}</option>
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
                  {d === 'ALL' ? t.status.all : d === 'BUY' ? t.status.buy : t.status.sell}
                </button>
              ))}
            </div>
            {(pairFilter !== 'ALL' || directionFilter !== 'ALL') && (
              <button
                onClick={() => { setPairFilter('ALL'); setDirectionFilter('ALL'); }}
                className="px-3 py-1.5 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                {t.filters.clear}
              </button>
            )}
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <th className="px-4 py-2.5 text-start font-medium">
                      <span className="inline-flex items-center gap-1">
                        {t.columns.barOpen}
                        <InfoHint
                          text={t.table.barOpenHelp}
                          label={formatMessage(t.aria.whatMeans, { label: t.columns.barOpen })}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-start font-medium">{t.columns.pair}</th>
                    <th className="px-3 py-2.5 text-center font-medium">{t.columns.direction}</th>
                    <th className="hidden px-3 py-2.5 text-end font-medium sm:table-cell">{t.columns.entry}</th>
                    <th className="px-3 py-2.5 text-center font-medium">4h</th>
                    <th className="px-3 py-2.5 text-center font-medium">24h</th>
                    <th className="px-4 py-2.5 text-end font-medium">{t.columns.pnl}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const outcome24h = r.outcomes['24h'];
                    const outcome4h = r.outcomes['4h'];
                    const verified4h = isObservedOHLCVOutcomeSource(outcome4h?.source);
                    const verified24h = isObservedOHLCVOutcomeSource(outcome24h?.source);
                    const outcome4hStatus = outcome4h != null ? deriveHistoricalOutcomeStatus(outcome4h) : null;
                    const outcome24hStatus = outcome24h != null ? deriveHistoricalOutcomeStatus(outcome24h) : null;
                    const pnl = verified24h
                      ? outcome24h?.pnlPct ?? null
                      : verified4h
                        ? outcome4h?.pnlPct ?? null
                        : null;
                    const now = Date.now();
                    const isPending24h = isPendingHistoricalOutcome(outcome24h, r.timestamp, 24 * 60 * 60 * 1000, now);
                    const isExpired24h = isExpiredHistoricalOutcome(outcome24h, r.timestamp, 24 * 60 * 60 * 1000, now);
                    const isPending = isPending24h && outcome4h == null;
                    const outcome4hCell = formatOutcomeCell(
                      outcome4h,
                      outcome4hStatus,
                      isPending,
                      isExpiredHistoricalOutcome(outcome4h, r.timestamp, 4 * 60 * 60 * 1000, now),
                      t,
                    );
                    const outcome24hCell = formatOutcomeCell(outcome24h, outcome24hStatus, isPending24h, isExpired24h, t);
                    const formattedTime = formatTime(r.timestamp, locale);
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
                        aria-label={formatMessage(t.aria.viewSignal, {
                          pair: r.pair,
                          direction: r.direction === 'BUY' ? t.status.buy : t.status.sell,
                          time: formattedTime,
                        })}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none cursor-pointer transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]"><bdi>{formattedTime}</bdi></td>
                        <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]"><bdi>{r.pair}</bdi></td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={r.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
                            {r.direction === 'BUY' ? t.status.buy : t.status.sell}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2.5 text-end tabular-nums text-[var(--text-secondary)] sm:table-cell" dir="ltr">{formatPrice(r.entryPrice, locale)}</td>
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
                        <td className={`px-4 py-2.5 text-end tabular-nums font-semibold ${
                          pnl == null ? 'text-zinc-600' : pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {outcome24hStatus === 'expired' && outcome24h?.pnlPct === 0
                            ? t.status.expired
                            : !verified24h && !verified4h && (outcome24h || outcome4h)
                            ? t.status.unverified
                            : pnl == null
                            ? (isPending ? t.status.pending : isExpired24h ? t.status.expired : '—')
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
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse ms-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-6 bg-white/[0.06] rounded animate-pulse mx-auto" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-12 bg-white/[0.06] rounded animate-pulse ms-auto" /></td>
                    </tr>
                  ))}
                  {!loading && records.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        {pairFilter !== 'ALL' || directionFilter !== 'ALL'
                          ? t.table.noMatchingSignals
                          : t.table.noPeriodSignals}
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
                  aria-label={t.table.firstPage}
                  className="px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={currentPage === 1 || loading}
                  aria-label={t.table.previousPage}
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
                  aria-label={t.table.nextPage}
                  className="px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setOffset((totalPages - 1) * PAGE_SIZE)}
                  disabled={currentPage === totalPages || loading}
                  aria-label={t.table.lastPage}
                  className="px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Transparency Note */}
        <div className="glass-card rounded-2xl p-5 border-s-2 border-emerald-500/50 mb-8">
          <h3 className="text-sm font-semibold mb-1">{t.sections.population}</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t.populationBody}
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
  const { locale } = useLocale();
  const t = getTrackRecordTranslations(locale);
  const valueColor =
    accent === 'emerald' ? 'text-emerald-400'
    : accent === 'red' ? 'text-red-400'
    : accent === 'yellow' ? 'text-zinc-400'
    : 'text-[var(--foreground)]';

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-1 inline-flex items-center gap-1">
        {label}
        {tooltip && (
          <InfoHint text={tooltip} label={formatMessage(t.aria.whatMeans, { label })} />
        )}
      </div>
      <div className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-zinc-600 mt-1">{hint}</div>
      )}
    </div>
  );
}

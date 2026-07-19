'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { ScreenerResult, ScreenerMeta } from '../api/screener/route';
import { SYMBOLS } from '../lib/symbol-config';
import { SparklineChart } from '../components/charts';
import { PageNavBar } from '../../components/PageNavBar';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';
import { useLocale } from '../components/locale-provider';
import { formatMessage } from '../../lib/product-i18n/format';
import {
  getScreenerTranslations,
  type ScreenerTranslations,
} from '../../lib/product-i18n/screener';
import { getHtmlLanguage } from '../../lib/translations';
import { isHighRuleScore } from '../../lib/signal-thresholds';

// ─── Types ────────────────────────────────────────────────────

type SortKey = 'symbol' | 'price' | 'confidence' | 'rsi' | 'macdHistogram';
type SortDir = 'asc' | 'desc';
type MACDFilter = 'any' | 'bullish' | 'bearish';
type EMAFilter = 'any' | 'above_ema20' | 'below_ema20' | 'golden_cross';
type DirectionFilter = 'all' | 'BUY' | 'SELL';
type Timeframe = 'H1' | 'H4' | 'D1';

interface Filters {
  rsiMin: number;
  rsiMax: number;
  macdFilter: MACDFilter;
  emaFilter: EMAFilter;
  minConfidence: number;
  timeframe: Timeframe;
  direction: DirectionFilter;
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtPrice(n: number, language: string): string {
  const fractionDigits = n >= 1000 ? 2 : n >= 1 ? 4 : 5;
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

function confColor(v: number): string {
  if (isHighRuleScore(v)) return 'from-emerald-500 to-emerald-400';
  if (v >= 60) return 'from-zinc-500 to-zinc-400';
  return 'from-rose-500 to-rose-400';
}

function confTextColor(v: number): string {
  if (isHighRuleScore(v)) return 'text-emerald-400';
  if (v >= 60) return 'text-zinc-400';
  return 'text-rose-400';
}

// ─── Sparkline (lightweight-charts) ──────────────────────────

// ─── Sort Icon ────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span aria-hidden="true" className={`ms-1 text-[10px] inline-block ${active ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⬍'}
    </span>
  );
}

// ─── MACD Mini Bar ────────────────────────────────────────────

function MACDBar({ value }: { value: number }) {
  const abs = Math.min(Math.abs(value) * 2000, 100);
  const color = value > 0 ? 'bg-emerald-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1">
      <div className="relative h-3 w-12 bg-[var(--glass-bg)] rounded-sm overflow-hidden flex items-center">
        <div
          className={`absolute h-full rounded-sm ${color} transition-all duration-300`}
          style={{ width: `${abs}%` }}
        />
      </div>
      <bdi dir="ltr" className={`text-[10px] font-mono tabular-nums ${value > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(4)}
      </bdi>
    </div>
  );
}

function SortableHeader({
  label,
  value,
  activeValue,
  direction,
  onSort,
  align = 'start',
  className = '',
}: {
  label: string;
  value: SortKey;
  activeValue: SortKey;
  direction: SortDir;
  onSort: (value: SortKey) => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  const active = activeValue === value;
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(value)}
        className={`inline-flex w-full items-center hover:text-[var(--foreground)] ${align === 'end' ? 'justify-end' : 'justify-start'}`}
      >
        {label}
        <SortIcon active={active} dir={direction} />
      </button>
    </th>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────

function ConfidenceBar({
  value,
  copy,
  showExplainer = false,
}: {
  value: number;
  copy: ScreenerTranslations['score'];
  showExplainer?: boolean;
}) {
  const explainer = isHighRuleScore(value)
    ? copy.high
    : value >= 60
      ? copy.mid
      : copy.low;
  return (
    <div>
      <div className="flex items-center gap-2 min-w-[90px]">
        <div className="relative flex-1 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
          <div
            className={`absolute h-full rounded-full bg-gradient-to-r ${confColor(value)} transition-all duration-700`}
            style={{ width: `${value}%` }}
          />
        </div>
        <bdi dir="ltr" className={`text-[11px] font-mono font-semibold tabular-nums w-12 text-end ${confTextColor(value)}`}>
          {value}/100
        </bdi>
      </div>
      {showExplainer && (
        <p className="text-[9px] text-[var(--text-secondary)] mt-1 font-mono">{explainer}</p>
      )}
    </div>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────

function SignalBadge({
  direction,
  copy,
}: {
  direction: 'BUY' | 'SELL';
  copy: Pick<ScreenerTranslations['options'], 'buy' | 'sell'>;
}) {
  if (direction === 'BUY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
        <span aria-hidden="true">▲</span>
        <span>{copy.buy}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold shadow-[0_0_8px_rgba(244,63,94,0.2)]">
      <span aria-hidden="true">▼</span>
      <span>{copy.sell}</span>
    </span>
  );
}

// ─── Stats Card ───────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{label}</div>
      <bdi dir="auto" className={`text-base font-bold font-mono tabular-nums ${color ?? 'text-[var(--foreground)]'}`}>{value}</bdi>
      {sub && <bdi dir="auto" className="text-[10px] text-[var(--text-secondary)]">{sub}</bdi>}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────

function RangeSlider({
  label, minAriaLabel, maxAriaLabel, min, max, valueMin, valueMax, onChangeMin, onChangeMax,
}: {
  label: string; minAriaLabel: string; maxAriaLabel: string;
  min: number; max: number; valueMin: number; valueMax: number;
  onChangeMin: (v: number) => void; onChangeMax: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{label}</span>
        <bdi dir="ltr" className="text-[10px] font-mono text-[var(--text-secondary)]">{valueMin}–{valueMax}</bdi>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} value={valueMin}
          aria-label={minAriaLabel}
          onChange={e => onChangeMin(parseInt(e.target.value))}
          className="flex-1 accent-emerald-500 h-1"
        />
        <input
          type="range" min={min} max={max} value={valueMax}
          aria-label={maxAriaLabel}
          onChange={e => onChangeMax(parseInt(e.target.value))}
          className="flex-1 accent-emerald-500 h-1"
        />
      </div>
    </div>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────

function FilterPill<T extends string>({
  value, options, onChange, ariaLabel,
}: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1 bg-white/[0.03] rounded-lg p-1 border border-[var(--border)]">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 ${
            value === o.value
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Mobile Screener Card ────────────────────────────────────

function translateEmaStatus(status: string, copy: ScreenerTranslations['emaStatus']): string {
  switch (status) {
    case 'Golden Cross': return copy.goldenCross;
    case 'Death Cross': return copy.deathCross;
    case 'Above EMA20': return copy.aboveEma20;
    case 'Below EMA20': return copy.belowEma20;
    default: return copy.mixed;
  }
}

function ScreenerCard({
  r,
  watchlist,
  toggleWatchlist,
  copy,
  language,
}: {
  r: ScreenerResult;
  watchlist: Set<string>;
  toggleWatchlist: (s: string) => void;
  copy: ScreenerTranslations;
  language: string;
}) {
  const watchlistLabel = formatMessage(
    watchlist.has(r.symbol) ? copy.aria.removeSymbolFromWatchlist : copy.aria.addSymbolToWatchlist,
    { symbol: r.symbol },
  );

  return (
    <div className="glass-card rounded-xl p-4">
      {/* Row 1: Symbol + Signal + Watchlist */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div>
            <bdi dir="ltr" className="text-sm font-mono font-bold text-[var(--foreground)]">{r.symbol}</bdi>
            <bdi dir="auto" className="text-[10px] text-[var(--text-secondary)] ms-1.5">{r.name}</bdi>
          </div>
          <SignalBadge direction={r.direction} copy={copy.options} />
        </div>
        <button
          onClick={() => toggleWatchlist(r.symbol)}
          aria-label={watchlistLabel}
          title={watchlistLabel}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            watchlist.has(r.symbol) ? 'text-zinc-400 bg-zinc-500/10' : 'text-[var(--text-secondary)]'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={watchlist.has(r.symbol) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      {/* Row 2: Price + Timeframe */}
      <div className="flex items-center justify-between mb-3">
        <bdi dir="ltr" className="text-lg font-mono font-bold text-[var(--foreground)] tabular-nums">{fmtPrice(r.price, language)}</bdi>
        <bdi dir="ltr" className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--glass-bg)] px-2 py-1 rounded">{r.timeframe}</bdi>
      </div>

      {/* Row 3: Confidence bar */}
      <div className="mb-3">
        <ConfidenceBar value={r.confidence} copy={copy.score} showExplainer />
      </div>

      {/* Row 4: Indicators grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/[0.02] rounded-lg py-1.5 px-2 text-center">
          <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">RSI</div>
          <bdi dir="ltr" className={`text-xs font-mono tabular-nums font-semibold ${
            r.rsi < 30 ? 'text-emerald-400' : r.rsi > 70 ? 'text-rose-400' : 'text-[var(--text-secondary)]'
          }`}>{r.rsi.toFixed(1)}</bdi>
        </div>
        <div className="bg-white/[0.02] rounded-lg py-1.5 px-2 text-center">
          <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">MACD</div>
          <bdi dir="ltr" className={`text-xs font-mono tabular-nums font-semibold ${r.macdHistogram > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {r.macdHistogram >= 0 ? '+' : ''}{r.macdHistogram.toFixed(4)}
          </bdi>
        </div>
        <div className="bg-white/[0.02] rounded-lg py-1.5 px-2 text-center">
          <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">EMA</div>
          <span className={`text-[10px] font-medium ${
            r.emaStatus === 'Golden Cross' ? 'text-emerald-400' :
            r.emaStatus === 'Death Cross' ? 'text-rose-400' :
            r.emaStatus === 'Above EMA20' ? 'text-sky-400' :
            'text-[var(--text-secondary)]'
          }`}><bdi dir="auto">{translateEmaStatus(r.emaStatus, copy.emaStatus)}</bdi></span>
        </div>
      </div>

      {/* Row 5: Sparkline */}
      <div className="mb-3">
        <div role="img" aria-label={formatMessage(copy.aria.priceChartFor, { symbol: r.symbol })}>
          <SparklineChart prices={r.sparkline} direction={r.direction} />
        </div>
      </div>

      {/* Row 6: Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/signal/${r.signalId}`}
          className="flex-1 text-center px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors hover:bg-emerald-500/20"
        >
          {copy.actions.viewSignal}
        </Link>
        <Link
          href={`/alerts?symbol=${r.symbol}`}
          className="px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium transition-colors hover:text-[var(--foreground)]"
        >
          {copy.actions.alert}
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────

const SKELETON_WIDTHS = [60, 45, 72, 55, 68, 40, 58, 75];

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.03]">
      {SKELETON_WIDTHS.map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[var(--glass-bg)] rounded animate-pulse" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function ScreenerClient() {
  const { locale } = useLocale();
  const copy = getScreenerTranslations(locale);
  const language = getHtmlLanguage(locale);
  const numberFormatter = new Intl.NumberFormat(language);
  const [filters, setFilters] = useState<Filters>({
    rsiMin: 20,
    rsiMax: 80,
    macdFilter: 'any',
    emaFilter: 'any',
    minConfidence: 70,
    timeframe: 'H1',
    direction: 'all',
  });

  useEffect(() => {
    document.title = copy.documentTitle;
  }, [copy.documentTitle]);

  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [meta, setMeta] = useState<ScreenerMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('confidence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('screener-watchlist');
      if (stored) setWatchlist(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore
    }
  }, []);

  // Auto-scan on mount so users see results immediately
  useEffect(() => {
    scan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-scan when filters change after the first scan (debounced) — the
  // empty-state rescue buttons depend on this to actually fetch new results.
  const filtersTouchedRef = useRef(false);
  useEffect(() => {
    if (!filtersTouchedRef.current) {
      filtersTouchedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void scan();
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveWatchlist(next: Set<string>) {
    setWatchlist(next);
    try {
      localStorage.setItem('screener-watchlist', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  }

  function toggleWatchlist(symbol: string) {
    const next = new Set(watchlist);
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    saveWatchlist(next);
  }

  const scanSeqRef = useRef(0);
  const scan = useCallback(async () => {
    const seq = ++scanSeqRef.current;
    setLoading(true);
    setHasScanned(true);
    try {
      const params = new URLSearchParams({
        rsiMin: filters.rsiMin.toString(),
        rsiMax: filters.rsiMax.toString(),
        macdFilter: filters.macdFilter,
        emaFilter: filters.emaFilter,
        minConfidence: filters.minConfidence.toString(),
        timeframe: filters.timeframe,
        direction: filters.direction,
      });
      const res = await fetch(`/api/screener?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { results: ScreenerResult[]; meta: ScreenerMeta };
      if (seq !== scanSeqRef.current) return; // a newer scan superseded this response
      setResults(data.results);
      setMeta(data.meta);
      setScanError(false);
    } catch {
      if (seq === scanSeqRef.current) {
        // A failed scan is a server problem, not a filter problem — clear the
        // stale tiles and flag it so the empty state doesn't blame the user.
        setResults([]);
        setMeta(null);
        setScanError(true);
      }
    } finally {
      if (seq === scanSeqRef.current) setLoading(false);
    }
  }, [filters]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function patchFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, [key]: value }));
  }

  function exportCSV() {
    if (sorted.length === 0) return;
    const headers = [
      'Symbol',
      'Name',
      'Direction',
      'Rule score (0-100)',
      'Price',
      'RSI',
      'MACD Histogram',
      'MACD Signal',
      'EMA20',
      'EMA50',
      'EMA Status',
      'Timeframe',
      'Signal ID',
    ];
    const escape = (v: string | number) => {
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = sorted.map(r => [
      r.symbol,
      r.name,
      r.direction,
      r.confidence,
      r.price,
      r.rsi.toFixed(2),
      r.macdHistogram.toFixed(6),
      r.macdSignal,
      r.ema20,
      r.ema50,
      r.emaStatus,
      r.timeframe,
      r.signalId,
    ].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `tradeclaw-screener-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const sorted = [...results]
    .filter(r => !watchlistOnly || watchlist.has(r.symbol))
    .sort((a, b) => {
      let va: number | string = a[sortKey];
      let vb: number | string = b[sortKey];
      if (sortKey === 'symbol') {
        return sortDir === 'asc'
          ? (va as string).localeCompare(vb as string)
          : (vb as string).localeCompare(va as string);
      }
      va = va as number;
      vb = vb as number;
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  function getWatchlistLabel(symbol: string): string {
    return formatMessage(
      watchlist.has(symbol) ? copy.aria.removeSymbolFromWatchlist : copy.aria.addSymbolToWatchlist,
      { symbol },
    );
  }

  return (
    <div className="premium-product-shell relative isolate min-h-[100dvh] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />

      <div className="relative max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          <strong>{copy.provenance.title}</strong>
          <span aria-hidden="true"> — </span>
          <span>{copy.provenance.detail}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 7 22 7 22 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-xl font-bold tracking-tight">{copy.title}</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatMessage(copy.subtitle, { count: numberFormatter.format(SYMBOLS.length) })}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="glass-card rounded-2xl p-4 mb-6 border border-[var(--border)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* RSI Range */}
            <RangeSlider
              label={copy.filters.rsiRange}
              minAriaLabel={copy.aria.rsiMinimum}
              maxAriaLabel={copy.aria.rsiMaximum}
              min={0} max={100}
              valueMin={filters.rsiMin}
              valueMax={filters.rsiMax}
              onChangeMin={v => patchFilter('rsiMin', Math.min(v, filters.rsiMax - 1))}
              onChangeMax={v => patchFilter('rsiMax', Math.max(v, filters.rsiMin + 1))}
            />

            {/* Confidence Threshold */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.filters.minRuleScore}</span>
                <bdi dir="ltr" className="text-[10px] font-mono text-[var(--text-secondary)]">{filters.minConfidence}/100</bdi>
              </div>
              <input
                type="range" min={0} max={100} value={filters.minConfidence}
                aria-label={copy.aria.minimumRuleScore}
                onChange={e => patchFilter('minConfidence', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1"
              />
            </div>

            {/* Timeframe */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.filters.timeframe}</span>
              <FilterPill<Timeframe>
                value={filters.timeframe}
                ariaLabel={copy.filters.timeframe}
                options={[
                  { value: 'H1', label: 'H1' },
                  { value: 'H4', label: 'H4' },
                  { value: 'D1', label: 'D1' },
                ]}
                onChange={v => patchFilter('timeframe', v)}
              />
            </div>

            {/* MACD Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.filters.macd}</span>
              <FilterPill<MACDFilter>
                value={filters.macdFilter}
                ariaLabel={copy.filters.macd}
                options={[
                  { value: 'any', label: copy.options.any },
                  { value: 'bullish', label: copy.options.bullish },
                  { value: 'bearish', label: copy.options.bearish },
                ]}
                onChange={v => patchFilter('macdFilter', v)}
              />
            </div>

            {/* EMA Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.filters.emaPosition}</span>
              <FilterPill<EMAFilter>
                value={filters.emaFilter}
                ariaLabel={copy.filters.emaPosition}
                options={[
                  { value: 'any', label: copy.options.any },
                  { value: 'above_ema20', label: copy.options.aboveEma20 },
                  { value: 'below_ema20', label: copy.options.belowEma20 },
                  { value: 'golden_cross', label: copy.options.goldenCross },
                ]}
                onChange={v => patchFilter('emaFilter', v)}
              />
            </div>

            {/* Direction Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.filters.direction}</span>
              <FilterPill<DirectionFilter>
                value={filters.direction}
                ariaLabel={copy.filters.direction}
                options={[
                  { value: 'all', label: copy.options.all },
                  { value: 'BUY', label: copy.options.buy },
                  { value: 'SELL', label: copy.options.sell },
                ]}
                onChange={v => patchFilter('direction', v)}
              />
            </div>
          </div>

          {/* Scan Button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWatchlistOnly(w => !w)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium border transition-all ${
                  watchlistOnly
                    ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                    : 'bg-white/[0.03] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={watchlistOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {copy.actions.watchlistOnly}
                {watchlist.size > 0 && <span className="px-1.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[9px] font-bold">{numberFormatter.format(watchlist.size)}</span>}
              </button>

              <button
                onClick={exportCSV}
                disabled={sorted.length === 0}
                title={sorted.length === 0
                  ? copy.actions.noResultsToExport
                  : formatMessage(copy.actions.exportRows, { count: numberFormatter.format(sorted.length) })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium border bg-white/[0.03] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {copy.actions.exportCsv}
              </button>
            </div>

            <button
              onClick={scan}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black text-sm font-bold transition-all duration-150 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {copy.actions.scanning}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {copy.actions.scanNow}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {meta && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label={copy.stats.totalScanned} value={numberFormatter.format(meta.totalAssets)} sub={copy.stats.assetsTracked} />
            <StatCard
              label={copy.stats.matchingFilters}
              value={numberFormatter.format(meta.matching)}
              sub={formatMessage(copy.stats.ofAssets, { count: numberFormatter.format(meta.totalAssets) })}
              color="text-emerald-400"
            />
            <StatCard
              label={copy.stats.strongestSignal}
              value={meta.strongest ? `${meta.strongest.symbol}` : '—'}
              sub={meta.strongest
                ? formatMessage(copy.stats.strongestDetail, {
                    direction: meta.strongest.direction === 'BUY' ? copy.options.buy : copy.options.sell,
                    score: numberFormatter.format(meta.strongest.confidence),
                  })
                : copy.stats.noSignals}
              color={meta.strongest?.direction === 'BUY' ? 'text-emerald-400' : meta.strongest?.direction === 'SELL' ? 'text-rose-400' : 'text-[var(--text-secondary)]'}
            />
            <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.stats.bias}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {meta.mostBullish && (
                  <bdi dir="ltr" className="text-[10px] text-emerald-400 font-mono">▲ {meta.mostBullish}</bdi>
                )}
                {meta.mostBearish && (
                  <bdi dir="ltr" className="text-[10px] text-rose-400 font-mono">▼ {meta.mostBearish}</bdi>
                )}
                {!meta.mostBullish && !meta.mostBearish && (
                  <span className="text-[10px] text-[var(--text-secondary)]">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!hasScanned ? (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20 border border-[var(--border)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-[var(--text-secondary)] mb-4">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[var(--text-secondary)] text-sm font-medium">{copy.initial.title}</p>
            <p className="text-zinc-800 text-xs mt-1">{formatMessage(copy.initial.detail, { count: numberFormatter.format(SYMBOLS.length) })}</p>
          </div>
        ) : (
          <>
            {/* Mobile sort dropdown */}
            <div className="md:hidden mb-3 flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal">{copy.sort.label}</span>
              <select
                value={sortKey}
                aria-label={copy.sort.label}
                onChange={e => { setSortKey(e.target.value as SortKey); setSortDir('desc'); }}
                className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--foreground)] appearance-none"
              >
                <option value="confidence">{copy.sort.ruleScore}</option>
                <option value="symbol">{copy.sort.symbol}</option>
                <option value="price">{copy.sort.price}</option>
                <option value="rsi">RSI</option>
                <option value="macdHistogram">MACD</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]"
              >
                <span aria-hidden="true">{sortDir === 'desc' ? '▼' : '▲'}</span>{' '}
                {sortDir === 'desc' ? copy.sort.high : copy.sort.low}
              </button>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden">
              {loading && (
                <div className="grid grid-cols-1 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-[var(--glass-bg)] rounded mb-3 w-1/3" />
                      <div className="h-6 bg-[var(--glass-bg)] rounded mb-3 w-1/2" />
                      <div className="h-1.5 bg-[var(--glass-bg)] rounded mb-3" />
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <div key={j} className="h-10 bg-[var(--glass-bg)] rounded-lg" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && sorted.length === 0 && hasScanned && (
                <div className="text-center py-16 px-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--glass-bg)] border border-[var(--border)] mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                  {scanError ? (
                    <>
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">{copy.empty.scanFailed}</p>
                      <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
                        {copy.empty.scanFailedDetail}
                      </p>
                      <button
                        onClick={() => void scan()}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        {copy.actions.retryScan}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">{copy.empty.noMatches}</p>
                      <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-sm mx-auto">
                        {copy.empty.tooRestrictive}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => patchFilter('minConfidence', 50)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          {copy.empty.lowerScore}
                        </button>
                        <button
                          onClick={() => { patchFilter('rsiMin', 10); patchFilter('rsiMax', 90); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          {copy.empty.widenRsi}
                        </button>
                        <button
                          onClick={() => { patchFilter('direction', 'all'); patchFilter('macdFilter', 'any'); patchFilter('emaFilter', 'any'); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                        >
                          {copy.empty.resetFilters}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!loading && sorted.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {sorted.map(r => (
                    <ScreenerCard
                      key={`${r.symbol}-${r.signalId}`}
                      r={r}
                      watchlist={watchlist}
                      toggleWatchlist={toggleWatchlist}
                      copy={copy}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop table view */}
          <div className="hidden md:block glass-card rounded-2xl overflow-x-auto border border-[var(--border)]">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="px-4 py-3 text-start w-8">
                    <span className="sr-only">{copy.columns.watchlist}</span>
                  </th>
                  <SortableHeader label={copy.columns.symbol} value="symbol" activeValue={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader label={copy.columns.price} value="price" activeValue={sortKey} direction={sortDir} onSort={handleSort} align="end" />
                  <th scope="col" className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium">{copy.columns.signal}</th>
                  <SortableHeader label={copy.columns.ruleScore} value="confidence" activeValue={sortKey} direction={sortDir} onSort={handleSort} className="min-w-[120px]" />
                  <SortableHeader label="RSI" value="rsi" activeValue={sortKey} direction={sortDir} onSort={handleSort} align="end" />
                  <SortableHeader label="MACD" value="macdHistogram" activeValue={sortKey} direction={sortDir} onSort={handleSort} />
                  <th scope="col" className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium">{copy.columns.emaStatus}</th>
                  <th scope="col" className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium">{copy.columns.chart}</th>
                  <th scope="col" className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium">{copy.columns.timeframe}</th>
                  <th scope="col" className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-medium">{copy.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                }
                {!loading && sorted.map(r => (
                  <tr
                    key={`${r.symbol}-${r.signalId}`}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Watchlist star */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleWatchlist(r.symbol)}
                        aria-label={getWatchlistLabel(r.symbol)}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                          watchlist.has(r.symbol) ? 'text-zinc-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        }`}
                        title={getWatchlistLabel(r.symbol)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={watchlist.has(r.symbol) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    </td>

                    {/* Symbol */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <bdi dir="ltr" className="text-sm font-mono font-bold text-[var(--foreground)]">{r.symbol}</bdi>
                        <bdi dir="auto" className="text-[10px] text-[var(--text-secondary)]">{r.name}</bdi>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-end font-mono text-sm text-[var(--foreground)] tabular-nums">
                      <bdi dir="ltr">{fmtPrice(r.price, language)}</bdi>
                    </td>

                    {/* Signal */}
                    <td className="px-4 py-3 text-center">
                      <SignalBadge direction={r.direction} copy={copy.options} />
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3">
                      <ConfidenceBar value={r.confidence} copy={copy.score} />
                    </td>

                    {/* RSI */}
                    <td className="px-4 py-3 text-end">
                      <bdi dir="ltr" className={`text-xs font-mono tabular-nums ${
                        r.rsi < 30 ? 'text-emerald-400' : r.rsi > 70 ? 'text-rose-400' : 'text-[var(--text-secondary)]'
                      }`}>
                        {r.rsi.toFixed(1)}
                      </bdi>
                    </td>

                    {/* MACD */}
                    <td className="px-4 py-3">
                      <MACDBar value={r.macdHistogram} />
                    </td>

                    {/* EMA Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        r.emaStatus === 'Golden Cross' ? 'text-emerald-400 bg-emerald-500/10' :
                        r.emaStatus === 'Death Cross' ? 'text-rose-400 bg-rose-500/10' :
                        r.emaStatus === 'Above EMA20' ? 'text-sky-400 bg-sky-500/10' :
                        'text-[var(--text-secondary)] bg-[var(--glass-bg)]'
                      }`}>
                        <bdi dir="auto">{translateEmaStatus(r.emaStatus, copy.emaStatus)}</bdi>
                      </span>
                    </td>

                    {/* Sparkline */}
                    <td className="px-4 py-3">
                      <div role="img" aria-label={formatMessage(copy.aria.priceChartFor, { symbol: r.symbol })}>
                        <SparklineChart prices={r.sparkline} direction={r.direction} />
                      </div>
                    </td>

                    {/* Timeframe */}
                    <td className="px-4 py-3">
                      <bdi dir="ltr" className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--glass-bg)] px-1.5 py-0.5 rounded">
                        {r.timeframe}
                      </bdi>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/signal/${r.signalId}`}
                          className="px-2 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-colors whitespace-nowrap"
                        >
                          {copy.actions.view}
                        </Link>
                        <Link
                          href={`/alerts?symbol=${r.symbol}`}
                          className="px-2 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-colors whitespace-nowrap"
                        >
                          {copy.actions.alert}
                        </Link>
                        <button
                          onClick={() => toggleWatchlist(r.symbol)}
                          aria-label={getWatchlistLabel(r.symbol)}
                          title={getWatchlistLabel(r.symbol)}
                          className={`px-2 py-1 rounded-lg border text-[10px] transition-colors whitespace-nowrap ${
                            watchlist.has(r.symbol)
                              ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                              : 'bg-[var(--glass-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                          }`}
                        >
                          <span aria-hidden="true">{watchlist.has(r.symbol) ? '★' : '☆'}</span>{' '}
                          {copy.actions.watch}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && sorted.length === 0 && hasScanned && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] mb-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>
                      {scanError ? (
                        <>
                          <p className="text-sm font-medium text-[var(--foreground)] mb-1">{copy.empty.scanFailed}</p>
                          <p className="text-xs text-[var(--text-secondary)] mb-3">{copy.empty.scanFailedDetail}</p>
                          <button
                            onClick={() => void scan()}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            {copy.actions.retryScan}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[var(--foreground)] mb-1">{copy.empty.noMatches}</p>
                          <p className="text-xs text-[var(--text-secondary)] mb-3">{copy.empty.adjustHint}</p>
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => patchFilter('minConfidence', 50)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              {copy.empty.lowerScore}
                            </button>
                            <button
                              onClick={() => { patchFilter('rsiMin', 10); patchFilter('rsiMax', 90); }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              {copy.empty.widenRsi}
                            </button>
                            <button
                              onClick={() => { patchFilter('direction', 'all'); patchFilter('macdFilter', 'any'); patchFilter('emaFilter', 'any'); }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                            >
                              {copy.empty.resetFilters}
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Footer hint */}
        {hasScanned && !loading && (
          <p className="mt-4 text-[10px] text-zinc-800 text-center">
            {meta && (
              <>
                {formatMessage(copy.footer.scannedAt, {
                  time: new Date(meta.scannedAt).toLocaleTimeString(language),
                })}
                <span aria-hidden="true"> · </span>
              </>
            )}
            {copy.footer.sortHint}
            <span aria-hidden="true"> · </span>
            {copy.footer.watchHint}
          </p>
        )}
      </div>
    </div>
  );
}

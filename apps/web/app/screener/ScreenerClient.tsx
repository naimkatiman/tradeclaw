'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { ScreenerResult, ScreenerMeta } from '../api/screener/route';
import { SparklineChart } from '../components/charts';
import { PageNavBar } from '../../components/PageNavBar';

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

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

function confColor(v: number): string {
  if (v >= 75) return 'from-emerald-500 to-emerald-400';
  if (v >= 60) return 'from-amber-500 to-amber-400';
  return 'from-rose-500 to-rose-400';
}

function confTextColor(v: number): string {
  if (v >= 75) return 'text-emerald-400';
  if (v >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

// ─── Sparkline (lightweight-charts) ──────────────────────────

// ─── Sort Icon ────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 text-[8px] inline-block ${active ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
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
      <span className={`text-[10px] font-mono tabular-nums ${value > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="relative flex-1 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
        <div
          className={`absolute h-full rounded-full bg-gradient-to-r ${confColor(value)} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono font-semibold tabular-nums w-8 text-right ${confTextColor(value)}`}>
        {value}%
      </span>
    </div>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────

function SignalBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  if (direction === 'BUY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
        ▲ BUY
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold shadow-[0_0_8px_rgba(244,63,94,0.2)]">
      ▼ SELL
    </span>
  );
}

// ─── Stats Card ───────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{label}</div>
      <div className={`text-base font-bold font-mono tabular-nums ${color ?? 'text-[var(--foreground)]'}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-secondary)]">{sub}</div>}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────

function RangeSlider({
  label, min, max, valueMin, valueMax, onChangeMin, onChangeMax,
}: {
  label: string; min: number; max: number; valueMin: number; valueMax: number;
  onChangeMin: (v: number) => void; onChangeMax: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{valueMin}–{valueMax}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} value={valueMin}
          onChange={e => onChangeMin(parseInt(e.target.value))}
          className="flex-1 accent-emerald-500 h-1"
        />
        <input
          type="range" min={min} max={max} value={valueMax}
          onChange={e => onChangeMax(parseInt(e.target.value))}
          className="flex-1 accent-emerald-500 h-1"
        />
      </div>
    </div>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────

function FilterPill<T extends string>({
  value, options, onChange,
}: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 border border-[var(--border)]">
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

// ─── Skeleton Row ─────────────────────────────────────────────

const SKELETON_WIDTHS = Array.from({ length: 8 }, () => Math.floor(40 + Math.random() * 40));

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
  const [filters, setFilters] = useState<Filters>({
    rsiMin: 20,
    rsiMax: 80,
    macdFilter: 'any',
    emaFilter: 'any',
    minConfidence: 60,
    timeframe: 'H1',
    direction: 'all',
  });

  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [meta, setMeta] = useState<ScreenerMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
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

  const scan = useCallback(async () => {
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
      const data = await res.json() as { results: ScreenerResult[]; meta: ScreenerMeta };
      setResults(data.results);
      setMeta(data.meta);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          <strong>Live Data</strong> — Real-time market data from Binance and Yahoo Finance.
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 7 22 7 22 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-xl font-bold tracking-tight">Asset Screener</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Scan all {12} assets for setups matching your custom criteria · Powered by real TA engine
          </p>
        </div>

        {/* Filter Bar */}
        <div className="glass-card rounded-2xl p-4 mb-6 border border-[var(--border)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* RSI Range */}
            <RangeSlider
              label="RSI Range"
              min={0} max={100}
              valueMin={filters.rsiMin}
              valueMax={filters.rsiMax}
              onChangeMin={v => patchFilter('rsiMin', Math.min(v, filters.rsiMax - 1))}
              onChangeMax={v => patchFilter('rsiMax', Math.max(v, filters.rsiMin + 1))}
            />

            {/* Confidence Threshold */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Min Confidence</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{filters.minConfidence}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={filters.minConfidence}
                onChange={e => patchFilter('minConfidence', parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1"
              />
            </div>

            {/* Timeframe */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Timeframe</span>
              <FilterPill<Timeframe>
                value={filters.timeframe}
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
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">MACD</span>
              <FilterPill<MACDFilter>
                value={filters.macdFilter}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'bullish', label: 'Bullish' },
                  { value: 'bearish', label: 'Bearish' },
                ]}
                onChange={v => patchFilter('macdFilter', v)}
              />
            </div>

            {/* EMA Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">EMA Position</span>
              <FilterPill<EMAFilter>
                value={filters.emaFilter}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'above_ema20', label: '> EMA20' },
                  { value: 'below_ema20', label: '< EMA20' },
                  { value: 'golden_cross', label: 'Golden ✕' },
                ]}
                onChange={v => patchFilter('emaFilter', v)}
              />
            </div>

            {/* Direction Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Direction</span>
              <FilterPill<DirectionFilter>
                value={filters.direction}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'BUY', label: 'BUY' },
                  { value: 'SELL', label: 'SELL' },
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
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.03] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={watchlistOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Watchlist Only
                {watchlist.size > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">{watchlist.size}</span>}
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
                  Scanning…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {meta && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Scanned" value={meta.totalAssets.toString()} sub="assets tracked" />
            <StatCard
              label="Matching Filters"
              value={meta.matching.toString()}
              sub={`of ${meta.totalAssets} assets`}
              color="text-emerald-400"
            />
            <StatCard
              label="Strongest Signal"
              value={meta.strongest ? `${meta.strongest.symbol}` : '—'}
              sub={meta.strongest ? `${meta.strongest.direction} · ${meta.strongest.confidence}% conf` : 'no signals'}
              color={meta.strongest?.direction === 'BUY' ? 'text-emerald-400' : meta.strongest?.direction === 'SELL' ? 'text-rose-400' : 'text-[var(--text-secondary)]'}
            />
            <div className="glass-card rounded-xl p-3 flex flex-col gap-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Bias</div>
              <div className="flex items-center gap-2 mt-0.5">
                {meta.mostBullish && (
                  <span className="text-[10px] text-emerald-400 font-mono">▲ {meta.mostBullish}</span>
                )}
                {meta.mostBearish && (
                  <span className="text-[10px] text-rose-400 font-mono">▼ {meta.mostBearish}</span>
                )}
                {!meta.mostBullish && !meta.mostBearish && (
                  <span className="text-[10px] text-[var(--text-secondary)]">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {!hasScanned ? (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20 border border-[var(--border)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-[var(--text-secondary)] mb-4">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[var(--text-secondary)] text-sm font-medium">Set your filters and tap Scan Now</p>
            <p className="text-zinc-800 text-xs mt-1">Scans {12} assets across forex, crypto & metals</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-x-auto border border-[var(--border)]">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left w-8" />
                  <th
                    className="px-4 py-3 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('symbol')}
                  >
                    Symbol<SortIcon active={sortKey === 'symbol'} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('price')}
                  >
                    Price<SortIcon active={sortKey === 'price'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Signal</th>
                  <th
                    className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none min-w-[120px]"
                    onClick={() => handleSort('confidence')}
                  >
                    Confidence<SortIcon active={sortKey === 'confidence'} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('rsi')}
                  >
                    RSI<SortIcon active={sortKey === 'rsi'} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium cursor-pointer hover:text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('macdHistogram')}
                  >
                    MACD<SortIcon active={sortKey === 'macdHistogram'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">EMA Status</th>
                  <th className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Chart</th>
                  <th className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">TF</th>
                  <th className="px-4 py-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Actions</th>
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
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                          watchlist.has(r.symbol) ? 'text-amber-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        }`}
                        title={watchlist.has(r.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={watchlist.has(r.symbol) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    </td>

                    {/* Symbol */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-[var(--foreground)]">{r.symbol}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{r.name}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--foreground)] tabular-nums">
                      {fmtPrice(r.price)}
                    </td>

                    {/* Signal */}
                    <td className="px-4 py-3 text-center">
                      <SignalBadge direction={r.direction} />
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3">
                      <ConfidenceBar value={r.confidence} />
                    </td>

                    {/* RSI */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-mono tabular-nums ${
                        r.rsi < 30 ? 'text-emerald-400' : r.rsi > 70 ? 'text-rose-400' : 'text-[var(--text-secondary)]'
                      }`}>
                        {r.rsi.toFixed(1)}
                      </span>
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
                        {r.emaStatus}
                      </span>
                    </td>

                    {/* Sparkline */}
                    <td className="px-4 py-3">
                      <SparklineChart prices={r.sparkline} direction={r.direction} />
                    </td>

                    {/* Timeframe */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--glass-bg)] px-1.5 py-0.5 rounded">
                        {r.timeframe}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/signal/${r.signalId}`}
                          className="px-2 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-colors whitespace-nowrap"
                        >
                          View
                        </Link>
                        <Link
                          href={`/alerts?symbol=${r.symbol}`}
                          className="px-2 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-colors whitespace-nowrap"
                        >
                          Alert
                        </Link>
                        <button
                          onClick={() => toggleWatchlist(r.symbol)}
                          className={`px-2 py-1 rounded-lg border text-[10px] transition-colors whitespace-nowrap ${
                            watchlist.has(r.symbol)
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-[var(--glass-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                          }`}
                        >
                          {watchlist.has(r.symbol) ? '★ Watch' : '☆ Watch'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && sorted.length === 0 && hasScanned && (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-[var(--text-secondary)] text-xs">
                      No assets match your filters. Try loosening the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer hint */}
        {hasScanned && !loading && (
          <p className="mt-4 text-[10px] text-zinc-800 text-center">
            {meta && `Scanned at ${new Date(meta.scannedAt).toLocaleTimeString()} · `}
            Click column headers to sort · ★ to add to watchlist
          </p>
        )}
      </div>
    </div>
  );
}

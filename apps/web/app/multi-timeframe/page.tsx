'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { MultiTFResult, TFDirection } from '../lib/signal-generator';

// ─── Nav ─────────────────────────────────────────────────────

const NAV_PAGES = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/paper-trading', label: 'Paper Trade' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/strategy-builder', label: 'Strategy' },
  { href: '/multi-timeframe', label: 'Multi-TF' },
];

// ─── Helpers ─────────────────────────────────────────────────

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function directionColor(dir: 'BUY' | 'SELL' | 'NEUTRAL'): string {
  if (dir === 'BUY') return 'text-emerald-400';
  if (dir === 'SELL') return 'text-rose-400';
  return 'text-amber-400';
}

function directionBg(dir: 'BUY' | 'SELL' | 'NEUTRAL'): string {
  if (dir === 'BUY') return 'bg-emerald-500/10 border-emerald-500/20';
  if (dir === 'SELL') return 'bg-rose-500/10 border-rose-500/20';
  return 'bg-amber-500/10 border-amber-500/20';
}

function directionArrow(dir: 'BUY' | 'SELL' | 'NEUTRAL'): string {
  if (dir === 'BUY') return '▲';
  if (dir === 'SELL') return '▼';
  return '●';
}

// ─── Components ──────────────────────────────────────────────

function TFBadge({ tf }: { tf: TFDirection }) {
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${directionBg(tf.direction)}`}>
      <div className="text-[9px] text-[var(--text-secondary)] font-mono uppercase">{tf.timeframe}</div>
      <div className={`text-xs font-bold tabular-nums ${directionColor(tf.direction)}`}>
        {directionArrow(tf.direction)}
      </div>
      <div className="text-[10px] font-mono text-[var(--text-secondary)] tabular-nums">{tf.confidence}%</div>
    </div>
  );
}

function ConfluenceBar({ value, direction }: { value: number; direction: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const color =
    direction === 'BUY' ? '#10b981' :
    direction === 'SELL' ? '#f43f5e' :
    '#f59e0b';
  return (
    <div className="relative h-1 w-full rounded-full bg-[var(--border)]">
      <div
        className="absolute h-1 rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}50` }}
      />
    </div>
  );
}

function MatrixRow({ result }: { result: MultiTFResult }) {
  const [expanded, setExpanded] = useState(false);

  const confluenceLabel =
    result.agreementCount === 3 ? 'STRONG' :
    result.agreementCount === 2 ? 'MODERATE' :
    result.isConflicted ? 'CONFLICTED' : 'NEUTRAL';

  const confluenceScore = Math.max(0, Math.min(100,
    result.agreementCount === 3 ? 85 + result.confluenceBonus :
    result.agreementCount === 2 ? 60 + result.confluenceBonus :
    40 + result.confluenceBonus
  ));

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Main row */}
      <button
        className="w-full text-left p-4 hover:bg-[var(--glass-bg)] transition-all duration-200"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {/* Symbol */}
          <div className="w-20 shrink-0">
            <div className="text-sm font-semibold text-[var(--foreground)] font-mono">{result.symbol}</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono tabular-nums mt-0.5">{formatPrice(result.entry)}</div>
          </div>

          {/* TF Cells */}
          <div className="flex gap-2 flex-1">
            {result.timeframes.map(tf => (
              <TFBadge key={tf.timeframe} tf={tf} />
            ))}
          </div>

          {/* Confluence summary */}
          <div className="hidden sm:flex flex-col items-end gap-1 w-28 shrink-0">
            <div className={`text-xs font-bold font-mono tabular-nums ${directionColor(result.dominantDirection)}`}>
              {result.dominantDirection}
            </div>
            <div className="w-full">
              <ConfluenceBar value={confluenceScore} direction={result.dominantDirection} />
            </div>
            <div className={`text-[10px] font-mono ${
              result.isConflicted ? 'text-amber-400' :
              result.agreementCount === 3 ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
            }`}>
              {confluenceLabel}
            </div>
          </div>

          {/* Bonus/Penalty badge */}
          <div className="hidden md:block w-16 shrink-0 text-right">
            {result.confluenceBonus !== 0 && (
              <span className={`text-xs font-mono font-bold tabular-nums ${
                result.confluenceBonus > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {result.confluenceBonus > 0 ? '+' : ''}{result.confluenceBonus}%
              </span>
            )}
          </div>

          <div className="text-[var(--text-secondary)] text-[10px]">{expanded ? '▴' : '▾'}</div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
          <div className="grid grid-cols-3 gap-3 mt-3">
            {result.timeframes.map(tf => (
              <div
                key={tf.timeframe}
                className={`rounded-xl p-3 border ${directionBg(tf.direction)}`}
              >
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">{tf.timeframe}</div>
                <div className={`text-lg font-bold font-mono ${directionColor(tf.direction)}`}>
                  {directionArrow(tf.direction)} {tf.direction}
                </div>
                <div className="mt-2 space-y-1 text-[10px] font-mono text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>Buy score</span>
                    <span className="text-emerald-400 tabular-nums">{tf.buyScore.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sell score</span>
                    <span className="text-rose-400 tabular-nums">{tf.sellScore.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence</span>
                    <span className="text-[var(--foreground)] tabular-nums">{tf.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicators from primary TF */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[10px] font-mono">
            {[
              { label: 'RSI', value: result.indicators.rsi.value.toFixed(0), signal: result.indicators.rsi.signal },
              { label: 'MACD', value: result.indicators.macd.signal, signal: result.indicators.macd.signal },
              { label: 'EMA', value: result.indicators.ema.trend.toUpperCase(), signal: result.indicators.ema.trend },
              { label: 'Stoch', value: result.indicators.stochastic.k.toFixed(0), signal: result.indicators.stochastic.signal },
            ].map(({ label, value, signal: sig }) => {
              const isBull = sig === 'bullish' || sig === 'oversold' || sig === 'up';
              const isBear = sig === 'bearish' || sig === 'overbought' || sig === 'down';
              return (
                <div key={label} className="bg-[var(--glass-bg)] rounded-lg p-2">
                  <div className="text-[var(--text-secondary)] mb-0.5">{label}</div>
                  <div className={isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-[var(--text-secondary)]'}>
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          {result.isConflicted && (
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
              <span>⚠</span>
              <span>Timeframes in conflict — confidence adjusted {result.confluenceBonus}%</span>
            </div>
          )}
          {result.agreementCount === 3 && (
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
              <span>✓</span>
              <span>All timeframes aligned — confidence boosted +{result.confluenceBonus}%</span>
            </div>
          )}

          <div className="mt-3 text-[9px] text-[var(--text-secondary)] font-mono flex items-center justify-between">
            <span>Source: {result.source}</span>
            <span>{new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary stats ────────────────────────────────────────────

function SummaryCard({ value, label, color = 'text-[var(--foreground)]' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center">
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

interface ApiResponse {
  timestamp: string;
  count: number;
  summary: { bullish: number; bearish: number; conflicted: number; allAligned: number };
  results: MultiTFResult[];
}

export default function MultiTimeframePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDir, setSelectedDir] = useState<'ALL' | 'BUY' | 'SELL' | 'NEUTRAL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/multi-tf');
      if (!res.ok) return;
      const json = await res.json() as ApiResponse;
      setData(json);
      setLastUpdate(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const filtered = data?.results?.filter(r =>
    selectedDir === 'ALL' || r.dominantDirection === selectedDir
  ) ?? [];

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_PAGES.map(page => (
              <Link
                key={page.href}
                href={page.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  page.href === '/multi-timeframe'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]'
                }`}
              >
                {page.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                autoRefresh
                  ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8'
                  : 'border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-[var(--border)]'}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            {lastUpdate && (
              <span className="hidden sm:block text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Multi-Timeframe Analysis</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Signal confluence across H1 · H4 · D1 — all assets</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            value={data?.summary.bullish ?? 0}
            label="Bullish signals"
            color="text-emerald-400"
          />
          <SummaryCard
            value={data?.summary.bearish ?? 0}
            label="Bearish signals"
            color="text-rose-400"
          />
          <SummaryCard
            value={data?.summary.allAligned ?? 0}
            label="All TFs aligned"
            color="text-[var(--foreground)]"
          />
          <SummaryCard
            value={data?.summary.conflicted ?? 0}
            label="Conflicted"
            color="text-amber-400"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] font-mono text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">+15%</span> All 3 TFs agree
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">+5%</span> 2 of 3 TFs agree
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400">−20%</span> TFs in conflict
          </span>
        </div>

        {/* Direction filter */}
        <div className="flex gap-0.5 bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl p-1 mb-4 w-fit">
          {(['ALL', 'BUY', 'SELL', 'NEUTRAL'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => setSelectedDir(dir)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                selectedDir === dir
                  ? dir === 'BUY' ? 'bg-emerald-500/15 text-emerald-400'
                  : dir === 'SELL' ? 'bg-rose-500/15 text-rose-400'
                  : dir === 'NEUTRAL' ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-[var(--glass-bg)] text-[var(--foreground)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        {/* Matrix header */}
        <div className="flex items-center gap-4 px-4 mb-2 text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
          <div className="w-20 shrink-0">Symbol</div>
          <div className="flex gap-2 flex-1">
            <div className="w-[52px] text-center">H1</div>
            <div className="w-[52px] text-center">H4</div>
            <div className="w-[52px] text-center">D1</div>
          </div>
          <div className="hidden sm:block w-28 shrink-0 text-right">Confluence</div>
          <div className="hidden md:block w-16 shrink-0 text-right">Adj.</div>
          <div className="w-4" />
        </div>

        {/* Matrix rows */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-[var(--text-secondary)] text-sm">
            No signals matching filter
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(result => (
              <MatrixRow key={result.symbol} result={result} />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 text-[10px] text-[var(--text-secondary)] font-mono text-center">
          Refreshes every 60s · H1/H4/D1 from live OHLCV · Confluence = % TF agreement weighted by TA score
        </div>
      </div>
    </div>
  );
}

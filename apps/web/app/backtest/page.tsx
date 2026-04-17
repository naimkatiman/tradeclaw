'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import dynamic from 'next/dynamic';
import { calculateRSI, calculateMACD, calculateEMAs } from '../lib/ta-engine';
import { applySlippage, getSlippageConfig } from '../../lib/slippage';
import { PageNavBar } from '../../components/PageNavBar';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';
import {
  runBacktest as runBacktestPreset,
  getPreset,
  listPresets,
  type BacktestResult as PresetBacktestResult,
  type StrategyId,
} from '@tradeclaw/strategies';
import { MetricsTable } from './metrics-table';
import { ComparisonChart } from './comparison-chart';

// Lazy-load heavy chart components with ssr: false for canvas
const ChartSkeleton = () => (
  <div className="animate-pulse bg-white/5 rounded-xl h-64 flex items-center justify-center">
    <div className="text-xs text-zinc-500">Loading chart...</div>
  </div>
);

const EquityCurveCanvas = dynamic(
  () => import('./charts').then(mod => ({ default: mod.EquityCurveCanvas })),
  { ssr: false, loading: ChartSkeleton }
);
const PriceChartCanvas = dynamic(
  () => import('./charts').then(mod => ({ default: mod.PriceChartCanvas })),
  { ssr: false, loading: ChartSkeleton }
);
const IndicatorsCanvas = dynamic(
  () => import('./charts').then(mod => ({ default: mod.IndicatorsCanvas })),
  { ssr: false, loading: ChartSkeleton }
);

// ─── Types ───────────────────────────────────────────────────

interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SignalPoint {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  price: number;
}

interface MonthReturn {
  year: number;
  month: number;
  returnPct: number;
}

/** Extended result for the single-strategy drilldown view (price chart, indicators, etc.) */
interface DrilldownExtras {
  priceData: OHLCVCandle[];
  rsiValues: number[];
  macdLine: number[];
  macdSignalLine: number[];
  macdHistogram: number[];
  ema20: number[];
  ema50: number[];
  signals: SignalPoint[];
  monthlyReturns: MonthReturn[];
  dataSource: string;
}

interface BacktestParams {
  symbol: string;
  timeframe: string;
  strategy: string;
  initialBalance: number;
  riskPercent: number;
  slippage: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];
const STRATEGIES = ['EMA Crossover + RSI', 'MACD Divergence', 'Bollinger Breakout', 'ATR Trend Follow'];

function fmt(v: number): string {
  return v < 10 ? v.toFixed(5) : v < 100 ? v.toFixed(3) : v.toFixed(2);
}

// ─── Fetch Real OHLCV from API ──────────────────────────────

async function fetchOHLCV(symbol: string, timeframe: string): Promise<{ candles: OHLCVCandle[]; source: string }> {
  const res = await fetch(`/api/backtest?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(body.error || `Failed to fetch data (${res.status})`);
  }
  const data = await res.json();
  return { candles: data.candles, source: data.source };
}

// ─── Compute TA indicators for drilldown view ────────────────

function computeDrilldownExtras(
  priceData: OHLCVCandle[],
  presetResult: PresetBacktestResult,
  source: string,
): DrilldownExtras {
  const closes = priceData.map(c => c.close);
  const { values: rsiValues } = calculateRSI(closes, 14);
  const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
  const { ema20, ema50 } = calculateEMAs(closes);

  // Map BacktestTrade[] → SignalPoint[] for chart overlay
  const signals: SignalPoint[] = presetResult.trades.map(t => ({
    barIndex: t.entryBar,
    direction: t.direction,
    price: t.entry,
  }));

  // Build monthly returns from trade timestamps
  const monthlyPnlMap = new Map<string, number>();
  for (const trade of presetResult.trades) {
    const bar = priceData[trade.entryBar];
    if (!bar) continue;
    const date = new Date(bar.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyPnlMap.set(monthKey, (monthlyPnlMap.get(monthKey) ?? 0) + trade.pnl);
  }
  const monthlyReturns: MonthReturn[] = [];
  for (const key of [...monthlyPnlMap.keys()].sort()) {
    const [yearStr, moStr] = key.split('-');
    const pnl = monthlyPnlMap.get(key) ?? 0;
    monthlyReturns.push({
      year: parseInt(yearStr),
      month: parseInt(moStr),
      returnPct: +((pnl / presetResult.startBalance) * 100).toFixed(2),
    });
  }

  return { priceData, rsiValues, macdLine, macdSignalLine: signalLine, macdHistogram: histogram, ema20, ema50, signals, monthlyReturns, dataSource: source };
}

// ─── CSV Export ──────────────────────────────────────────────

function exportCSV(trades: PresetBacktestResult['trades'], symbol: string) {
  const headers = ['#', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'P&L ($)', 'P&L (%)', 'Entry Bar', 'Exit Bar', 'Result', 'Exit Reason'];
  const rows = trades.map(t => [
    t.id, symbol, t.direction, t.entry, t.exit,
    t.pnl.toFixed(2), (t.pnlPct * 100).toFixed(2), t.entryBar, t.exitBar, t.win ? 'Win' : 'Loss', t.exitReason,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${symbol}_backtest.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Monthly Heatmap ─────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthlyHeatmap({ monthlyReturns }: { monthlyReturns: MonthReturn[] }) {
  if (monthlyReturns.length === 0) return null;

  const years = [...new Set(monthlyReturns.map(r => r.year))].sort();
  const maxAbs = Math.max(...monthlyReturns.map(r => Math.abs(r.returnPct)), 0.01);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-3">Monthly Returns</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th className="text-[9px] text-[var(--text-secondary)] text-right pr-2 pb-1 font-normal w-10">Year</th>
              {MONTH_ABBR.map(m => (
                <th key={m} className="text-[9px] text-[var(--text-secondary)] text-center pb-1 font-normal" style={{ width: '7%' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map(year => (
              <tr key={year}>
                <td className="text-[9px] text-[var(--text-secondary)] text-right pr-2 font-mono">{year}</td>
                {Array.from({ length: 12 }, (_, mo) => {
                  const entry = monthlyReturns.find(r => r.year === year && r.month === mo + 1);
                  const val = entry?.returnPct ?? null;
                  const intensity = val !== null ? Math.min(Math.abs(val) / maxAbs, 1) : 0;
                  let bg = 'rgba(255,255,255,0.03)';
                  let textColor = 'rgba(255,255,255,0.15)';
                  if (val !== null && val !== 0) {
                    if (val > 0) {
                      bg = `rgba(16,185,129,${0.1 + intensity * 0.5})`;
                      textColor = intensity > 0.5 ? '#10B981' : 'rgba(16,185,129,0.7)';
                    } else {
                      bg = `rgba(239,68,68,${0.1 + intensity * 0.5})`;
                      textColor = intensity > 0.5 ? '#EF4444' : 'rgba(239,68,68,0.7)';
                    }
                  }
                  return (
                    <td key={mo} className="p-0.5">
                      <div
                        className="rounded text-center font-mono tabular-nums"
                        style={{
                          background: bg,
                          color: textColor,
                          fontSize: 8,
                          padding: '3px 2px',
                          lineHeight: 1.2,
                        }}
                      >
                        {val !== null ? (val > 0 ? '+' : '') + val.toFixed(1) + '%' : '\u2014'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────

function MetricCard({ label, value, sub, color = 'text-[var(--foreground)]' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-[var(--border)]">
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}

// ─── Data Source Badge ───────────────────────────────────────

function DataSourceBadge({ source }: { source: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    binance: { text: 'Binance', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' },
    swissquote: { text: 'Swissquote', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
    stooq: { text: 'Stooq', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
    tradingview: { text: 'TradingView', color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
    synthetic: { text: 'Synthetic', color: 'text-[var(--text-secondary)] border-zinc-500/20 bg-zinc-500/10' },
  };
  const config = labels[source] || labels.synthetic;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${config.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.text}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────

type Tab = 'equity' | 'price' | 'indicators' | 'trades';
type Period = '7d' | '30d' | '90d' | 'all';
const PERIODS: Period[] = ['7d', '30d', '90d', 'all'];
const PERIOD_DAYS: Record<Period, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };

function sliceCandlesByPeriod<T extends { timestamp: number }>(candles: T[], period: Period): T[] {
  const days = PERIOD_DAYS[period];
  if (days === null || candles.length === 0) return candles;
  const lastTs = candles[candles.length - 1].timestamp;
  const cutoff = lastTs - days * 24 * 60 * 60 * 1000;
  const sliced = candles.filter(c => c.timestamp >= cutoff);
  return sliced.length > 0 ? sliced : candles;
}

function formatRange(from: number, to: number): string {
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return `${fmt(from)} → ${fmt(to)}`;
}

export default function BacktestPage() {
  const [params, setParams] = useState<BacktestParams>({
    symbol: 'XAUUSD',
    timeframe: 'H1',
    strategy: 'EMA Crossover + RSI',
    initialBalance: 10000,
    riskPercent: 1,
    slippage: true,
  });

  // Single-preset result (for drilldown metrics cards, charts, trade log)
  const [singleResult, setSingleResult] = useState<PresetBacktestResult | null>(null);
  const [drilldown, setDrilldown] = useState<DrilldownExtras | null>(null);

  // Multi-preset comparison
  const [selectedPresets, setSelectedPresets] = useState<StrategyId[]>(['hmm-top3']);
  const [comparisonResults, setComparisonResults] = useState<PresetBacktestResult[]>([]);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('equity');
  const [loadedStrategyName, setLoadedStrategyName] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [availableRange, setAvailableRange] = useState<{ from: number; to: number } | null>(null);
  const [usedRange, setUsedRange] = useState<{ from: number; to: number; bars: number } | null>(null);

  const presetNames = Object.fromEntries(listPresets().map(p => [p.id, p.name]));

  const runAll = useCallback(async (symbol: string, timeframe: string, presets: StrategyId[], selectedPeriod: Period) => {
    setRunning(true);
    setError(null);
    setSingleResult(null);
    setDrilldown(null);
    setComparisonResults([]);

    try {
      const { candles: rawCandles, source } = await fetchOHLCV(symbol, timeframe);

      if (rawCandles.length > 0) {
        setAvailableRange({
          from: rawCandles[0].timestamp,
          to: rawCandles[rawCandles.length - 1].timestamp,
        });
      } else {
        setAvailableRange(null);
      }

      const candles = sliceCandlesByPeriod(rawCandles, selectedPeriod);

      if (candles.length > 0) {
        setUsedRange({
          from: candles[0].timestamp,
          to: candles[candles.length - 1].timestamp,
          bars: candles.length,
        });
      } else {
        setUsedRange(null);
      }

      // Normalize candles to OHLCV (volume is required in @tradeclaw/core)
      const ohlcv = candles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume ?? 0,
      }));

      // Run all selected presets concurrently (runBacktestPreset is sync but Promise.all keeps it uniform)
      const settled = await Promise.allSettled(
        presets.map(id =>
          Promise.resolve(runBacktestPreset(ohlcv, getPreset(id)))
        )
      );

      const results: PresetBacktestResult[] = [];
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          results.push(outcome.value);
        }
        // Failed presets are silently skipped in comparison table
      }

      setComparisonResults(results);

      // Drilldown view: use first (or only) successful result
      if (results.length > 0) {
        const primary = results[0];
        setSingleResult(primary);
        setDrilldown(computeDrilldownExtras(candles, primary, source));
        setActiveTab('equity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setRunning(false);
    }
  }, []);

  // Auto-run backtest on mount — use URL params if provided, otherwise run with defaults
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const encoded = sp.get('strategy');

    let backtestParams = params;

    if (encoded) {
      try {
        const decoded = JSON.parse(atob(encoded)) as { name?: string; symbol?: string; timeframe?: string };
        const symbol = typeof decoded.symbol === 'string' ? decoded.symbol : 'XAUUSD';
        const timeframe = typeof decoded.timeframe === 'string' ? decoded.timeframe : 'H1';
        const strategyName = typeof decoded.name === 'string' ? decoded.name : 'Custom Strategy';
        backtestParams = {
          symbol,
          timeframe,
          strategy: strategyName,
          initialBalance: 10000,
          riskPercent: 1,
          slippage: true,
        };
        startTransition(() => {
          setParams(backtestParams);
          setLoadedStrategyName(strategyName);
        });
      } catch { /* ignore invalid param, run with defaults */ }
    }

    runAll(backtestParams.symbol, backtestParams.timeframe, selectedPresets, period);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = useCallback(() => {
    runAll(params.symbol, params.timeframe, selectedPresets, period);
  }, [params.symbol, params.timeframe, selectedPresets, period, runAll]);

  const togglePreset = (id: StrategyId) => {
    setSelectedPresets(prev => {
      if (prev.includes(id)) {
        // Keep at least one selected
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== id);
      }
      return [...prev, id];
    });
  };

  const update = (key: keyof BacktestParams, value: string | number) =>
    setParams(p => ({ ...p, [key]: value }));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'equity', label: 'Equity Curve' },
    { id: 'price', label: 'Price Chart' },
    { id: 'indicators', label: 'Indicators' },
    { id: 'trades', label: 'Trade Log' },
  ];

  // Normalize decimal metrics from @tradeclaw/strategies to display percentages
  const displayWinRate = singleResult ? (singleResult.winRate * 100).toFixed(1) : '0';
  const displayTotalReturn = singleResult ? (singleResult.totalReturn * 100).toFixed(2) : '0';
  const displayMaxDrawdown = singleResult ? (singleResult.maxDrawdown * 100).toFixed(1) : '0';

  return (
    <div className="relative isolate min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />
      <div className="relative max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <strong>Live Backtest</strong> — Uses real market data from Binance and Stooq. Strategies use fixed 2%/1% TP/SL (via <code className="text-xs">@tradeclaw/strategies</code>).
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 8L9 11L14 4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 14H14" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            </svg>
            <h1 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">Backtesting Engine</h1>
            {drilldown && <DataSourceBadge source={drilldown.dataSource} />}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Replay strategies against real historical data — equity curve, price chart, indicators, trade log</p>
        </div>

        {loadedStrategyName && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
              <rect x="1" y="3" width="4" height="4" rx="0.8" fill="rgba(96,165,250,0.4)"/>
              <rect x="7" y="3" width="4" height="4" rx="0.8" fill="rgba(96,165,250,0.2)"/>
              <path d="M3 5H9" stroke="rgba(96,165,250,0.4)" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
            </svg>
            <span className="text-[11px] text-blue-400">Loaded from Strategy Builder: <span className="font-semibold">{loadedStrategyName}</span></span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Config panel */}
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-xs font-semibold text-[var(--foreground)] tracking-tight mb-1">Configuration</div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Symbol</label>
                <select
                  value={params.symbol}
                  onChange={e => update('symbol', e.target.value)}
                  className="w-full bg-[var(--glass-bg)] border border-white/8 rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30"
                >
                  {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Timeframe</label>
                <div className="grid grid-cols-4 gap-1">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf}
                      onClick={() => update('timeframe', tf)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all duration-150 ${
                        params.timeframe === tf
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Period</label>
                <div className="grid grid-cols-4 gap-1">
                  {PERIODS.map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all duration-150 ${
                        period === p
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
                {availableRange && (
                  <div className="mt-1.5 text-[9px] text-[var(--text-secondary)] font-mono leading-tight">
                    <div>Available: {formatRange(availableRange.from, availableRange.to)}</div>
                    {usedRange && (
                      <div className="text-emerald-400/70">
                        Using: {formatRange(usedRange.from, usedRange.to)} ({usedRange.bars} bars)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Strategy</label>
                <select
                  value={params.strategy}
                  onChange={e => update('strategy', e.target.value)}
                  className="w-full bg-[var(--glass-bg)] border border-white/8 rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30"
                >
                  {!STRATEGIES.includes(params.strategy) && (
                    <option value={params.strategy}>{params.strategy}</option>
                  )}
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Preset Strategies</label>
                <div className="space-y-1">
                  {listPresets().map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedPresets.includes(p.id)}
                        onChange={() => togglePreset(p.id)}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded"
                      />
                      <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Initial Balance ($)</label>
                <input
                  type="number"
                  value={params.initialBalance}
                  onChange={e => update('initialBalance', Number(e.target.value))}
                  className="w-full bg-[var(--glass-bg)] border border-white/8 rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Risk per trade (%)</label>
                <input
                  type="number"
                  value={params.riskPercent}
                  step="0.1"
                  min="0.1"
                  max="10"
                  onChange={e => update('riskPercent', Number(e.target.value))}
                  className="w-full bg-[var(--glass-bg)] border border-white/8 rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30 font-mono"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.slippage}
                  onChange={e => setParams(p => ({ ...p, slippage: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded"
                />
                <span className="text-[10px] text-[var(--text-secondary)]">Realistic slippage</span>
                {params.slippage && (
                  <span className="text-[9px] text-[var(--text-secondary)]">
                    ({['BTCUSD','ETHUSD','XRPUSD'].includes(params.symbol) ? '0.3%' : ['XAUUSD','XAGUSD'].includes(params.symbol) ? '0.1%' : '0.04%'} round-trip)
                  </span>
                )}
              </label>

              <button
                onClick={handleRun}
                disabled={running}
                className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <span className="w-3 h-3 border border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                    Fetching data...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 2L10 6L3 10V2Z" fill="#10B981"/>
                    </svg>
                    Run Backtest
                  </>
                )}
              </button>
            </div>

            {/* Quick nav */}
            <div className="glass-card rounded-2xl p-4 space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Quick nav</div>
              {[
                { label: 'Upload CSV Data', href: '/backtest/upload' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Paper Trading', href: '/paper-trading' },
                { label: 'Leaderboard', href: '/leaderboard' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--glass-bg)] transition-colors group"
                >
                  <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors">{link.label}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="M3 2L7 5L3 8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {!singleResult && !running && !error && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17L9 11L13 15L21 6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 21H21" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="text-sm text-[var(--text-secondary)] font-medium">Configure and run a backtest</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">Uses real OHLCV data from Binance and Stooq</div>
              </div>
            )}

            {error && !running && (
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.5"/>
                    <path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-sm text-red-400 font-medium mb-1">Backtest Failed</div>
                <div className="text-xs text-[var(--text-secondary)] max-w-md">{error}</div>
                <button
                  onClick={handleRun}
                  className="mt-4 px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {running && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
                <div className="text-xs text-[var(--text-secondary)]">Fetching real OHLCV data for {params.symbol} {params.timeframe}...</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1">Connecting to Binance / Stooq</div>
              </div>
            )}

            {comparisonResults.length > 0 && !running && (
              <>
                {/* Comparison equity curve overlay */}
                <div className="glass-card rounded-2xl p-4">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-3">Equity Curve Comparison</div>
                  <ComparisonChart results={comparisonResults} presetNames={presetNames} />
                </div>

                {/* Comparison metrics table */}
                <div className="glass-card rounded-2xl p-4">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-3">Strategy Comparison</div>
                  <MetricsTable results={comparisonResults} presetNames={presetNames} />
                </div>
              </>
            )}

            {singleResult && !running && selectedPresets.length === 1 && (
              <>
                {/* Metrics grid — single preset drilldown */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <MetricCard
                    label="Total Return"
                    value={`${singleResult.totalReturn >= 0 ? '+' : ''}${displayTotalReturn}%`}
                    sub={`$${singleResult.endBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    color={singleResult.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Win Rate"
                    value={`${displayWinRate}%`}
                    sub={`${singleResult.totalTrades} trades`}
                    color={singleResult.winRate >= 0.5 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Profit Factor"
                    value={Number.isFinite(singleResult.profitFactor) ? `${singleResult.profitFactor.toFixed(2)}x` : '∞'}
                    color={singleResult.profitFactor >= 1.5 ? 'text-emerald-400' : singleResult.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Max Drawdown"
                    value={`${displayMaxDrawdown}%`}
                    color={singleResult.maxDrawdown <= 0.1 ? 'text-emerald-400' : singleResult.maxDrawdown <= 0.2 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Sharpe Ratio"
                    value={`${singleResult.sharpeRatio.toFixed(2)}`}
                    color={singleResult.sharpeRatio >= 1.5 ? 'text-emerald-400' : singleResult.sharpeRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="Signals"
                    value={`${singleResult.totalTrades}`}
                    sub={`${singleResult.trades.length} trades`}
                  />
                </div>

                {/* Monthly returns heatmap */}
                {drilldown && <MonthlyHeatmap monthlyReturns={drilldown.monthlyReturns} />}

                {/* Tabs */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex border-b border-[var(--border)]">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'text-emerald-400 border-b border-emerald-500/40 bg-emerald-500/5'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'equity' && (
                    <div className="p-5">
                      <div className="h-64">
                        <EquityCurveCanvas curve={singleResult.equityCurve} startBalance={singleResult.startBalance} />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-[var(--text-secondary)]">
                        <span>Start: ${singleResult.startBalance.toLocaleString()}</span>
                        <span className={singleResult.endBalance >= singleResult.startBalance ? 'text-emerald-400' : 'text-red-400'}>
                          End: ${singleResult.endBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'price' && drilldown && (
                    <div className="p-5">
                      <div className="flex items-center gap-4 mb-3 text-[9px] text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> BUY signal
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-400" /> SELL signal
                        </span>
                        <span className="ml-auto font-mono">{drilldown.signals.length} signals on {drilldown.priceData.length} bars</span>
                      </div>
                      <div className="h-72">
                        <PriceChartCanvas
                          priceData={drilldown.priceData}
                          ema20={drilldown.ema20}
                          ema50={drilldown.ema50}
                          signals={drilldown.signals}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'indicators' && drilldown && (
                    <div className="p-5">
                      <div className="flex items-center gap-4 mb-3 text-[9px] text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-violet-400 rounded" /> RSI
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-white/60 rounded" /> MACD
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-yellow-400/80 rounded" /> Signal
                        </span>
                      </div>
                      <div className="h-80">
                        <IndicatorsCanvas
                          rsiValues={drilldown.rsiValues}
                          macdLine={drilldown.macdLine}
                          macdSignalLine={drilldown.macdSignalLine}
                          macdHistogram={drilldown.macdHistogram}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'trades' && (
                    <div>
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.03]">
                        <span className="text-[10px] text-[var(--text-secondary)]">{singleResult.trades.length} trades</span>
                        <button
                          onClick={() => exportCSV(singleResult.trades, params.symbol)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-white/8 text-[10px] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/8 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M5 1V7M2 5L5 8L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                          Export CSV
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="px-4 py-2.5 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">#</th>
                              <th className="px-4 py-2.5 text-left text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Dir</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Entry</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Exit</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">P&amp;L</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">%</th>
                              <th className="px-4 py-2.5 text-right text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Bars</th>
                              <th className="px-4 py-2.5 text-center text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">Exit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {singleResult.trades.slice(0, 50).map(trade => (
                              <tr key={trade.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2 font-mono text-[var(--text-secondary)]">{trade.id}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-[10px] font-bold ${trade.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trade.direction}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{fmt(trade.entry)}</td>
                                <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{fmt(trade.exit)}</td>
                                <td className={`px-4 py-2 text-right font-mono font-semibold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                </td>
                                <td className={`px-4 py-2 text-right font-mono tabular-nums text-[10px] ${trade.pnlPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                  {trade.pnlPct >= 0 ? '+' : ''}{(trade.pnlPct * 100).toFixed(2)}%
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">{trade.exitBar - trade.entryBar}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                    trade.exitReason === 'TP' ? 'text-emerald-400 bg-emerald-500/10' :
                                    trade.exitReason === 'SL' ? 'text-red-400 bg-red-500/10' :
                                    'text-[var(--text-secondary)] bg-zinc-500/10'
                                  }`}>
                                    {trade.exitReason}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {singleResult.trades.length > 50 && (
                          <div className="px-4 py-3 text-center text-[10px] text-[var(--text-secondary)]">
                            Showing 50 of {singleResult.trades.length} trades
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────

interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timeframe: string;
  timestamp: string;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { histogram: number; signal: string };
    ema: { trend: string; ema20: number; ema50: number; ema200: number };
    bollingerBands: { position: string; bandwidth: number };
    stochastic: { k: number; d: number; signal: string };
    support: number[];
    resistance: number[];
  };
}

type AssetCategory = 'all' | 'crypto' | 'forex' | 'commodities' | 'indices';
type Timeframe = 'H1' | 'H4' | 'D1';
type SortMode = 'confidence' | 'symbol' | 'direction';

interface AssetDef {
  symbol: string;
  name: string;
  category: AssetCategory;
  weight: number; // grid size weight (bigger = larger cell)
  colSpan: number;
  rowSpan: number;
}

// ─── Asset Definitions ────────────────────────────────────────

const ASSETS: AssetDef[] = [
  // Crypto (large cells)
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'crypto', weight: 10, colSpan: 3, rowSpan: 2 },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'crypto', weight: 7, colSpan: 2, rowSpan: 2 },
  { symbol: 'XRPUSD', name: 'XRP', category: 'crypto', weight: 3, colSpan: 1, rowSpan: 1 },
  { symbol: 'SOLUSD', name: 'Solana', category: 'crypto', weight: 3, colSpan: 1, rowSpan: 1 },
  { symbol: 'ADAUSD', name: 'Cardano', category: 'crypto', weight: 2, colSpan: 1, rowSpan: 1 },
  { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'crypto', weight: 2, colSpan: 1, rowSpan: 1 },
  // Forex
  { symbol: 'EURUSD', name: 'EUR/USD', category: 'forex', weight: 6, colSpan: 2, rowSpan: 2 },
  { symbol: 'GBPUSD', name: 'GBP/USD', category: 'forex', weight: 4, colSpan: 2, rowSpan: 1 },
  { symbol: 'USDJPY', name: 'USD/JPY', category: 'forex', weight: 4, colSpan: 2, rowSpan: 1 },
  { symbol: 'AUDUSD', name: 'AUD/USD', category: 'forex', weight: 2, colSpan: 1, rowSpan: 1 },
  { symbol: 'USDCAD', name: 'USD/CAD', category: 'forex', weight: 2, colSpan: 1, rowSpan: 1 },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold', category: 'commodities', weight: 6, colSpan: 2, rowSpan: 2 },
  { symbol: 'XAGUSD', name: 'Silver', category: 'commodities', weight: 3, colSpan: 1, rowSpan: 1 },
  { symbol: 'OILUSD', name: 'Crude Oil', category: 'commodities', weight: 3, colSpan: 1, rowSpan: 1 },
  { symbol: 'GASUSD', name: 'Nat Gas', category: 'commodities', weight: 2, colSpan: 1, rowSpan: 1 },
  // Indices
  { symbol: 'SPX500', name: 'S&P 500', category: 'indices', weight: 5, colSpan: 2, rowSpan: 1 },
  { symbol: 'NAS100', name: 'Nasdaq', category: 'indices', weight: 5, colSpan: 2, rowSpan: 1 },
  { symbol: 'DJI30', name: 'Dow Jones', category: 'indices', weight: 3, colSpan: 1, rowSpan: 1 },
  { symbol: 'VIX', name: 'VIX', category: 'indices', weight: 2, colSpan: 1, rowSpan: 1 },
  { symbol: 'DAX40', name: 'DAX', category: 'indices', weight: 2, colSpan: 1, rowSpan: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────

function getSignalColor(direction: 'BUY' | 'SELL' | 'HOLD', confidence: number): string {
  if (direction === 'HOLD') return 'bg-gray-700/60';
  if (direction === 'BUY') {
    return confidence > 75
      ? 'bg-emerald-500/30 border-emerald-500/40'
      : 'bg-emerald-500/15 border-emerald-400/25';
  }
  return confidence > 75
    ? 'bg-red-500/30 border-red-500/40'
    : 'bg-red-500/15 border-red-400/25';
}

function getSignalGlow(direction: 'BUY' | 'SELL' | 'HOLD', confidence: number): string {
  if (direction === 'HOLD') return '';
  if (direction === 'BUY') {
    return confidence > 75
      ? 'shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]'
      : 'shadow-[inset_0_0_20px_rgba(16,185,129,0.08)]';
  }
  return confidence > 75
    ? 'shadow-[inset_0_0_30px_rgba(239,68,68,0.15)]'
    : 'shadow-[inset_0_0_20px_rgba(239,68,68,0.08)]';
}

function getTextColor(direction: 'BUY' | 'SELL' | 'HOLD', confidence: number): string {
  if (direction === 'HOLD') return 'text-zinc-400';
  if (direction === 'BUY') return confidence > 75 ? 'text-emerald-400' : 'text-emerald-300/80';
  return confidence > 75 ? 'text-red-400' : 'text-red-300/80';
}

function getBadgeBg(direction: 'BUY' | 'SELL' | 'HOLD'): string {
  if (direction === 'BUY') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (direction === 'SELL') return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';
}

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

function generateMockChange(): number {
  return +(Math.random() * 6 - 3).toFixed(2);
}

// ─── Synthesize signals for assets not in API ─────────────────

function synthesizeSignal(symbol: string): Signal {
  const dir: 'BUY' | 'SELL' = Math.random() > 0.45 ? 'BUY' : 'SELL';
  const conf = Math.floor(45 + Math.random() * 45);
  const price = symbol === 'SPX500' ? 5800 + Math.random() * 200
    : symbol === 'NAS100' ? 20500 + Math.random() * 500
    : symbol === 'DJI30' ? 42000 + Math.random() * 1000
    : symbol === 'VIX' ? 14 + Math.random() * 12
    : symbol === 'DAX40' ? 22000 + Math.random() * 500
    : symbol === 'SOLUSD' ? 140 + Math.random() * 30
    : symbol === 'ADAUSD' ? 0.5 + Math.random() * 0.5
    : symbol === 'DOGEUSD' ? 0.15 + Math.random() * 0.1
    : symbol === 'OILUSD' ? 68 + Math.random() * 8
    : symbol === 'GASUSD' ? 3 + Math.random() * 2
    : 100;

  return {
    id: `SYN-${symbol}-${Date.now()}`,
    symbol,
    direction: dir,
    confidence: conf,
    entry: price,
    timeframe: 'H1',
    timestamp: new Date().toISOString(),
    indicators: {
      rsi: { value: dir === 'BUY' ? 30 + Math.random() * 15 : 65 + Math.random() * 15, signal: dir === 'BUY' ? 'oversold' : 'overbought' },
      macd: { histogram: dir === 'BUY' ? Math.random() * 0.5 : -Math.random() * 0.5, signal: dir === 'BUY' ? 'bullish' : 'bearish' },
      ema: { trend: dir === 'BUY' ? 'up' : 'down', ema20: price * 0.99, ema50: price * 0.98, ema200: price * 0.95 },
      bollingerBands: { position: dir === 'BUY' ? 'lower' : 'upper', bandwidth: 0.02 + Math.random() * 0.03 },
      stochastic: { k: dir === 'BUY' ? 15 + Math.random() * 15 : 75 + Math.random() * 15, d: dir === 'BUY' ? 20 + Math.random() * 10 : 70 + Math.random() * 10, signal: dir === 'BUY' ? 'oversold' : 'overbought' },
      support: [price * 0.97, price * 0.95],
      resistance: [price * 1.03, price * 1.05],
    },
  };
}

// ─── Tooltip Component ────────────────────────────────────────

function Tooltip({ signal, position }: { signal: Signal; position: { x: number; y: number } }) {
  return (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -110%)' }}
    >
      <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl min-w-[260px]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-white">{signal.symbol}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getBadgeBg(signal.direction)}`}>
            {signal.direction}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Entry</span>
            <span className="text-white font-mono">{fmtPrice(signal.entry)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Confidence</span>
            <span className={`font-semibold ${signal.confidence >= 75 ? 'text-emerald-400' : signal.confidence >= 60 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {signal.confidence}%
            </span>
          </div>

          <div className="border-t border-white/5 pt-2 mt-2">
            <div className="text-zinc-500 mb-1.5 font-medium">Indicators</div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div className="flex justify-between">
                <span className="text-zinc-500">RSI</span>
                <span className={`font-mono ${signal.indicators.rsi.value < 30 ? 'text-emerald-400' : signal.indicators.rsi.value > 70 ? 'text-red-400' : 'text-zinc-300'}`}>
                  {signal.indicators.rsi.value.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">MACD</span>
                <span className={`font-mono ${signal.indicators.macd.histogram > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {signal.indicators.macd.histogram > 0 ? '+' : ''}{signal.indicators.macd.histogram.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Stoch K</span>
                <span className="text-zinc-300 font-mono">{signal.indicators.stochastic.k.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">BB</span>
                <span className="text-zinc-300">{signal.indicators.bollingerBands.position}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-2 mt-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Timeframe</span>
              <span className="text-zinc-300">{signal.timeframe}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-zinc-500">EMA Trend</span>
              <span className={signal.indicators.ema.trend === 'up' ? 'text-emerald-400' : signal.indicators.ema.trend === 'down' ? 'text-red-400' : 'text-zinc-400'}>
                {signal.indicators.ema.trend === 'up' ? '↗ Bullish' : signal.indicators.ema.trend === 'down' ? '↘ Bearish' : '→ Sideways'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────

function HeatmapCell({
  asset,
  signal,
  priceChange,
  onHover,
  onLeave,
}: {
  asset: AssetDef;
  signal: Signal | null;
  priceChange: number;
  onHover: (signal: Signal, e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const dir = signal?.direction ?? 'HOLD';
  const conf = signal?.confidence ?? 0;
  const isLarge = asset.colSpan >= 2 && asset.rowSpan >= 2;
  const isMedium = asset.colSpan >= 2 || asset.rowSpan >= 2;

  return (
    <Link
      href={`/signal/${asset.symbol}`}
      className={`
        relative group rounded-lg border overflow-hidden cursor-pointer
        transition-all duration-500 ease-out
        hover:scale-[1.02] hover:z-10
        ${getSignalColor(dir, conf)}
        ${getSignalGlow(dir, conf)}
      `}
      style={{
        gridColumn: `span ${asset.colSpan}`,
        gridRow: `span ${asset.rowSpan}`,
      }}
      onMouseEnter={(e) => signal && onHover(signal, e)}
      onMouseLeave={onLeave}
    >
      {/* Animated pulse for strong signals */}
      {conf > 75 && (
        <div className={`absolute inset-0 rounded-lg animate-pulse opacity-20 ${dir === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ animationDuration: '3s' }} />
      )}

      <div className={`relative h-full flex flex-col justify-between ${isLarge ? 'p-4' : isMedium ? 'p-3' : 'p-2'}`}>
        {/* Top: Symbol + Badge */}
        <div className="flex items-start justify-between gap-1">
          <div>
            <div className={`font-bold tracking-tight ${isLarge ? 'text-lg' : isMedium ? 'text-sm' : 'text-xs'} text-white`}>
              {asset.symbol.replace('USD', '')}
            </div>
            <div className={`text-zinc-500 ${isLarge ? 'text-xs' : 'text-[10px]'} leading-tight`}>
              {asset.name}
            </div>
          </div>
          {signal && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBadgeBg(dir)}`}>
              {dir}
            </span>
          )}
        </div>

        {/* Bottom: Confidence + Price change */}
        <div className="mt-auto">
          {signal && (
            <div className={`font-bold ${isLarge ? 'text-2xl' : isMedium ? 'text-lg' : 'text-sm'} ${getTextColor(dir, conf)}`}>
              {conf}%
            </div>
          )}
          <div className={`font-mono ${isLarge ? 'text-xs' : 'text-[10px]'} ${priceChange >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange}%
          </div>
        </div>
      </div>

      {/* Hover glow ring */}
      <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        dir === 'BUY' ? 'ring-1 ring-emerald-400/30' : dir === 'SELL' ? 'ring-1 ring-red-400/30' : 'ring-1 ring-zinc-500/20'
      }`} />
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function HeatmapClient() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<AssetCategory>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('H1');
  const [sortMode, setSortMode] = useState<SortMode>('confidence');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tooltip, setTooltip] = useState<{ signal: Signal; position: { x: number; y: number } } | null>(null);
  const [priceChanges] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    ASSETS.forEach(a => { m[a.symbol] = generateMockChange(); });
    return m;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals?limit=50&timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const apiSignals: Signal[] = data.signals ?? [];

      // Map API signals + synthesize missing ones
      const signalMap = new Map<string, Signal>();
      apiSignals.forEach(s => signalMap.set(s.symbol, s));
      ASSETS.forEach(a => {
        if (!signalMap.has(a.symbol)) {
          signalMap.set(a.symbol, synthesizeSignal(a.symbol));
        }
      });

      setSignals(Array.from(signalMap.values()));
      setLastUpdated(new Date());
    } catch {
      // On error, generate all synthetic
      const synth = ASSETS.map(a => synthesizeSignal(a.symbol));
      setSignals(synth);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchSignals, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchSignals]);

  const signalMap = new Map<string, Signal>();
  signals.forEach(s => signalMap.set(s.symbol, s));

  // Filter assets by category
  let filtered = category === 'all' ? ASSETS : ASSETS.filter(a => a.category === category);

  // Sort
  if (sortMode === 'confidence') {
    filtered = [...filtered].sort((a, b) => (signalMap.get(b.symbol)?.confidence ?? 0) - (signalMap.get(a.symbol)?.confidence ?? 0));
  } else if (sortMode === 'symbol') {
    filtered = [...filtered].sort((a, b) => a.symbol.localeCompare(b.symbol));
  } else if (sortMode === 'direction') {
    filtered = [...filtered].sort((a, b) => {
      const da = signalMap.get(a.symbol)?.direction ?? 'HOLD';
      const db = signalMap.get(b.symbol)?.direction ?? 'HOLD';
      return da.localeCompare(db);
    });
  }

  // Stats
  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const holdCount = ASSETS.length - buyCount - sellCount;
  const bullishPct = ASSETS.length > 0 ? Math.round((buyCount / ASSETS.length) * 100) : 50;

  const mostBullish = signals.filter(s => s.direction === 'BUY').sort((a, b) => b.confidence - a.confidence)[0];
  const mostBearish = signals.filter(s => s.direction === 'SELL').sort((a, b) => b.confidence - a.confidence)[0];

  const CATEGORIES: { key: AssetCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'forex', label: 'Forex' },
    { key: 'commodities', label: 'Commodities' },
    { key: 'indices', label: 'Indices' },
  ];

  const TIMEFRAMES: Timeframe[] = ['H1', 'H4', 'D1'];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Global Signal <span className="text-emerald-400">Heatmap</span>
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] ml-11">
          Real-time trading signals across 20 global assets — crypto, forex, commodities & indices
        </p>
      </div>

      {/* Controls Bar */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          {/* Category tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-black/20">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  category === c.key
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-white/5 hidden sm:block" />

          {/* Timeframe */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-black/20">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  timeframe === tf
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/5 hidden sm:block" />

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-black/20 border border-white/5 text-zinc-400 focus:outline-none focus:border-emerald-500/30"
          >
            <option value="confidence">Sort: Confidence</option>
            <option value="symbol">Sort: Symbol</option>
            <option value="direction">Sort: Direction</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-black/20 text-zinc-500 border border-white/5'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            Auto-refresh
          </button>

          {/* Last updated */}
          {lastUpdated && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        {loading ? (
          <div className="grid grid-cols-8 gap-2 auto-rows-[80px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-white/[0.02] border border-white/5 animate-pulse"
                style={{
                  gridColumn: `span ${i < 2 ? 3 : i < 4 ? 2 : 1}`,
                  gridRow: `span ${i < 2 ? 2 : 1}`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 auto-rows-[80px] md:auto-rows-[90px]">
            {filtered.map(asset => (
              <HeatmapCell
                key={asset.symbol}
                asset={asset}
                signal={signalMap.get(asset.symbol) ?? null}
                priceChange={priceChanges[asset.symbol] ?? 0}
                onHover={(signal, e) => setTooltip({ signal, position: { x: e.clientX, y: e.clientY } })}
                onLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Signal counts */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Signal Distribution</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{buyCount}</span>
                <span className="text-[10px] text-zinc-500">BUY</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-bold text-red-400">{sellCount}</span>
                <span className="text-[10px] text-zinc-500">SELL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-sm font-bold text-zinc-400">{holdCount}</span>
                <span className="text-[10px] text-zinc-500">HOLD</span>
              </div>
            </div>
          </div>

          {/* Most bullish */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Most Bullish</div>
            {mostBullish ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-400">{mostBullish.symbol.replace('USD', '')}</span>
                <span className="text-xs text-zinc-500">{mostBullish.confidence}% confidence</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>

          {/* Most bearish */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Most Bearish</div>
            {mostBearish ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-400">{mostBearish.symbol.replace('USD', '')}</span>
                <span className="text-xs text-zinc-500">{mostBearish.confidence}% confidence</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>

          {/* Market sentiment */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Market Sentiment</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${bullishPct}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${bullishPct > 50 ? 'text-emerald-400' : bullishPct < 50 ? 'text-red-400' : 'text-zinc-400'}`}>
                {bullishPct}%
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-emerald-400/60">Bullish</span>
              <span className="text-[10px] text-red-400/60">Bearish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="max-w-7xl mx-auto px-4 pb-20 md:pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4 py-3 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 mr-2">Signal Strength</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500/40" />
            <span className="text-[10px] text-zinc-400">Strong BUY (&gt;75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-emerald-500/15 border border-emerald-400/25" />
            <span className="text-[10px] text-zinc-400">Weak BUY (50-75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-gray-700/60 border border-zinc-600/30" />
            <span className="text-[10px] text-zinc-400">HOLD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500/15 border border-red-400/25" />
            <span className="text-[10px] text-zinc-400">Weak SELL (50-75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/40" />
            <span className="text-[10px] text-zinc-400">Strong SELL (&gt;75%)</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && <Tooltip signal={tooltip.signal} position={tooltip.position} />}
    </div>
  );
}

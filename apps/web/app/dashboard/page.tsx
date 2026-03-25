'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PriceTicker } from '../components/price-ticker';

interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { histogram: number; signal: string };
    ema: { trend: string; ema20: number; ema50: number; ema200: number };
    bollingerBands: { position: string; bandwidth: number };
    stochastic: { k: number; d: number; signal: string };
    support: number[];
    resistance: number[];
  };
  timeframe: string;
  timestamp: string;
  status: string;
}

const TIMEFRAMES = ['ALL', 'M5', 'M15', 'H1', 'H4', 'D1'];

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : value >= 65 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${color}`}>
      {value}%
    </span>
  );
}

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return direction === 'BUY' ? (
    <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/30">
      ▲ BUY
    </span>
  ) : (
    <span className="px-3 py-1 rounded bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/30">
      ▼ SELL
    </span>
  );
}

function IndicatorPill({ label, value, signal }: { label: string; value: string; signal: string }) {
  const color = signal === 'bullish' || signal === 'oversold' || signal === 'up'
    ? 'text-emerald-400'
    : signal === 'bearish' || signal === 'overbought' || signal === 'down'
    ? 'text-red-400'
    : 'text-gray-400';
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${color}`}>{value}</span>
    </div>
  );
}

function SignalCard({ signal }: { signal: TradingSignal }) {
  const [expanded, setExpanded] = useState(false);
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(5);
  };

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{signal.symbol}</span>
          <DirectionBadge direction={signal.direction} />
          <span className="text-xs text-gray-500 font-mono">{signal.timeframe}</span>
        </div>
        <ConfidenceBadge value={signal.confidence} />
      </div>

      {/* Price Levels */}
      <div className="grid grid-cols-5 gap-2 mb-3 text-center">
        <div>
          <div className="text-[10px] text-gray-500 uppercase">Entry</div>
          <div className="text-sm font-mono text-white">{formatPrice(signal.entry)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">Stop Loss</div>
          <div className="text-sm font-mono text-red-400">{formatPrice(signal.stopLoss)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">TP1</div>
          <div className="text-sm font-mono text-emerald-400">{formatPrice(signal.takeProfit1)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">TP2</div>
          <div className="text-sm font-mono text-emerald-400">{formatPrice(signal.takeProfit2)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase">TP3</div>
          <div className="text-sm font-mono text-emerald-400">{formatPrice(signal.takeProfit3)}</div>
        </div>
      </div>

      {/* Quick Indicators */}
      <div className="flex flex-wrap gap-3 mb-2">
        <IndicatorPill label="RSI" value={signal.indicators.rsi.value.toString()} signal={signal.indicators.rsi.signal} />
        <IndicatorPill label="MACD" value={signal.indicators.macd.histogram > 0 ? '+' + signal.indicators.macd.histogram : signal.indicators.macd.histogram.toString()} signal={signal.indicators.macd.signal} />
        <IndicatorPill label="Trend" value={signal.indicators.ema.trend.toUpperCase()} signal={signal.indicators.ema.trend} />
        <IndicatorPill label="Stoch" value={`${signal.indicators.stochastic.k}/${signal.indicators.stochastic.d}`} signal={signal.indicators.stochastic.signal} />
        <IndicatorPill label="BB" value={signal.indicators.bollingerBands.position} signal={signal.indicators.bollingerBands.position === 'lower' ? 'oversold' : signal.indicators.bollingerBands.position === 'upper' ? 'overbought' : 'neutral'} />
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-emerald-400 transition-colors mt-1"
      >
        {expanded ? '▾ Hide details' : '▸ Show details'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-500 mb-1">EMA Stack</div>
            <div className="font-mono text-gray-300">
              EMA20: {formatPrice(signal.indicators.ema.ema20)}<br/>
              EMA50: {formatPrice(signal.indicators.ema.ema50)}<br/>
              EMA200: {formatPrice(signal.indicators.ema.ema200)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">S/R Levels</div>
            <div className="font-mono">
              <span className="text-emerald-400">S: {signal.indicators.support.map(formatPrice).join(' / ')}</span><br/>
              <span className="text-red-400">R: {signal.indicators.resistance.map(formatPrice).join(' / ')}</span>
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-gray-500 mb-1">Bollinger Width</div>
            <div className="font-mono text-gray-300">{signal.indicators.bollingerBands.bandwidth}%</div>
          </div>
          <div className="col-span-2 text-gray-600 font-mono">
            ID: {signal.id} • {new Date(signal.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('ALL');
  const [direction, setDirection] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (timeframe !== 'ALL') params.set('timeframe', timeframe);
      if (direction !== 'ALL') params.set('direction', direction);
      params.set('minConfidence', '50');

      const res = await fetch(`/api/signals?${params}`);
      const data = await res.json();
      setSignals(data.signals);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, direction]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSignals, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignals]);

  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const avgConfidence = signals.length > 0
    ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length)
    : 0;
  const highConfidence = signals.filter(s => s.confidence >= 80).length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="text-emerald-400">Trade</span>Claw
            </span>
            <span className="text-xs text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded">BETA</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1 rounded border ${
                autoRefresh
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-gray-700 text-gray-500'
              }`}
            >
              {autoRefresh ? '● LIVE' : '○ PAUSED'}
            </button>
            {lastUpdate && (
              <span className="text-xs text-gray-600">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Live Price Ticker */}
      <PriceTicker />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{signals.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Active Signals</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">
              <span className="text-emerald-400">{buyCount}</span>
              <span className="text-gray-600 text-lg mx-1">/</span>
              <span className="text-red-400">{sellCount}</span>
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Buy / Sell</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{avgConfidence}%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Confidence</div>
          </div>
          <div className={`rounded-lg p-3 text-center border ${
            buyCount > sellCount
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : buyCount < sellCount
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-900/60 border-gray-800'
          }`}>
            <div className={`text-2xl font-bold ${
              buyCount > sellCount ? 'text-emerald-400' : buyCount < sellCount ? 'text-red-400' : 'text-gray-400'
            }`}>
              {buyCount > sellCount ? '▲ BULL' : buyCount < sellCount ? '▼ BEAR' : '◆ NEUTRAL'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Market Bias</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1">
            {(['ALL', 'BUY', 'SELL'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  direction === d
                    ? d === 'BUY' ? 'bg-emerald-500/20 text-emerald-400'
                    : d === 'SELL' ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-700/50 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSignals}
            className="px-4 py-1 rounded-lg text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Signal Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <div className="animate-pulse text-4xl mb-4">📡</div>
            <div>Scanning markets...</div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <div>No signals match your filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {signals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-600 pb-8">
          <p>TradeClaw Signal Scanner • Open Source • Self-Hosted</p>
          <p className="mt-1">Signals are generated by AI analysis. Not financial advice. DYOR.</p>
        </div>
      </div>
    </div>
  );
}

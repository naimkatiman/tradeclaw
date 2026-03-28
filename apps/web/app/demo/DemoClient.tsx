'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DataSourceBadge, getDataSource, formatSignalTimestamp, shortSignalId } from '../components/data-source-badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiSignal {
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
  source?: string;
  dataQuality?: string;
}

interface Signal {
  id: string;
  symbol: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  rsi: number;
  trend: string;
  timeframe: string;
  timestamp: string;
  source: string;
}

interface LeaderboardAsset {
  pair: string;
  hitRate: number;
  totalSignals: number;
  avgConfidence: number;
}

interface HeatmapEntry {
  pair: string;
  name: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  rsi: number;
  macd: number;
}

interface PaperPosition {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  openedAt: string;
}

interface PaperPortfolio {
  balance: number;
  equity: number;
  positions: PaperPosition[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL = 30;
const TABS = ['Signals', 'Leaderboard', 'Heatmap', 'Paper Trading', 'Backtest'] as const;
type Tab = typeof TABS[number];

const SYMBOL_NAMES: Record<string, string> = {
  XAUUSD: 'Gold', XAGUSD: 'Silver', BTCUSD: 'Bitcoin', ETHUSD: 'Ethereum',
  XRPUSD: 'XRP', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD', USDCHF: 'USD/CHF',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trendFromIndicators(sig: ApiSignal): string {
  const parts: string[] = [];
  const ema = sig.indicators.ema;
  if (ema.trend === 'up') parts.push('EMA trending up');
  else if (ema.trend === 'down') parts.push('EMA trending down');
  else parts.push('EMA sideways');

  if (sig.indicators.rsi.signal === 'oversold') parts.push('RSI oversold');
  else if (sig.indicators.rsi.signal === 'overbought') parts.push('RSI overbought');

  if (sig.indicators.macd.signal === 'bullish') parts.push('MACD bullish');
  else if (sig.indicators.macd.signal === 'bearish') parts.push('MACD bearish');

  return parts.join(' \u00b7 ');
}

function mapApiSignal(api: ApiSignal): Signal {
  return {
    id: api.id,
    symbol: api.symbol,
    asset: SYMBOL_NAMES[api.symbol] || api.symbol,
    direction: api.direction,
    confidence: api.confidence,
    entry: api.entry,
    tp1: api.takeProfit1,
    tp2: api.takeProfit2,
    sl: api.stopLoss,
    rsi: api.indicators.rsi.value,
    trend: trendFromIndicators(api),
    timeframe: api.timeframe,
    timestamp: api.timestamp,
    source: api.dataQuality === 'real' ? 'Live market data' : api.source === 'real' ? 'TA engine' : 'Fallback',
  };
}

function formatPrice(symbol: string, price: number): string {
  if (['EUR', 'GBP', 'AUD', 'NZD', 'CHF', 'CAD'].some(c => symbol.includes(c))) return price.toFixed(4);
  if (symbol.includes('XAU') || symbol.includes('XAG')) return price.toFixed(2);
  if (symbol.includes('JPY')) return price.toFixed(3);
  if (symbol.includes('BTC') || symbol.includes('ETH'))
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return price.toFixed(2);
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 70 ? '#f59e0b' : '#6b7280';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] mb-1" style={{ color: '#9ca3af' }}>
        <span>Confidence</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: '#1f2937' }}>
        <div
          className="h-1 rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SignalCard({ sig, prev }: { sig: Signal; prev?: Signal }) {
  const isBuy = sig.direction === 'BUY';
  const confChanged = prev && sig.confidence !== prev.confidence;
  const dirColor = isBuy ? '#10b981' : '#f43f5e';
  const bgGlow = isBuy ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)';

  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-500"
      style={{
        background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)',
        borderColor: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
        boxShadow: `0 0 30px ${bgGlow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg tracking-tight">{sig.symbol}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                color: dirColor,
                border: `1px solid ${isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
              }}
            >
              {sig.direction}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#1f2937', color: '#6b7280' }}>
              {sig.timeframe}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <DataSourceBadge source={getDataSource(sig.symbol)} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{sig.asset} · {formatSignalTimestamp(sig.timestamp)}</div>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-black transition-all duration-500 ${confChanged ? 'scale-110' : 'scale-100'}`}
            style={{ color: dirColor }}
          >
            {sig.confidence}%
          </div>
          <div className="text-[10px]" style={{ color: '#374151' }}>AI score</div>
        </div>
      </div>
      <div
        className="text-[11px] mb-3 px-3 py-1.5 rounded-lg"
        style={{ background: '#0a0a0a', color: '#9ca3af', border: '1px solid #1f2937' }}
      >
        {sig.trend}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Entry', value: formatPrice(sig.symbol, sig.entry), color: '#e5e7eb' },
          { label: 'TP1', value: formatPrice(sig.symbol, sig.tp1), color: '#10b981' },
          { label: 'TP2', value: formatPrice(sig.symbol, sig.tp2), color: '#34d399' },
          { label: 'SL', value: formatPrice(sig.symbol, sig.sl), color: '#f43f5e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            <div className="text-[9px] mb-0.5" style={{ color: '#4b5563' }}>{label}</div>
            <div className="text-[11px] font-mono font-semibold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: '#4b5563' }}>
        <span className="flex items-center gap-2">
          <span>RSI {sig.rsi.toFixed(1)}</span>
          <span className="text-[9px] font-mono" style={{ color: '#374151' }} title={sig.id}>{shortSignalId(sig.id)}</span>
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          {sig.source}
        </span>
      </div>
      <ConfidenceBar value={sig.confidence} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 border animate-pulse"
      style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)', borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-5 w-24 rounded" style={{ background: '#1f2937' }} />
          <div className="h-3 w-32 rounded mt-2" style={{ background: '#1a1a1a' }} />
        </div>
        <div className="h-8 w-12 rounded" style={{ background: '#1f2937' }} />
      </div>
      <div className="h-8 rounded-lg mb-3" style={{ background: '#0a0a0a' }} />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg" style={{ background: '#0a0a0a' }} />
        ))}
      </div>
      <div className="h-1 rounded-full mt-4" style={{ background: '#1f2937' }} />
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function SignalsTab({ signals, prev, loading, error, fetchSignals }: {
  signals: Signal[];
  prev: Signal[];
  loading: boolean;
  error: boolean;
  fetchSignals: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (error || signals.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center border" style={{ background: '#0d0d0d', borderColor: 'rgba(244,63,94,0.2)' }}>
        <div className="text-xl mb-2" style={{ color: '#f43f5e' }}>Signals unavailable</div>
        <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
          Market data APIs may be temporarily unreachable.
        </p>
        <button
          onClick={fetchSignals}
          className="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
          style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151' }}
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {signals.map((sig, i) => (
        <SignalCard key={`${sig.symbol}-${sig.timeframe}`} sig={sig} prev={prev[i]} />
      ))}
    </div>
  );
}

function LeaderboardTab() {
  const [data, setData] = useState<LeaderboardAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setData((d.assets || []).slice(0, 5)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows count={5} />;
  if (data.length === 0) return <p className="text-center text-zinc-500 py-10">No leaderboard data yet.</p>;

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#1a1a1a' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#0a0a0a' }}>
            <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">#</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Pair</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Hit Rate</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Total Signals</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a, i) => (
            <tr key={a.pair} className="border-t" style={{ borderColor: '#1a1a1a' }}>
              <td className="px-5 py-3 text-zinc-600">{i + 1}</td>
              <td className="px-5 py-3 font-bold text-white">{a.pair}</td>
              <td className="px-5 py-3 text-right font-mono" style={{ color: a.hitRate >= 60 ? '#10b981' : '#f59e0b' }}>
                {a.hitRate.toFixed(1)}%
              </td>
              <td className="px-5 py-3 text-right text-zinc-400">{a.totalSignals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeatmapTab() {
  const [entries, setEntries] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/heatmap')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows count={5} />;
  if (entries.length === 0) return <p className="text-center text-zinc-500 py-10">No heatmap data.</p>;

  return (
    <div className="grid grid-cols-2 gap-3">
      {entries.map(e => {
        const isBuy = e.direction === 'BUY';
        const isSell = e.direction === 'SELL';
        const borderColor = isBuy ? 'rgba(16,185,129,0.25)' : isSell ? 'rgba(244,63,94,0.25)' : '#1a1a1a';
        const bgGlow = isBuy ? 'rgba(16,185,129,0.04)' : isSell ? 'rgba(244,63,94,0.04)' : 'transparent';

        return (
          <div
            key={e.pair}
            className="rounded-xl p-4 border transition-all duration-300"
            style={{ background: `linear-gradient(135deg, #0d0d0d, ${bgGlow})`, borderColor }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">{e.pair}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: isBuy ? '#10b981' : isSell ? '#f43f5e' : '#6b7280',
                  background: isBuy ? 'rgba(16,185,129,0.15)' : isSell ? 'rgba(244,63,94,0.15)' : '#1f2937',
                }}
              >
                {e.direction}
              </span>
            </div>
            <div className="text-xs text-zinc-500">{e.name}</div>
            <div className="flex justify-between mt-2 text-[11px]">
              <span className="text-zinc-500">RSI {e.rsi.toFixed(1)}</span>
              <span style={{ color: e.confidence >= 70 ? '#10b981' : '#6b7280' }}>{e.confidence}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaperTradingTab() {
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/paper-trading')
      .then(r => r.json())
      .then(d => { setPortfolio(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows count={4} />;
  if (!portfolio) return <p className="text-center text-zinc-500 py-10">Paper trading unavailable.</p>;

  const positions = (portfolio.positions || []).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Account stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Balance', value: `$${(portfolio.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Equity', value: `$${(portfolio.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ background: '#0d0d0d', borderColor: '#1a1a1a' }}>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
            <div className="text-lg font-bold text-white font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Open positions */}
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Open Positions ({positions.length})
        </div>
        {positions.length === 0 ? (
          <div className="rounded-xl p-6 text-center border" style={{ background: '#0d0d0d', borderColor: '#1a1a1a' }}>
            <p className="text-sm text-zinc-500">No open positions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map(pos => {
              const isBuy = pos.direction === 'BUY';
              return (
                <div
                  key={pos.id}
                  className="rounded-xl p-4 border flex items-center justify-between"
                  style={{
                    background: '#0d0d0d',
                    borderColor: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{pos.symbol}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: isBuy ? '#10b981' : '#f43f5e',
                          background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                        }}
                      >
                        {pos.direction}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{timeAgo(pos.openedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">{formatPrice(pos.symbol, pos.entryPrice)}</div>
                    <div className="text-[10px] text-zinc-500">${pos.quantity.toFixed(0)} invested</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BacktestTab() {
  const sample = {
    pair: 'BTCUSD',
    period: '2025-09 \u2014 2026-03',
    totalTrades: 847,
    winRate: 68.2,
    avgPnl: 1.4,
    totalPnl: 12340,
    maxDrawdown: -8.3,
    sharpeRatio: 1.72,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 border" style={{ background: '#0d0d0d', borderColor: 'rgba(16,185,129,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-bold text-white">{sample.pair} Backtest</div>
            <div className="text-xs text-zinc-500">{sample.period}</div>
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            Sample Result
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Win Rate', value: `${sample.winRate}%`, color: '#10b981' },
            { label: 'Total Trades', value: sample.totalTrades.toString(), color: '#e5e7eb' },
            { label: 'Avg P&L', value: `+${sample.avgPnl}%`, color: '#10b981' },
            { label: 'Total P&L', value: `+$${sample.totalPnl.toLocaleString()}`, color: '#10b981' },
            { label: 'Max Drawdown', value: `${sample.maxDrawdown}%`, color: '#f43f5e' },
            { label: 'Sharpe Ratio', value: sample.sharpeRatio.toFixed(2), color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 border" style={{ background: '#080808', borderColor: '#1a1a1a' }}>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
              <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/backtest"
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Run your own backtest
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DemoClient() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prev, setPrev] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Signals');
  const countdownRef = useRef(REFRESH_INTERVAL);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals?minConfidence=50');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const apiSignals: ApiSignal[] = data.signals || [];

      if (apiSignals.length === 0) {
        setError(true);
        return;
      }

      const mapped = apiSignals.map(mapApiSignal);
      setPrev(signals);
      setSignals(mapped);
      setError(false);
      setTick(t => t + 1);
      countdownRef.current = REFRESH_INTERVAL;
      setCountdown(REFRESH_INTERVAL);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [signals]);

  useEffect(() => { fetchSignals(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const interval = setInterval(fetchSignals, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dockerCmd = `git clone https://github.com/naimkatiman/tradeclaw.git\ncd tradeclaw\ndocker compose up`;

  const copyDocker = () => {
    navigator.clipboard.writeText(dockerCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: '#050505', fontFamily: "'Geist', 'Inter', system-ui, sans-serif", color: '#e5e7eb' }}
    >
      {/* GitHub Star Banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 50%, rgba(16,185,129,0.12) 100%)',
          borderBottom: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: '#10b981' }}>&#11088;</span>
            <span style={{ color: '#9ca3af' }}>
              Like what you see? <span style={{ color: '#e5e7eb' }}>TradeClaw is 100% open source.</span>
            </span>
          </div>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm text-emerald-200">
          <strong>Live Signals</strong> — Data from real market feeds. Self-host for full access.
        </div>

        {/* Header */}
        <div className="pt-12 pb-8 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-4"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real signals \u00b7 No login required
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: '#fff' }}>
            AI Signals, <span style={{ color: '#10b981' }}>Live</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#6b7280' }}>
            TradeClaw generates AI-powered BUY/SELL signals from real market data via CoinGecko, Stooq, and exchange rate APIs.
            Refreshes every 30 seconds.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 rounded-full px-3 py-1 text-xs"
            style={{ background: '#111', border: '1px solid #1f2937', color: '#4b5563' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: countdown <= 5 ? '#10b981' : '#374151', transition: 'background 0.3s' }}
            />
            Next refresh in <span style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{countdown}s</span>
            &nbsp;\u00b7 Tick #{tick}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                background: activeTab === tab ? 'rgba(16,185,129,0.15)' : '#111',
                color: activeTab === tab ? '#10b981' : '#6b7280',
                border: `1px solid ${activeTab === tab ? 'rgba(16,185,129,0.3)' : '#1f2937'}`,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[400px] mb-12">
          {activeTab === 'Signals' && (
            <SignalsTab signals={signals} prev={prev} loading={loading} error={error} fetchSignals={fetchSignals} />
          )}
          {activeTab === 'Leaderboard' && <LeaderboardTab />}
          {activeTab === 'Heatmap' && <HeatmapTab />}
          {activeTab === 'Paper Trading' && <PaperTradingTab />}
          {activeTab === 'Backtest' && <BacktestTab />}
        </div>

        {/* Deploy section */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, #0d0d0d 0%, #0f0f0f 100%)',
            border: '1px solid rgba(16,185,129,0.15)',
            boxShadow: '0 0 60px rgba(16,185,129,0.04)',
          }}
        >
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-3"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}
            >
              Deploy your own in 60 seconds
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>
              Own your signals. Self-host in 60 seconds.
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: '#6b7280' }}>
              No subscriptions. No vendor lock-in. Run the exact same platform you&apos;re seeing right now.
            </p>
          </div>

          <div className="rounded-xl p-4 mb-4 relative" style={{ background: '#080808', border: '1px solid #1f2937' }}>
            <pre className="text-sm font-mono overflow-x-auto" style={{ color: '#10b981', lineHeight: 1.7 }}>
              <span style={{ color: '#374151' }}>$ </span><span>git clone https://github.com/naimkatiman/tradeclaw.git</span>
              {'\n'}<span style={{ color: '#374151' }}>$ </span><span>cd tradeclaw</span>
              {'\n'}<span style={{ color: '#374151' }}>$ </span><span>docker compose up</span>
            </pre>
            <button
              onClick={copyDocker}
              className="absolute top-3 right-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: copied ? 'rgba(16,185,129,0.2)' : '#1f2937',
                color: copied ? '#10b981' : '#9ca3af',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : '#374151'}`,
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm" style={{ color: '#6b7280' }}>
            {[
              { icon: 'Docker', label: 'Docker Compose', sub: 'One command' },
              { icon: 'Free', label: 'Free forever', sub: 'MIT license' },
              { icon: 'Lock', label: 'Your data', sub: 'No telemetry' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                <div className="text-sm font-mono mb-1" style={{ color: '#4b5563' }}>{icon}</div>
                <div className="font-medium" style={{ color: '#e5e7eb' }}>{label}</div>
                <div className="text-xs" style={{ color: '#4b5563' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', boxShadow: '0 0 24px rgba(16,185,129,0.25)' }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: '#111', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              Open Full Dashboard
            </Link>
          </div>
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'AI Signals', sub: '12 assets' },
            { label: 'Backtesting', sub: 'Historical data' },
            { label: 'Telegram bot', sub: 'Push alerts' },
            { label: 'Open source', sub: 'MIT licensed' },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
              <div className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs" style={{ color: '#374151' }}>
          Signals powered by real market data from CoinGecko, Stooq, and exchange rate APIs.
          <br />
          <Link href="/" className="underline hover:text-gray-500 transition-colors">Back to homepage</Link>
          {' \u00b7 '}
          <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500 transition-colors">
            View source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

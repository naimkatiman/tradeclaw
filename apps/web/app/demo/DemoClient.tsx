'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DataSourceBadge, getDataSource, formatSignalTimestamp, shortSignalId } from '../components/data-source-badge';
import { AccuracyMeta } from '../components/accuracy-meta';
import { ShareButton } from '../components/share-button';
import { isHighRuleScore } from '../../lib/signal-thresholds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Signal {
  id: string;
  symbol: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  tp1: number;
  sl: number;
  rsi?: number;
  macd?: number;
  trend: string;
  timeframe: string;
  timestamp: string;
  source: string;
}

interface LeaderboardAsset {
  pair: string;
  hitRate24h: number;
  resolved24h: number;
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

function SignalInputs({ sig }: { sig: Signal }) {
  const inputs = [
    Number.isFinite(sig.rsi) ? `RSI ${sig.rsi?.toFixed(1)}` : null,
    Number.isFinite(sig.macd) ? `MACD histogram ${sig.macd}` : null,
    `${sig.timeframe} rule score ${sig.confidence}/100`,
  ].filter((value): value is string => value !== null);

  return (
    <div
      className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="font-semibold text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
        Recorded inputs
      </div>
      <div>{inputs.join(' \u00b7 ')}.</div>
      <div>Recorded stop level: {formatPrice(sig.symbol, sig.sl)}. The rule score is not a probability.</div>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = isHighRuleScore(value) ? '#10b981' : value >= 70 ? '#a1a1aa' : '#6b7280';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
        <span>Rule score</span>
        <span style={{ color }}>{value}/100</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
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
            <span className="text-[var(--foreground)] font-bold text-lg tracking-tight">{sig.symbol}</span>
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
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
              {sig.timeframe}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <DataSourceBadge source={getDataSource(sig.symbol)} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sig.asset} · {formatSignalTimestamp(sig.timestamp)}</div>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-black transition-all duration-500 ${confChanged ? 'scale-110' : 'scale-100'}`}
            style={{ color: dirColor }}
          >
            {sig.confidence}/100
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Rule score</div>
        </div>
      </div>
      <div
        className="text-[11px] mb-3 px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        {sig.trend}
      </div>
      <AccuracyMeta symbol={sig.symbol} timeframe={sig.timeframe} />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Entry', value: formatPrice(sig.symbol, sig.entry), color: 'var(--foreground)' },
          { label: 'TP', value: formatPrice(sig.symbol, sig.tp1), color: '#10b981' },
          { label: 'SL', value: formatPrice(sig.symbol, sig.sl), color: '#f43f5e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            <div className="text-[11px] font-mono font-semibold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex items-center gap-2">
          {Number.isFinite(sig.rsi) && <span>RSI {sig.rsi?.toFixed(1)}</span>}
          <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }} title={sig.id}>{shortSignalId(sig.id)}</span>
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          {sig.source}
        </span>
      </div>
      <SignalInputs sig={sig} />
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
          <div className="h-5 w-24 rounded" style={{ background: 'var(--border)' }} />
          <div className="h-3 w-32 rounded mt-2" style={{ background: '#1a1a1a' }} />
        </div>
        <div className="h-8 w-12 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-8 rounded-lg mb-3" style={{ background: 'var(--glass-bg)' }} />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg" style={{ background: 'var(--glass-bg)' }} />
        ))}
      </div>
      <div className="h-1 rounded-full mt-4" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
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
      <div className="rounded-2xl p-10 text-center border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(244,63,94,0.2)' }}>
        <div className="text-xl mb-2" style={{ color: '#f43f5e' }}>
          {error ? 'Signals unavailable' : 'No qualifying signals'}
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {error
            ? 'The signal feed could not be reached. No sample signals are substituted.'
            : 'The feed returned no candidates for the selected filters.'}
        </p>
        <button
          onClick={fetchSignals}
          className="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
          style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: '1px solid #374151' }}
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
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard?period=30d&scope=all')
      .then(r => {
        if (!r.ok) throw new Error('Leaderboard unavailable');
        return r.json();
      })
      .then(d => {
        setData((d.assets || []).filter((asset: LeaderboardAsset) => asset.resolved24h > 0).slice(0, 5));
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows count={5} />;
  if (error) return <p className="text-center text-[var(--text-secondary)] py-10">Recorded outcome data is unavailable.</p>;
  if (data.length === 0) return <p className="text-center text-[var(--text-secondary)] py-10">No leaderboard data yet.</p>;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#1a1a1a' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--glass-bg)' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-secondary)]">#</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-secondary)]">Pair</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-secondary)]">24h Hit Rate</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-secondary)]">Counted Outcomes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a, i) => (
              <tr key={a.pair} className="border-t" style={{ borderColor: '#1a1a1a' }}>
                <td className="px-5 py-3 text-[var(--text-secondary)]">{i + 1}</td>
                <td className="px-5 py-3 font-bold text-[var(--foreground)]">{a.pair}</td>
                <td className="px-5 py-3 text-right font-mono" style={{ color: a.hitRate24h >= 60 ? '#10b981' : '#a1a1aa' }}>
                  {a.hitRate24h.toFixed(1)}%
                </td>
                <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{a.resolved24h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        OHLCV-resolved signal outcomes from the selected 30-day window. Not broker fills or portfolio returns.
      </p>
    </div>
  );
}

function HeatmapTab() {
  const [entries, setEntries] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/heatmap')
      .then(r => r.json())
      .then(d => {
        setEntries((d.entries || []).filter((entry: HeatmapEntry) => entry.confidence > 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows count={5} />;
  if (entries.length === 0) return <p className="text-center text-[var(--text-secondary)] py-10">No heatmap data.</p>;

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
              <span className="text-sm font-bold text-[var(--foreground)]">{e.pair}</span>
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
            <div className="text-xs text-[var(--text-secondary)]">{e.name}</div>
            <div className="flex justify-between mt-2 text-[11px]">
              <span className="text-[var(--text-secondary)]">RSI {e.rsi.toFixed(1)}</span>
              <span style={{ color: e.confidence >= 70 ? '#10b981' : '#6b7280' }}>{e.confidence}/100</span>
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
  if (!portfolio) return <p className="text-center text-[var(--text-secondary)] py-10">Paper trading unavailable.</p>;

  const positions = (portfolio.positions || []).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Account stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Balance', value: `$${(portfolio.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Equity', value: `$${(portfolio.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: '#1a1a1a' }}>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{label}</div>
            <div className="text-lg font-bold text-[var(--foreground)] font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Open positions */}
      <div>
        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Open Positions ({positions.length})
        </div>
        {positions.length === 0 ? (
          <div className="rounded-xl p-6 text-center border" style={{ background: 'var(--bg-card)', borderColor: '#1a1a1a' }}>
            <p className="text-sm text-[var(--text-secondary)]">No open positions</p>
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
                    background: 'var(--bg-card)',
                    borderColor: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--foreground)]">{pos.symbol}</span>
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
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{timeAgo(pos.openedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-[var(--foreground)]">{formatPrice(pos.symbol, pos.entryPrice)}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">${pos.quantity.toFixed(0)} invested</div>
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
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-8 text-center border" style={{ background: 'var(--bg-card)', borderColor: '#1a1a1a' }}>
        <div className="text-lg font-bold text-[var(--foreground)]">No precomputed backtest is available</div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Choose a strategy, market, period, and cost assumptions to produce a result you can reproduce.
        </p>
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

export default function DemoClient({ initialSymbol }: { initialSymbol?: string }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prev, setPrev] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Signals');
  const [dataSource, setDataSource] = useState<'live-file' | 'realtime' | 'unavailable'>('unavailable');
  const countdownRef = useRef(REFRESH_INTERVAL);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/demo${initialSymbol ? `?symbol=${initialSymbol}` : ''}`
    : '/demo';

  const fetchSignals = useCallback(async () => {
    try {
      const query = new URLSearchParams({ limit: '20' });
      if (initialSymbol) query.set('pair', initialSymbol);
      const res = await fetch(`/api/v1/signals?${query.toString()}`);
      if (!res.ok) throw new Error('Signal feed unavailable');

      const data = await res.json();
      if (data.source !== 'live-file' && data.source !== 'realtime') {
        throw new Error('Signal feed did not declare a supported source');
      }

      let mapped: Signal[] = (data.signals || []).map((s: {
        id: string;
        pair: string;
        direction: string;
        confidence: number;
        price: number;
        tp: number;
        sl: number;
        rsi?: number;
        macd?: number;
        timeframe: string;
        generatedAt: string;
      }) => ({
        id: s.id,
        symbol: s.pair,
        asset: SYMBOL_NAMES[s.pair] || s.pair,
        direction: s.direction as 'BUY' | 'SELL',
        confidence: s.confidence,
        entry: s.price,
        tp1: s.tp,
        sl: s.sl,
        rsi: s.rsi,
        macd: s.macd,
        trend: `${s.timeframe} technical-rule candidate`,
        timeframe: s.timeframe,
        timestamp: s.generatedAt,
        source: data.source === 'live-file' ? 'Recorded signal feed' : 'Realtime signal engine',
      }));

      if (initialSymbol) {
        mapped = mapped.filter(s => s.symbol.toUpperCase() === initialSymbol.toUpperCase());
      }

      setDataSource(data.source);
      setSignals(current => {
        setPrev(current);
        return mapped;
      });
      setError(false);
      setTick(t => t + 1);
      countdownRef.current = REFRESH_INTERVAL;
      setCountdown(REFRESH_INTERVAL);
    } catch {
      setDataSource('unavailable');
      setSignals(current => {
        setPrev(current);
        return [];
      });
      setError(true);
      countdownRef.current = REFRESH_INTERVAL;
      setCountdown(REFRESH_INTERVAL);
    } finally {
      setLoading(false);
    }
  }, [initialSymbol]);

  useEffect(() => { fetchSignals(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const feedAvailable = dataSource !== 'unavailable';
  const sourceSummary = dataSource === 'live-file'
    ? 'Recorded signal feed generated from market OHLCV.'
    : dataSource === 'realtime'
      ? 'Signal candidates generated from a current market-data request.'
      : 'No verified signal feed is currently available.';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--background)', fontFamily: "'Geist', 'Inter', system-ui, sans-serif", color: 'var(--foreground)' }}
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
            <span style={{ color: 'var(--text-secondary)' }}>
              Like what you see? <span style={{ color: 'var(--foreground)' }}>TradeClaw is 100% open source.</span>
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
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm flex items-center justify-between"
          style={{
            borderColor: feedAvailable ? 'rgba(16,185,129,0.4)' : 'rgba(113,113,122,0.4)',
            background: feedAvailable ? 'rgba(6,78,59,0.5)' : 'rgba(39,39,42,0.5)',
            color: feedAvailable ? '#6ee7b7' : '#d4d4d8',
          }}
        >
          <span>
            <strong>{feedAvailable ? 'Declared Source' : 'Unavailable'}</strong> — {sourceSummary}
          </span>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-3"
            style={{
              background: feedAvailable ? 'rgba(16,185,129,0.2)' : 'rgba(113,113,122,0.2)',
              color: feedAvailable ? '#10b981' : '#d4d4d8',
              border: `1px solid ${feedAvailable ? 'rgba(16,185,129,0.4)' : 'rgba(113,113,122,0.4)'}`,
              animation: feedAvailable ? 'pulse 2s infinite' : 'none',
            }}
          >
            {feedAvailable ? '● MARKET-DERIVED' : '● NO DATA'}
          </span>
        </div>

        {/* Header */}
        <div className="pt-12 pb-8 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-4"
            style={{
              background: feedAvailable ? 'rgba(16,185,129,0.1)' : 'rgba(113,113,122,0.1)',
              border: `1px solid ${feedAvailable ? 'rgba(16,185,129,0.2)' : 'rgba(113,113,122,0.2)'}`,
              color: feedAvailable ? '#10b981' : '#d4d4d8',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: feedAvailable ? '#34d399' : '#71717a', animation: feedAvailable ? 'pulse 2s infinite' : 'none' }}
            />
            {feedAvailable ? 'Market-derived candidates · No login required' : 'Signal feed unavailable'}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: '#fff' }}>
            Trading Signal <span style={{ color: '#10b981' }}>Feed</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Rule-generated candidates from market OHLCV when the feed is available. Scores are not probabilities,
            and displayed levels are not broker fills or portfolio returns.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 rounded-full px-3 py-1 text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: countdown <= 5 ? '#10b981' : '#374151', transition: 'background 0.3s' }}
            />
            Next refresh in <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{countdown}s</span>
            &nbsp;\u00b7 Tick #{tick}
          </div>
          <div className="mt-4">
            <ShareButton url={shareUrl} title="TradeClaw signal feed" />
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
              Deploy with Docker Compose
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>
              Run your own TradeClaw instance.
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              No subscriptions. No vendor lock-in. Run the exact same platform you&apos;re seeing right now.
            </p>
          </div>

          <div className="rounded-xl p-4 mb-4 relative" style={{ background: '#080808', border: '1px solid var(--border)' }}>
            <pre className="text-sm font-mono overflow-x-auto" style={{ color: '#10b981', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--text-secondary)' }}>$ </span><span>git clone https://github.com/naimkatiman/tradeclaw.git</span>
              {'\n'}<span style={{ color: 'var(--text-secondary)' }}>$ </span><span>cd tradeclaw</span>
              {'\n'}<span style={{ color: 'var(--text-secondary)' }}>$ </span><span>docker compose up</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              { icon: 'Docker', label: 'Docker Compose', sub: 'Local stack' },
              { icon: 'MIT', label: 'Open source', sub: 'MIT license' },
              { icon: 'Data', label: 'Operator controlled', sub: 'Review integrations' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>{icon}</div>
                <div className="font-medium" style={{ color: 'var(--foreground)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
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
              style={{ background: 'var(--bg-card)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              Open Full Dashboard
            </Link>
          </div>
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Rule signals', sub: 'Supported markets' },
            { label: 'Backtesting', sub: 'Run your data' },
            { label: 'Telegram bot', sub: 'Push alerts' },
            { label: 'Open source', sub: 'MIT licensed' },
          ].map(({ label, sub }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Signup CTA */}
        <div className="mt-10 text-center py-6 px-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)', borderColor: 'rgba(16,185,129,0.2)' }}>
          <p className="text-sm font-semibold text-white mb-1">Want your own instance?</p>
          <p className="text-xs text-zinc-400 mb-3">Self-host TradeClaw and configure the market-data providers you intend to use.</p>
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-mono font-semibold transition-colors"
            style={{ background: '#10b981', color: '#000' }}
          >
            Sign up free →
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Signals powered by real market data from CoinGecko, Stooq, and exchange rate APIs.
          <br />
          <Link href="/" className="underline hover:text-[var(--text-secondary)] transition-colors">Back to homepage</Link>
          {' \u00b7 '}
          <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-secondary)] transition-colors">
            View source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

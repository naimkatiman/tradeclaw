'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

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

const REFRESH_INTERVAL = 30;

const SYMBOL_NAMES: Record<string, string> = {
  XAUUSD: 'Gold',
  XAGUSD: 'Silver',
  BTCUSD: 'Bitcoin',
  ETHUSD: 'Ethereum',
  XRPUSD: 'XRP',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
  USDCHF: 'USD/CHF',
};

function trendFromIndicators(sig: ApiSignal): string {
  const ema = sig.indicators.ema;
  const rsi = sig.indicators.rsi;
  const macd = sig.indicators.macd;

  const parts: string[] = [];
  if (ema.trend === 'up') parts.push('EMA trending up');
  else if (ema.trend === 'down') parts.push('EMA trending down');
  else parts.push('EMA sideways');

  if (rsi.signal === 'oversold') parts.push('RSI oversold');
  else if (rsi.signal === 'overbought') parts.push('RSI overbought');

  if (macd.signal === 'bullish') parts.push('MACD bullish');
  else if (macd.signal === 'bearish') parts.push('MACD bearish');

  return parts.join(' · ');
}

function mapApiSignal(api: ApiSignal): Signal {
  return {
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
  if (symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('AUD') || symbol.includes('NZD') || symbol.includes('CHF') || symbol.includes('CAD')) return price.toFixed(4);
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
  const bgGlow = isBuy
    ? 'rgba(16,185,129,0.06)'
    : 'rgba(244,63,94,0.06)';

  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, #0d0d0d 0%, #111 100%)`,
        borderColor: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
        boxShadow: `0 0 30px ${bgGlow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Header */}
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
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: '#1f2937', color: '#6b7280' }}
            >
              {sig.timeframe}
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{sig.asset} · {timeAgo(sig.timestamp)}</div>
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

      {/* Trend */}
      <div
        className="text-[11px] mb-3 px-3 py-1.5 rounded-lg"
        style={{ background: '#0a0a0a', color: '#9ca3af', border: '1px solid #1f2937' }}
      >
        {sig.trend}
      </div>

      {/* Levels */}
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

      {/* RSI + Source */}
      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: '#4b5563' }}>
        <span>RSI {sig.rsi.toFixed(1)}</span>
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
      style={{
        background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)',
        borderColor: 'rgba(255,255,255,0.05)',
      }}
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

export default function DemoClient() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prev, setPrev] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [copied, setCopied] = useState(false);
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

  // Fetch on mount
  useEffect(() => {
    fetchSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSignals();
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) return REFRESH_INTERVAL;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dockerCmd = `git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
docker compose up`;

  const copyDocker = () => {
    navigator.clipboard.writeText(dockerCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#050505',
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        color: '#e5e7eb',
      }}
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
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(16,185,129,0.3)',
            }}
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
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10b981',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real signals · No login required
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: '#fff' }}>
            AI Signals, <span style={{ color: '#10b981' }}>Live</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#6b7280' }}>
            TradeClaw generates AI-powered BUY/SELL signals from real market data via CoinGecko, Stooq, and exchange rate APIs.
            Refreshes every 30 seconds — exactly what your self-hosted instance shows.
          </p>
          {/* Countdown */}
          <div
            className="inline-flex items-center gap-2 mt-4 rounded-full px-3 py-1 text-xs"
            style={{ background: '#111', border: '1px solid #1f2937', color: '#4b5563' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: countdown <= 5 ? '#10b981' : '#374151', transition: 'background 0.3s' }}
            />
            Next refresh in <span style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{countdown}s</span>
            &nbsp;· Tick #{tick}
          </div>
        </div>

        {/* Signal grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error || signals.length === 0 ? (
          <div className="mb-12 rounded-2xl p-10 text-center border" style={{ background: '#0d0d0d', borderColor: 'rgba(244,63,94,0.2)' }}>
            <div className="text-xl mb-2" style={{ color: '#f43f5e' }}>Signals unavailable</div>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              Market data APIs may be temporarily unreachable. Try the self-hosted version for reliable, uninterrupted signals.
            </p>
            <button
              onClick={fetchSignals}
              className="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
              style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {signals.map((sig, i) => (
              <SignalCard key={`${sig.symbol}-${sig.timeframe}`} sig={sig} prev={prev[i]} />
            ))}
          </div>
        )}

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
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
                color: '#10b981',
              }}
            >
              Deploy your own in 60 seconds
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>
              Own your signals. Self-host in 60 seconds.
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: '#6b7280' }}>
              No subscriptions. No vendor lock-in. Run the exact same platform you&apos;re seeing right now — on your own server.
            </p>
          </div>

          {/* Code block */}
          <div
            className="rounded-xl p-4 mb-4 relative"
            style={{ background: '#080808', border: '1px solid #1f2937' }}
          >
            <pre
              className="text-sm font-mono overflow-x-auto"
              style={{ color: '#10b981', lineHeight: 1.7 }}
            >
              <span style={{ color: '#374151' }}>$ </span>
              <span>git clone https://github.com/naimkatiman/tradeclaw.git</span>
              {'\n'}
              <span style={{ color: '#374151' }}>$ </span>
              <span>cd tradeclaw</span>
              {'\n'}
              <span style={{ color: '#374151' }}>$ </span>
              <span>docker compose up</span>
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
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 0 24px rgba(16,185,129,0.25)',
              }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: '#111',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
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
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}
            >
              <div className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-10 text-xs" style={{ color: '#374151' }}>
          Signals powered by real market data from CoinGecko, Stooq, and exchange rate APIs.
          <br />
          <Link href="/" className="underline hover:text-gray-500 transition-colors">
            Back to homepage
          </Link>
          {' · '}
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-500 transition-colors"
          >
            View source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

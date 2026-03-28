'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Signal = {
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
};

const SEED_SIGNALS: Signal[] = [
  {
    symbol: 'BTC/USD',
    asset: 'Bitcoin',
    direction: 'BUY',
    confidence: 87,
    entry: 67_420,
    tp1: 69_800,
    tp2: 72_500,
    sl: 65_100,
    rsi: 58.4,
    trend: 'Bullish breakout above 200 EMA',
    timeframe: 'H4',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    symbol: 'ETH/USD',
    asset: 'Ethereum',
    direction: 'BUY',
    confidence: 79,
    entry: 3_412,
    tp1: 3_580,
    tp2: 3_750,
    sl: 3_280,
    rsi: 54.1,
    trend: 'Momentum divergence reversal',
    timeframe: 'H1',
    timestamp: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    symbol: 'XAU/USD',
    asset: 'Gold',
    direction: 'SELL',
    confidence: 82,
    entry: 2_318.5,
    tp1: 2_295.0,
    tp2: 2_270.0,
    sl: 2_338.0,
    rsi: 67.8,
    trend: 'Overbought rejection at resistance',
    timeframe: 'H4',
    timestamp: new Date(Date.now() - 480_000).toISOString(),
  },
  {
    symbol: 'EUR/USD',
    asset: 'Euro',
    direction: 'SELL',
    confidence: 74,
    entry: 1.0842,
    tp1: 1.0798,
    tp2: 1.0754,
    sl: 1.0878,
    rsi: 63.2,
    trend: 'Double top at weekly resistance',
    timeframe: 'H1',
    timestamp: new Date(Date.now() - 600_000).toISOString(),
  },
];

function fuzz(n: number, maxPct = 0.015): number {
  return n * (1 + (Math.random() * 2 - 1) * maxPct);
}

function fuzzConf(c: number): number {
  return Math.min(99, Math.max(51, Math.round(c + (Math.random() * 6 - 3))));
}

function fuzzRsi(r: number): number {
  return Math.min(85, Math.max(25, +(r + (Math.random() * 2 - 1)).toFixed(1)));
}

function formatPrice(symbol: string, price: number): string {
  if (symbol.includes('EUR') || symbol.includes('GBP')) return price.toFixed(4);
  if (symbol.includes('XAU')) return price.toFixed(2);
  if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
      <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
        <span>Confidence</span>
        <span style={{ color }}>{value}%</span>
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
  const bgGlow = isBuy
    ? 'rgba(16,185,129,0.06)'
    : 'rgba(244,63,94,0.06)';

  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-500"
      style={{
        background: 'var(--bg-card)',
        borderColor: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
        boxShadow: `0 0 30px ${bgGlow}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--foreground)' }}>{sig.symbol}</span>
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
              style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {sig.timeframe}
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sig.asset} · {timeAgo(sig.timestamp)}</div>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-black transition-all duration-500 ${confChanged ? 'scale-110' : 'scale-100'}`}
            style={{ color: dirColor }}
          >
            {sig.confidence}%
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>AI score</div>
        </div>
      </div>

      {/* Trend */}
      <div
        className="text-[11px] mb-3 px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        {sig.trend}
      </div>

      {/* Levels */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Entry', value: formatPrice(sig.symbol, sig.entry), color: 'var(--foreground)' },
          { label: 'TP1', value: formatPrice(sig.symbol, sig.tp1), color: '#10b981' },
          { label: 'TP2', value: formatPrice(sig.symbol, sig.tp2), color: '#34d399' },
          { label: 'SL', value: formatPrice(sig.symbol, sig.sl), color: '#f43f5e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            <div className="text-[11px] font-mono font-semibold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* RSI */}
      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>RSI {sig.rsi}</span>
        <div className="flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#10b981' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Live</span>
        </div>
      </div>

      <ConfidenceBar value={sig.confidence} />
    </div>
  );
}

export default function DemoClient() {
  const [signals, setSignals] = useState<Signal[]>(SEED_SIGNALS);
  const [prev, setPrev] = useState<Signal[]>(SEED_SIGNALS);
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);

  const randomize = useCallback(() => {
    setPrev(signals);
    setSignals(s =>
      s.map(sig => ({
        ...sig,
        confidence: fuzzConf(sig.confidence),
        entry: fuzz(sig.entry, 0.005),
        tp1: fuzz(sig.tp1, 0.005),
        tp2: fuzz(sig.tp2, 0.004),
        sl: fuzz(sig.sl, 0.004),
        rsi: fuzzRsi(sig.rsi),
      }))
    );
    setTick(t => t + 1);
    setCountdown(10);
  }, [signals]);

  useEffect(() => {
    const interval = setInterval(randomize, 10_000);
    return () => clearInterval(interval);
  }, [randomize]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => (c <= 1 ? 10 : c - 1)), 1000);
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
        background: 'var(--background)',
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        color: 'var(--foreground)',
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
            <span style={{ color: '#10b981' }}>⭐</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Like what you see? <span style={{ color: 'var(--foreground)' }}>TradeClaw is 100% open source.</span>
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
            ⭐ Star on GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
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
            Live demo · No login required
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
            AI Signals, <span style={{ color: '#10b981' }}>Live</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            TradeClaw generates AI-powered BUY/SELL signals for BTC, ETH, Gold, and EUR/USD.
            Updates every 10 seconds — exactly what your self-hosted instance would show.
          </p>
          {/* Countdown */}
          <div
            className="inline-flex items-center gap-2 mt-4 rounded-full px-3 py-1 text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: countdown <= 3 ? '#10b981' : 'var(--border)', transition: 'background 0.3s' }}
            />
            Next update in <span style={{ color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{countdown}s</span>
            &nbsp;· Tick #{tick}
          </div>
        </div>

        {/* Signal grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {signals.map((sig, i) => (
            <SignalCard key={sig.symbol} sig={sig} prev={prev[i]} />
          ))}
        </div>

        {/* Deploy section */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'var(--bg-card)',
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
              🚀 Deploy your own in 60 seconds
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Own your signals. Self-host in 60 seconds.
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
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
                background: copied ? 'rgba(16,185,129,0.2)' : 'var(--glass-bg)',
                color: copied ? '#10b981' : 'var(--text-secondary)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              { icon: '🐳', label: 'Docker Compose', sub: 'One command' },
              { icon: '🆓', label: 'Free forever', sub: 'MIT license' },
              { icon: '🔒', label: 'Your data', sub: 'No telemetry' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}>
                <div className="text-xl mb-1">{icon}</div>
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
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 0 24px rgba(16,185,129,0.25)',
              }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              ⭐ Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'var(--bg-card)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              Open Full Dashboard →
            </Link>
          </div>
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🤖', label: 'AI Signals', sub: '15 assets' },
            { icon: '📊', label: 'Backtesting', sub: 'Historical data' },
            { icon: '🔔', label: 'Telegram bot', sub: 'Push alerts' },
            { icon: '🆓', label: 'Open source', sub: 'MIT licensed' },
          ].map(({ icon, label, sub }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-10 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Demo uses simulated data. Real instance uses live market feeds.
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

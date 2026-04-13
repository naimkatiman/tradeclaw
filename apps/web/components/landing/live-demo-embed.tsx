'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithLicense } from '@/lib/license-client';

interface Signal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  timestamp: string;
  price?: number;
  rsi?: number;
  macd?: number;
}

interface PricePoint {
  price: number;
  time: number;
}

const SPARKLINE_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD'];

function SparklineChart({ pair }: { pair: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const priceHistory = useRef<PricePoint[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const pts = priceHistory.current;
    if (pts.length < 2) return;
    const prices = pts.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? '#10b981' : '#f43f5e';

    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, isUp ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = height - ((pt.price - min) / range) * (height - 6) - 3;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    });
    const lastX = width;
    const lastY = height - ((prices[prices.length - 1] - min) / range) * (height - 6) - 3;
    ctx.lineTo(lastX, lastY);
    ctx.lineTo(lastX, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = height - ((pt.price - min) / range) * (height - 6) - 3;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // glowing tip dot
    const tipX = lastX - 1;
    const tipY = lastY;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    // seed with synthetic data
    const basePrice = pair === 'BTCUSD' ? 84000 : pair === 'ETHUSD' ? 3200 : 2650;
    const volatility = pair === 'BTCUSD' ? 0.002 : pair === 'ETHUSD' ? 0.003 : 0.001;
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const noise = (Math.random() - 0.48) * basePrice * volatility;
      priceHistory.current.push({ price: basePrice + noise, time: now - i * 2000 });
    }
    draw();

    const interval = setInterval(() => {
      const last = priceHistory.current[priceHistory.current.length - 1];
      const vol = last.price * volatility;
      const next = last.price + (Math.random() - 0.48) * vol;
      priceHistory.current.push({ price: next, time: Date.now() });
      if (priceHistory.current.length > 60) priceHistory.current.shift();
      draw();
    }, 2000);

    return () => clearInterval(interval);
  }, [pair, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      className="opacity-80"
    />
  );
}

function SignalBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  const isBuy = direction === 'BUY';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
        color: isBuy ? '#10b981' : '#f43f5e',
        border: `1px solid ${isBuy ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}`,
        textShadow: `0 0 8px ${isBuy ? 'rgba(16,185,129,0.6)' : 'rgba(244,63,94,0.6)'}`,
      }}
    >
      {isBuy ? '▲' : '▼'} {direction}
    </span>
  );
}

function ConfBar({ value }: { value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 70 ? '#f59e0b' : '#6b7280';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 4px ${color}40` }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export function LiveDemoEmbed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetchWithLicense('/api/signals?limit=6');
        if (!res.ok) return;
        const data = await res.json();
        if (data.signals) {
          setSignals(data.signals.slice(0, 6));
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    }
    fetchSignals();
    const interval = setInterval(() => {
      fetchSignals();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-emerald-400 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            See It In Action
          </h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Real AI-powered signals from live market data. No account required.
          </p>
        </div>

        {/* Dashboard embed frame */}
        <div
          className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{
            background: 'rgba(10,10,10,0.8)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(16,185,129,0.08), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
            </div>
            <div className="flex-1 mx-4">
              <div className="mx-auto max-w-xs flex items-center gap-2 px-3 py-1 rounded-md text-xs text-zinc-500" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                tradeclaw.win/dashboard
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Live
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-5">
            {/* Sparklines row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {SPARKLINE_PAIRS.map((pair) => (
                <div
                  key={pair}
                  className="rounded-xl p-3 border border-white/5"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{pair.replace('USD', '')}</span>
                    <span className="text-[9px] text-zinc-500">Live</span>
                  </div>
                  <SparklineChart pair={pair} />
                </div>
              ))}
            </div>

            {/* Signal cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">Latest Signals</span>
                <span className="text-[10px] text-zinc-600">Auto-refresh 30s</span>
              </div>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg p-3 border border-white/5 animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="h-4 w-14 rounded bg-white/10" />
                          <div className="h-4 w-10 rounded bg-white/10" />
                        </div>
                        <div className="h-4 w-20 rounded bg-white/10" />
                      </div>
                    </div>
                  ))
                : signals.slice(0, 4).map((sig, i) => (
                    <div
                      key={`${sig.symbol}-${sig.timeframe}`}
                      className="rounded-lg p-3 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        animationDelay: `${i * 80}ms`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{sig.symbol}</span>
                        <SignalBadge direction={sig.direction} />
                        <span className="text-[10px] text-zinc-600 font-mono">{sig.timeframe}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ConfBar value={sig.confidence} />
                        <span className="text-[10px] text-zinc-700 tabular-nums w-6 text-right">{timeAgo(sig.timestamp)}</span>
                      </div>
                    </div>
                  ))}
            </div>

            {/* CTA row */}
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-zinc-600">
                {signals.length} signals • 10 pairs • 3 timeframes
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  boxShadow: '0 0 16px rgba(16,185,129,0.25)',
                }}
              >
                Open Full Dashboard
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Sub-CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          <Link href="/embed" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Embed on your site
          </Link>
          <span className="text-zinc-800">•</span>
          <Link href="/rss" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
            RSS feed
          </Link>
          <span className="text-zinc-800">•</span>
          <Link href="/api-keys" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            Free API key
          </Link>
          <span className="text-zinc-800">•</span>
          <Link href="/telegram" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Telegram alerts
          </Link>
        </div>
      </div>
    </section>
  );
}

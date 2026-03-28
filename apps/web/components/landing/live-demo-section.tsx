'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Signal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  timestamp: string;
}

export function LiveDemoSection() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSignals() {
      try {
        const res = await fetch('/api/signals?limit=5');
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.signals || []).slice(0, 5).map((s: Signal) => ({
          symbol: s.symbol,
          direction: s.direction,
          confidence: s.confidence,
          timeframe: s.timeframe,
          timestamp: s.timestamp,
        }));
        if (mounted) {
          setSignals(items);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchSignals();
    const interval = setInterval(fetchSignals, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  function timeAgo(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Live Signal Feed
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)]">
            See It In Action
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
            Real AI-powered signals from live market data. Updates every 30 seconds.
          </p>
        </div>

        {/* Signal Cards */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 border border-white/5 bg-black/40 backdrop-blur animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-16 rounded bg-white/10" />
                      <div className="h-5 w-10 rounded bg-white/10" />
                    </div>
                    <div className="h-5 w-20 rounded bg-white/10" />
                  </div>
                </div>
              ))
            : signals.map((sig, i) => {
                const isBuy = sig.direction === 'BUY';
                return (
                  <div
                    key={`${sig.symbol}-${sig.timeframe}`}
                    className="rounded-xl p-4 border border-white/10 bg-black/40 backdrop-blur opacity-0 animate-fade-up"
                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{sig.symbol}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                            color: isBuy ? '#10b981' : '#f43f5e',
                            border: `1px solid ${isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                          }}
                        >
                          {sig.direction}
                        </span>
                        <span className="text-[10px] text-zinc-500">{sig.timeframe}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Confidence bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${sig.confidence}%`,
                                background: sig.confidence >= 80 ? '#10b981' : sig.confidence >= 70 ? '#f59e0b' : '#6b7280',
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-mono font-semibold"
                            style={{
                              color: sig.confidence >= 80 ? '#10b981' : sig.confidence >= 70 ? '#f59e0b' : '#6b7280',
                            }}
                          >
                            {sig.confidence}%
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-600">{timeAgo(sig.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              boxShadow: '0 0 24px rgba(16,185,129,0.2)',
            }}
          >
            View Live Dashboard
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

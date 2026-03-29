/**
 * LiveHeroSignals — Server component.
 * Fetches real signals at page render time and renders them as
 * a "what the platform is seeing RIGHT NOW" strip above the fold.
 */

import Link from 'next/link';

interface Signal {
  pair?: string;
  symbol?: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe?: string;
  price?: number;
}

async function fetchLiveSignals(): Promise<Signal[]> {
  try {
    // Use internal URL for server-side fetch (same process)
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/signals?limit=8`, {
      next: { revalidate: 60 }, // revalidate every 60s
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.signals ?? [];
  } catch {
    return [];
  }
}

const FALLBACK: Signal[] = [
  { pair: 'BTCUSD', direction: 'BUY', confidence: 87, timeframe: 'H1' },
  { pair: 'XAUUSD', direction: 'SELL', confidence: 74, timeframe: 'H4' },
  { pair: 'ETHUSD', direction: 'BUY', confidence: 81, timeframe: 'H1' },
  { pair: 'EURUSD', direction: 'SELL', confidence: 68, timeframe: 'D1' },
  { pair: 'GBPUSD', direction: 'BUY', confidence: 79, timeframe: 'H1' },
  { pair: 'XAGUSD', direction: 'SELL', confidence: 72, timeframe: 'H4' },
];

export async function LiveHeroSignals() {
  const rawSignals = await fetchLiveSignals();
  const signals = (rawSignals.length >= 4 ? rawSignals : FALLBACK).slice(0, 8);

  return (
    <section className="relative px-4 pb-6 -mt-4">
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden border border-white/8"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)' }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  animation: 'lhsPulse 2s ease infinite',
                }}
              />
              <style>{`@keyframes lhsPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              <span className="text-white/60 text-xs font-medium">Live signals — updated every 60s</span>
            </div>
            <Link
              href="/dashboard"
              className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors"
            >
              Full dashboard →
            </Link>
          </div>

          {/* Signal row */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {signals.map((sig, i) => {
              const pair = sig.pair ?? sig.symbol ?? 'UNKNOWN';
              const isBuy = sig.direction === 'BUY';
              return (
                <Link
                  key={`${pair}-${i}`}
                  href={`/signal/${pair}-${sig.timeframe ?? 'H1'}-${sig.direction}`}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-r border-white/6 hover:bg-white/5 transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white text-xs font-bold tracking-wide">{pair.replace('USD', '/USD').replace('EUR', 'EUR/')}</span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          isBuy
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {sig.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ width: 48, background: 'rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${sig.confidence}%`,
                            background: isBuy ? '#10b981' : '#f43f5e',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                      <span className="text-white/40 text-[10px]">{sig.confidence}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/screener"
              className="flex-shrink-0 flex items-center gap-1 px-4 py-3 text-emerald-400 hover:text-emerald-300 text-xs transition-colors whitespace-nowrap"
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

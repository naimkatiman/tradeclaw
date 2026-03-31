/**
 * LiveHeroSignals — Server component.
 * Fetches real signals at page render time and renders them as
 * a "what the platform is seeing RIGHT NOW" strip above the fold.
 */

import Link from 'next/link';
import {
  PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  WATCHLIST_MIN_CONFIDENCE,
} from '../../lib/signal-thresholds';

interface Signal {
  pair?: string;
  symbol?: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe?: string;
  price?: number;
  dataQuality?: 'real' | 'synthetic';
}

async function fetchLiveSignals(): Promise<Signal[]> {
  try {
    // Use internal URL for server-side fetch (same process)
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/signals?limit=16`, {
      next: { revalidate: 60 }, // revalidate every 60s
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.signals ?? [];
  } catch {
    return [];
  }
}

const PLACEHOLDER_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'XAGUSD'];

export async function LiveHeroSignals() {
  const rawSignals = await fetchLiveSignals();
  const realSignals = rawSignals.filter((signal) => signal.dataQuality !== 'synthetic');
  const publishedSignals = realSignals.filter(
    (signal) => signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  );
  const watchlistSignals = realSignals.filter(
    (signal) =>
      signal.confidence >= WATCHLIST_MIN_CONFIDENCE &&
      signal.confidence < PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  );

  const hasRealSignals = publishedSignals.length >= 1;
  const signals = hasRealSignals ? publishedSignals.slice(0, 8) : [];
  const watchlist = watchlistSignals.slice(0, 4);

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
              <span className="text-white/60 text-xs font-medium">
                Live signals — {PUBLISHED_SIGNAL_MIN_CONFIDENCE}%+ only
              </span>
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
            {hasRealSignals ? (
              <>
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
              </>
            ) : (
              <>
                {PLACEHOLDER_PAIRS.map((pair) => (
                  <div
                    key={pair}
                    className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-r border-white/6"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-white/40 text-xs font-bold tracking-wide">{pair.replace('USD', '/USD')}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/25">
                          ...
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1 rounded-full overflow-hidden animate-pulse"
                          style={{ width: 48, background: 'rgba(255,255,255,0.08)' }}
                        >
                          <div className="h-full rounded-full bg-emerald-500/30" style={{ width: '40%' }} />
                        </div>
                        <span className="text-white/25 text-[10px]">—</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  Generating signals...
                </div>
              </>
            )}
          </div>

          {watchlist.length > 0 && (
            <div className="border-t border-white/8 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                  On watch
                </span>
                <span className="text-[10px] text-white/25">
                  Building setups below {PUBLISHED_SIGNAL_MIN_CONFIDENCE}% and not published as signals yet
                </span>
                {watchlist.map((sig) => {
                  const pair = sig.pair ?? sig.symbol ?? 'UNKNOWN';
                  return (
                    <Link
                      key={`${pair}-${sig.timeframe ?? 'H1'}-${sig.direction}-watch`}
                      href={`/signal/${pair}-${sig.timeframe ?? 'H1'}-${sig.direction}`}
                      className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:border-white/16 hover:text-white/80"
                    >
                      {pair} {sig.direction} {sig.confidence}%
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

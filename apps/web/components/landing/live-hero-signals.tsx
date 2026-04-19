/**
 * LiveHeroSignals — Server component.
 *
 * Renders the landing-hero ticker of recent signals. Fetches the
 * **public teaser endpoint** `/api/signals/public` which returns only
 * symbol/timeframe/direction/confidence/timestamp — no entry, no SL,
 * no TP values, no stable signal id. Scraping this page reveals
 * nothing tradable.
 *
 * Per-card links route to `/signal/<symbol>-<timeframe>-<direction>`
 * which is tier-gated at the server — free/anon viewers see locked
 * price pills + upgrade CTA there.
 */

import Link from 'next/link';
import type { SignalTeaser } from '../../lib/signal-teaser';

interface TeaserResponse {
  count: number;
  signals: SignalTeaser[];
}

async function fetchTeaserSignals(): Promise<SignalTeaser[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/signals/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TeaserResponse;
    return Array.isArray(data.signals) ? data.signals.slice(0, 8) : [];
  } catch {
    return [];
  }
}

const PLACEHOLDER_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'XAGUSD'];

export async function LiveHeroSignals() {
  const signals = await fetchTeaserSignals();
  const hasRealSignals = signals.length > 0;

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
                Live signals — public preview
              </span>
            </div>
            <Link
              href="/pricing?from=hero"
              className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors"
            >
              Unlock entry &amp; TP →
            </Link>
          </div>

          {/* Signal row */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {hasRealSignals ? (
              <>
                {signals.map((sig, i) => {
                  const isBuy = sig.direction === 'BUY';
                  return (
                    <Link
                      key={`${sig.symbol}-${i}`}
                      href={`/signal/${sig.symbol}-${sig.timeframe}-${sig.direction}`}
                      className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-r border-white/6 hover:bg-white/5 transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-white text-xs font-bold tracking-wide">
                            {sig.symbol.replace('USD', '/USD').replace('EUR', 'EUR/')}
                          </span>
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
                  href="/pricing?from=hero-all"
                  className="flex-shrink-0 flex items-center gap-1 px-4 py-3 text-emerald-400 hover:text-emerald-300 text-xs transition-colors whitespace-nowrap"
                >
                  Upgrade for full signals →
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
        </div>
      </div>
    </section>
  );
}

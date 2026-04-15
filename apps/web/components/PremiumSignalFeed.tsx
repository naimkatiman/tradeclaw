'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchWithLicense, getStoredKey } from '@/lib/license-client';

interface PremiumSignal {
  id: string;
  strategyId?: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss?: number;
  takeProfit1?: number;
  timestamp: number;
}

interface FeedResponse {
  signals: PremiumSignal[];
  now?: number;
  locked: boolean;
}

const POLL_MS = 5000;

const STRATEGY_LAYOUT: Record<string, string> = {
  'tv-hafiz-synergy': 'hafiz',
  'tv-impulse-hunter': 'impulse',
  'tv-zaky-classic': 'classic',
};

export function PremiumSignalFeed() {
  const [signals, setSignals] = useState<PremiumSignal[]>([]);
  const [locked, setLocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [openChartFor, setOpenChartFor] = useState<string | null>(null);
  const lastSinceRef = useRef<number>(0);
  const hasKey = typeof window !== 'undefined' && !!getStoredKey();

  useEffect(() => {
    if (!hasKey) return;
    let cancelled = false;

    async function tick() {
      try {
        const url = lastSinceRef.current
          ? `/api/premium-signals?since=${lastSinceRef.current}`
          : `/api/premium-signals`;
        const res = await fetchWithLicense(url);
        if (!res.ok) {
          setError(`feed ${res.status}`);
          return;
        }
        const data = (await res.json()) as FeedResponse;
        if (cancelled) return;
        setLocked(data.locked);
        setError(null);
        if (data.signals.length > 0) {
          setSignals((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const fresh = data.signals.filter((s) => !seen.has(s.id));
            return [...fresh, ...prev].slice(0, 50);
          });
        }
        if (data.now) lastSinceRef.current = data.now;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'feed error');
      }
    }

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasKey]);

  if (!hasKey) return null;
  if (locked) return null;

  return (
    <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
          Premium Live Feed
        </h2>
        <span className="text-xs text-amber-300/70">
          polling every {POLL_MS / 1000}s
        </span>
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {signals.length === 0 ? (
        <p className="text-sm text-amber-200/70">
          No premium signals yet. They will appear here as your TradingView
          strategies fire.
        </p>
      ) : (
        <ul className="space-y-2">
          {signals.map((s) => {
            const layout = STRATEGY_LAYOUT[s.strategyId ?? ''] ?? 'hafiz';
            const isOpen = openChartFor === s.id;
            return (
              <li
                key={s.id}
                className="rounded border border-amber-500/20 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">
                      <span
                        className={
                          s.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {s.direction}
                      </span>{' '}
                      {s.symbol} · {s.timeframe} @ {s.entry}
                    </span>
                    <span className="text-xs text-amber-200/60">
                      {s.strategyId ?? 'premium'} · conf {s.confidence}
                      {s.stopLoss ? ` · SL ${s.stopLoss}` : ''}
                      {s.takeProfit1 ? ` · TP ${s.takeProfit1}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenChartFor(isOpen ? null : s.id)}
                    className="rounded border border-amber-500/40 px-2 py-1 text-xs hover:bg-amber-500/10"
                  >
                    {isOpen ? 'Hide chart' : 'Chart'}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3">
                    <ChartImage symbol={s.symbol} timeframe={s.timeframe} layout={layout} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ChartImage({
  symbol,
  timeframe,
  layout,
}: {
  symbol: string;
  timeframe: string;
  layout: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithLicense(
          `/api/premium-signals/chart?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}&layout=${encodeURIComponent(layout)}`,
        );
        if (!res.ok) {
          setErr(`chart ${res.status}`);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoke = url;
        if (!cancelled) setSrc(url);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'chart error');
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [symbol, timeframe, layout]);

  if (err) return <p className="text-xs text-red-400">{err}</p>;
  if (!src) return <p className="text-xs text-amber-200/60">loading chart…</p>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${symbol} ${timeframe}`} className="w-full rounded" />;
}

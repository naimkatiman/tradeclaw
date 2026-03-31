'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WidgetSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timeframe: string;
}

interface LiveActivityWidgetProps {
  apiUrl?: string;
  refreshInterval?: number;
  height?: number;
  showBranding?: boolean;
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'BUY') return <TrendingUp className="w-3 h-3" />;
  if (direction === 'SELL') return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

export default function LiveActivityWidget({
  apiUrl = '/api/live-feed',
  refreshInterval = 30000,
  height = 120,
  showBranding = false,
}: LiveActivityWidgetProps) {
  const [signals, setSignals] = useState<WidgetSignal[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const raw: Array<Record<string, unknown>> = json.signals ?? [];
        if (!cancelled) {
          setSignals(
            raw.map((s) => ({
              id: String(s.id ?? `${s.symbol}-${s.timeframe}`),
              symbol: String(s.symbol ?? 'BTCUSD'),
              direction: (String(s.direction ?? 'HOLD').toUpperCase() as WidgetSignal['direction']),
              confidence: typeof s.confidence === 'number' ? Math.round(s.confidence) : 75,
              timeframe: String(s.timeframe ?? 'H1'),
            })),
          );
        }
      } catch {
        /* keep existing */
      }
    }

    void load();
    const id = setInterval(() => void load(), refreshInterval);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiUrl, refreshInterval]);

  if (signals.length === 0) return null;

  const items = [...signals, ...signals];

  return (
    <div
      className="overflow-hidden bg-black/40 backdrop-blur-sm rounded-xl border border-white/10"
      style={{ height }}
    >
      <div className="flex items-center h-full">
        <div className="flex animate-marquee-widget whitespace-nowrap py-2">
          {items.map((sig, i) => {
            const dirCls =
              sig.direction === 'BUY'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                : sig.direction === 'SELL'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                  : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25';

            return (
              <span key={`${sig.id}-${i}`} className="inline-flex items-center gap-1.5 mx-4 text-xs">
                <span className="font-bold text-white">{sig.symbol}</span>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${dirCls}`}>
                  <DirectionIcon direction={sig.direction} />
                  {sig.direction}
                </span>
                <span className="text-zinc-400">{sig.confidence}%</span>
                <span className="text-zinc-500 text-[10px]">{sig.timeframe}</span>
              </span>
            );
          })}
        </div>
      </div>

      {showBranding && (
        <div className="absolute bottom-1 right-2 text-[9px] text-zinc-600">
          Powered by TradeClaw
        </div>
      )}

      <style>{`
        @keyframes marqueeWidget {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-widget {
          animation: marqueeWidget 25s linear infinite;
        }
        .animate-marquee-widget:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

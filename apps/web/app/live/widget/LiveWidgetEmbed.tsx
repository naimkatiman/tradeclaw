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

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'BUY') return <TrendingUp className="w-3 h-3" />;
  if (direction === 'SELL') return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function normalize(raw: Record<string, unknown>): WidgetSignal {
  return {
    id: String(raw.id ?? `${raw.symbol}-${raw.timeframe}`),
    symbol: String(raw.symbol ?? 'BTCUSD'),
    direction: (String(raw.direction ?? 'HOLD').toUpperCase() as WidgetSignal['direction']),
    confidence: typeof raw.confidence === 'number' ? Math.round(raw.confidence) : 75,
    timeframe: String(raw.timeframe ?? 'H1'),
  };
}

export default function LiveWidgetEmbed() {
  const [signals, setSignals] = useState<WidgetSignal[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/live-feed');
        if (!res.ok || cancelled) return;
        const json: { signals?: Record<string, unknown>[] } = await res.json();
        const raw = json.signals ?? [];
        if (!cancelled) {
          setSignals(raw.map(normalize));
        }
      } catch {
        /* keep existing */
      }
    }

    void load();
    const id = setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-500 text-xs">
        Loading signals…
      </div>
    );
  }

  const items = [...signals, ...signals];

  return (
    <div className="overflow-hidden bg-zinc-950 h-full w-full flex items-center">
      <div className="flex animate-marquee-live whitespace-nowrap">
        {items.map((sig, i) => {
          const dirCls =
            sig.direction === 'BUY'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : sig.direction === 'SELL'
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';

          return (
            <span key={`${sig.id}-${i}`} className="inline-flex items-center gap-1.5 mx-5 text-xs">
              <span className="font-bold text-white">{sig.symbol}</span>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${dirCls}`}
              >
                <DirectionIcon direction={sig.direction} />
                {sig.direction}
              </span>
              <span className="text-zinc-400">{sig.confidence}%</span>
              <span className="text-zinc-600 text-[10px]">{sig.timeframe}</span>
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes marqueeLive {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-live {
          animation: marqueeLive 30s linear infinite;
        }
        .animate-marquee-live:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

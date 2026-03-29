'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SignalOutcomeCard, type SignalOutcomeData } from './signal-outcome-card';

interface HistoryApiRecord {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  timestamp: number;
  tp1?: number;
  sl?: number;
  isSimulated?: boolean;
  lastVerified?: number;
  outcomes: {
    '4h': { price: number; pnlPct: number; hit: boolean } | null;
    '24h': { price: number; pnlPct: number; hit: boolean } | null;
  };
}

function toOutcomeData(r: HistoryApiRecord): SignalOutcomeData {
  const outcome = r.outcomes['24h'] ?? r.outcomes['4h'];
  return {
    id: r.id,
    pair: r.pair,
    direction: r.direction,
    confidence: r.confidence,
    entryPrice: r.entryPrice,
    tp1: r.tp1,
    sl: r.sl,
    timestamp: r.timestamp,
    resolvedAt: r.lastVerified ?? undefined,
    hit: outcome?.hit,
    pnlPct: outcome?.pnlPct,
    outcomePrice: outcome?.price,
  };
}

interface LatestOutcomesProps {
  /** Max number of cards to show */
  limit?: number;
  /** Use compact card variant */
  compact?: boolean;
  /** Optional title override */
  title?: string;
}

export function LatestOutcomes({
  limit = 5,
  compact = false,
  title = 'Recent Signal Outcomes -- Verified Against Real Market Data',
}: LatestOutcomesProps) {
  const [outcomes, setOutcomes] = useState<SignalOutcomeData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOutcomes() {
      try {
        // Fetch resolved signals (both wins and losses to show honest results)
        const res = await fetch(`/api/signals/history?limit=${limit * 2}`);
        if (!res.ok) return;
        const data = await res.json();
        const records: HistoryApiRecord[] = data.records ?? [];

        // Get resolved signals first, then pending ones as backfill
        const resolved = records.filter(
          (r: HistoryApiRecord) => r.outcomes['24h'] !== null || r.outcomes['4h'] !== null,
        );
        const pending = records.filter(
          (r: HistoryApiRecord) => r.outcomes['24h'] === null && r.outcomes['4h'] === null,
        );

        // Prioritize resolved, fill remaining with pending
        const selected = [...resolved, ...pending].slice(0, limit);
        setOutcomes(selected.map(toOutcomeData));
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchOutcomes();
  }, [limit]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -340 : 340;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Empty state
  if (!loading && outcomes.length === 0) {
    return (
      <section className="py-8">
        <h2 className="text-sm font-semibold text-white mb-4 px-1">{title}</h2>
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-sm text-zinc-500">
            Signal outcomes will appear here once signals are verified against real market data.
          </p>
          <p className="text-xs text-zinc-700 mt-2 font-mono">
            Signals are checked every 4 hours.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 animate-pulse min-w-[360px] h-[220px] shrink-0"
            >
              <div className="h-3 bg-white/5 rounded w-1/3 mb-4" />
              <div className="h-2 bg-white/5 rounded w-2/3 mb-3" />
              <div className="h-8 bg-white/5 rounded w-1/2 mb-3" />
              <div className="h-1.5 bg-white/5 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
        >
          {outcomes.map((outcome) => (
            <div key={outcome.id} className="shrink-0">
              <SignalOutcomeCard signal={outcome} compact={compact} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

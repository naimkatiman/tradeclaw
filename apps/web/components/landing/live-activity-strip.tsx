'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithLicense } from '@/lib/license-client';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StripSignal {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: number;
}

function normalize(raw: Record<string, unknown>): StripSignal {
  const pair = (raw.symbol as string) ?? (raw.pair as string) ?? 'BTCUSD';
  const direction = ((raw.direction as string) ?? 'HOLD').toUpperCase() as StripSignal['direction'];
  const confidence = typeof raw.confidence === 'number' ? Math.round(raw.confidence) : 75;
  const timestamp =
    typeof raw.timestamp === 'number'
      ? raw.timestamp
      : typeof raw.timestamp === 'string'
        ? new Date(raw.timestamp).getTime()
        : Date.now();
  return { id: `${pair}-${timestamp}`, pair, direction, confidence, timestamp };
}

export function LiveActivityStrip() {
  const [signals, setSignals] = useState<StripSignal[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchWithLicense('/api/signals');
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const raw: Record<string, unknown>[] = json.signals ?? [];
        const normalized = raw.map(normalize);
        normalized.sort((a, b) => b.timestamp - a.timestamp);
        if (!cancelled) setSignals(normalized.slice(0, 3));
      } catch {
        /* noop */
      }
    };
    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (signals.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-3">
      <div className="glass rounded-2xl border border-[var(--border)] p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Activity className="w-3 h-3" />
          Live
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {signals.map((sig) => {
            const Icon = sig.direction === 'BUY' ? TrendingUp : sig.direction === 'SELL' ? TrendingDown : Minus;
            const color =
              sig.direction === 'BUY'
                ? 'text-emerald-400'
                : sig.direction === 'SELL'
                  ? 'text-rose-400'
                  : 'text-zinc-400';
            return (
              <span key={sig.id} className="inline-flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[var(--foreground)]">{sig.pair}</span>
                <span className={`flex items-center gap-0.5 font-bold ${color}`}>
                  <Icon className="w-3 h-3" />
                  {sig.direction}
                </span>
                <span className="text-[var(--text-secondary)]">{sig.confidence}%</span>
              </span>
            );
          })}
        </div>

        <Link
          href="/live"
          className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          View all →
        </Link>
      </div>
    </div>
  );
}

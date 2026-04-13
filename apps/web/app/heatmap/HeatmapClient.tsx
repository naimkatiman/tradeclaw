'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithLicense } from '@/lib/license-client';

// ─── Types ────────────────────────────────────────────────────

interface HeatmapEntry {
  pair: string;
  name: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  rsi: number;
  macd: number;
}

interface HeatmapData {
  entries: HeatmapEntry[];
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatPrice(pair: string, price: number): string {
  if (pair === 'BTCUSD' || pair === 'ETHUSD')
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (pair === 'XAUUSD') return price.toFixed(2);
  if (pair === 'XAGUSD') return price.toFixed(3);
  if (pair === 'USDJPY' || pair === 'GBPJPY') return price.toFixed(2);
  return price.toFixed(4);
}

// ─── Sub-components ──────────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const styles = {
    BUY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SELL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    NEUTRAL: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[direction]}`}>
      {direction}
    </span>
  );
}

function ConfidenceBar({ confidence, direction }: { confidence: number; direction: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const colors = {
    BUY: 'bg-emerald-500',
    SELL: 'bg-rose-500',
    NEUTRAL: 'bg-zinc-500',
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Confidence</span>
        <span className="text-xs font-semibold text-zinc-300">{confidence}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[direction]}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}

function AssetCard({ entry }: { entry: HeatmapEntry }) {
  const bgColor = {
    BUY: 'bg-emerald-950/40',
    SELL: 'bg-rose-950/40',
    NEUTRAL: 'bg-zinc-900/60',
  };

  const borderColor = {
    BUY: 'border-emerald-500/20 hover:border-emerald-500/40',
    SELL: 'border-rose-500/20 hover:border-rose-500/40',
    NEUTRAL: 'border-zinc-700/30 hover:border-zinc-600/40',
  };

  const glowColor = {
    BUY: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]',
    SELL: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.08)]',
    NEUTRAL: '',
  };

  const signalUrl = entry.direction === 'NEUTRAL'
    ? `/signal/${entry.pair}-H1-BUY`
    : `/signal/${entry.pair}-H1-${entry.direction}`;

  return (
    <Link
      href={signalUrl}
      className={`block rounded-xl border p-4 transition-all duration-300 ${bgColor[entry.direction]} ${borderColor[entry.direction]} ${glowColor[entry.direction]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{entry.pair}</h3>
          <p className="text-xs text-zinc-500">{entry.name}</p>
        </div>
        <DirectionBadge direction={entry.direction} />
      </div>

      <div className="text-xl font-mono font-semibold text-zinc-200 mb-3">
        {formatPrice(entry.pair, entry.price)}
      </div>

      <ConfidenceBar confidence={entry.confidence} direction={entry.direction} />

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">RSI</span>
          <p className={`text-sm font-mono font-medium ${
            entry.rsi > 70 ? 'text-rose-400' : entry.rsi < 30 ? 'text-emerald-400' : 'text-zinc-300'
          }`}>
            {entry.rsi.toFixed(1)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">MACD</span>
          <p className={`text-sm font-mono font-medium ${
            entry.macd > 0 ? 'text-emerald-400' : entry.macd < 0 ? 'text-rose-400' : 'text-zinc-300'
          }`}>
            {entry.macd > 0 ? '+' : ''}{entry.macd.toFixed(4)}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function HeatmapClient() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchWithLicense('/api/heatmap');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HeatmapData = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const buyCount = data?.entries.filter(e => e.direction === 'BUY').length ?? 0;
  const sellCount = data?.entries.filter(e => e.direction === 'SELL').length ?? 0;
  const neutralCount = data?.entries.filter(e => e.direction === 'NEUTRAL').length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20 md:pb-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Signal <span className="text-emerald-400">Heatmap</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Real-time BUY/SELL signals across 10 major pairs &middot; H1 timeframe
              </p>
            </div>
          </div>
          {data && (
            <p className="text-xs text-zinc-600 font-mono">
              Last updated: {new Date(data.updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-emerald-400">{buyCount} BUY</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-rose-400">{sellCount} SELL</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-sm font-semibold text-zinc-400">{neutralCount} NEUTRAL</span>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Auto-refresh 30s</span>
          </div>
        </div>

        {/* Card Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 animate-pulse h-52" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {data.entries.map(entry => (
              <AssetCard key={entry.pair} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500">Failed to load heatmap data</div>
        )}
      </div>
    </div>
  );
}

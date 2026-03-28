'use client';

import { useEffect, useRef, useState } from 'react';
import type { PriceTick, PricesMap } from '../lib/hooks/use-price-stream';

const SYMBOL_LABELS: Record<string, string> = {
  BTCUSD: 'BTC/USD',
  XAUUSD: 'XAU/USD',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  ETHUSD: 'ETH/USD',
  XAGUSD: 'XAG/USD',
};

function formatTickerPrice(pair: string, price: number): string {
  if (pair === 'USDJPY') return price.toFixed(3);
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1000) return price.toFixed(2);
  if (price >= 10) return price.toFixed(3);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(5);
}

interface TickerItemProps {
  pair: string;
  tick: PriceTick;
}

function TickerItem({ pair, tick }: TickerItemProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef<number>(tick.price);

  useEffect(() => {
    const prev = prevRef.current;
    if (Math.abs(tick.price - prev) < 0.000001) return;
    prevRef.current = tick.price;
    const dir = tick.price > prev ? 'up' : 'down';
    const t0 = setTimeout(() => setFlash(dir), 0);
    const t = setTimeout(() => setFlash(null), 600);
    return () => { clearTimeout(t0); clearTimeout(t); };
  }, [tick.price]);

  const priceColor =
    flash === 'up' ? 'text-emerald-500' :
    flash === 'down' ? 'text-rose-500' :
    'text-[var(--foreground)]';

  const changeColor = tick.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500';

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono shrink-0 select-none">
      <span className="text-[var(--text-secondary)]">{SYMBOL_LABELS[pair] ?? pair}</span>
      <span className={`font-semibold tabular-nums transition-colors duration-300 ${priceColor}`}>
        {formatTickerPrice(pair, tick.price)}
      </span>
      <span className={`text-[10px] tabular-nums ${changeColor}`}>
        {tick.change24h >= 0 ? '+' : ''}{tick.change24h.toFixed(2)}%
      </span>
    </span>
  );
}

interface LiveTickerProps {
  prices: PricesMap;
  pairs: string[];
}

export function LiveTicker({ prices, pairs }: LiveTickerProps) {
  const activePairs = pairs.filter(p => prices.has(p));

  if (activePairs.length === 0) {
    return (
      <div className="bg-[var(--background)] border-b border-[var(--border)] h-10 flex items-center px-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)] animate-pulse" />
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">Connecting to market data…</span>
        </div>
      </div>
    );
  }

  // Duplicate items for seamless infinite scroll
  const items = [...activePairs, ...activePairs];

  return (
    <div className="bg-[var(--background)] border-b border-[var(--border)] h-10 overflow-hidden flex items-center">
      {/* LIVE badge */}
      <div className="shrink-0 h-full flex items-center bg-emerald-500/10 border-r border-emerald-500/20 px-3 gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
      </div>

      {/* Scrolling items */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex items-center gap-8 px-4 whitespace-nowrap live-ticker-scroll"
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {items.map((pair, idx) => {
            const tick = prices.get(pair);
            if (!tick) return null;
            return <TickerItem key={`${pair}-${idx}`} pair={pair} tick={tick} />;
          })}
        </div>
      </div>

      <style>{`
        .live-ticker-scroll {
          animation: live-ticker 40s linear infinite;
        }
        @keyframes live-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';

interface PriceData {
  price: number;
  change24h: number;
  source: string;
}

const TICKER_SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD', 'EURUSD', 'GBPUSD', 'XAGUSD', 'USDJPY'];

const SYMBOL_LABELS: Record<string, string> = {
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  BTCUSD: 'BTC/USD',
  ETHUSD: 'ETH/USD',
  XRPUSD: 'XRP/USD',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
};

function formatPrice(symbol: string, price: number): string {
  if (symbol === 'XAUUSD') return price.toFixed(2);
  if (symbol === 'XAGUSD') return price.toFixed(3);
  if (price > 1000) return price.toFixed(2);
  if (price > 10) return price.toFixed(3);
  if (price > 1) return price.toFixed(4);
  return price.toFixed(5);
}

export function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const prevRef = useRef<Record<string, number>>({});

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      setPrevPrices({ ...prevRef.current });
      prevRef.current = Object.fromEntries(
        Object.entries(data.prices as Record<string, PriceData>).map(([k, v]) => [k, v.price])
      );
      setPrices(data.prices);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  const tickerItems = TICKER_SYMBOLS.filter(s => prices[s]);

  if (tickerItems.length === 0) {
    return (
      <div className="bg-gray-950 border-b border-gray-800 py-2 px-4 text-xs text-gray-600 font-mono">
        Loading market data...
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border-b border-gray-800 overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 bg-emerald-500/10 border-r border-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          LIVE
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-scroll flex gap-8 px-4 py-2 whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((symbol, idx) => {
              const data = prices[symbol];
              const prev = prevPrices[symbol];
              const isUp = prev ? data.price >= prev : data.change24h >= 0;
              const priceChanged = prev && Math.abs(data.price - prev) > 0.000001;
              
              return (
                <span key={`${symbol}-${idx}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-gray-500">{SYMBOL_LABELS[symbol]}</span>
                  <span
                    className={`font-semibold transition-colors duration-300 ${
                      priceChanged
                        ? isUp ? 'text-emerald-400' : 'text-red-400'
                        : 'text-white'
                    }`}
                  >
                    {formatPrice(symbol, data.price)}
                  </span>
                  <span className={`text-[10px] ${data.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {data.change24h >= 0 ? '+' : ''}{data.change24h}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <style jsx>{`
        .ticker-scroll {
          animation: ticker 30s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

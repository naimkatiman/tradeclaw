import { NextResponse } from 'next/server';

// Free price APIs - no key needed
const CRYPTO_SYMBOLS = ['bitcoin', 'ethereum', 'ripple', 'solana', 'cardano'];
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTCUSD',
  ethereum: 'ETHUSD',
  ripple: 'XRPUSD',
  solana: 'SOLUSD',
  cardano: 'ADAUSD',
};

// Fallback prices when APIs are unavailable — updated Mar 2026
const FALLBACK_PRICES: Record<string, number> = {
  BTCUSD: 70798,
  ETHUSD: 2147.53,
  XRPUSD: 1.40,
  XAUUSD: 4505,
  XAGUSD: 71.36,
  EURUSD: 1.1559,
  GBPUSD: 1.3352,
  USDJPY: 159.53,
};

function addNoise(price: number, pct = 0.002): number {
  return +(price * (1 + (Math.random() - 0.5) * pct)).toFixed(price > 100 ? 2 : 5);
}

export async function GET() {
  try {
    // Fetch crypto prices from CoinGecko (free, no key)
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_SYMBOLS.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );

    const prices: Record<string, { price: number; change24h: number; source: string }> = {};

    if (cgRes.ok) {
      const cgData = await cgRes.json();
      for (const [id, data] of Object.entries(cgData)) {
        const symbol = SYMBOL_MAP[id];
        if (symbol) {
          prices[symbol] = {
            price: (data as { usd: number; usd_24h_change: number }).usd,
            change24h: +((data as { usd: number; usd_24h_change: number }).usd_24h_change?.toFixed(2) || 0),
            source: 'coingecko',
          };
        }
      }
    }

    // Fetch metals + forex from stooq (free, reliable CSV endpoint)
    const stooqSymbols: Record<string, string> = {
      XAUUSD: 'xauusd', XAGUSD: 'xagusd',
      EURUSD: 'eurusd', GBPUSD: 'gbpusd', USDJPY: 'usdjpy',
      AUDUSD: 'audusd', USDCAD: 'usdcad', NZDUSD: 'nzdusd', USDCHF: 'usdchf',
    };

    await Promise.allSettled(
      Object.entries(stooqSymbols).map(async ([symbol, stooqSym]) => {
        if (prices[symbol]) return; // already have it from crypto APIs
        try {
          const res = await fetch(`https://stooq.com/q/l/?s=${stooqSym}&f=c&h&e=csv`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return;
          const text = await res.text();
          const lines = text.trim().split('\n');
          if (lines.length < 2) return;
          const val = parseFloat(lines[1].trim());
          if (!isNaN(val) && val > 0) {
            prices[symbol] = { price: val, change24h: 0, source: 'stooq' };
          }
        } catch { /* fall through to fallback */ }
      })
    );

    // Fallback for anything still missing
    const fallbackBase: Record<string, number> = {
      XAUUSD: 4505, XAGUSD: 71.36, EURUSD: 1.1559, GBPUSD: 1.3352,
      USDJPY: 159.53, AUDUSD: 0.6939, USDCAD: 1.3826, NZDUSD: 0.5799, USDCHF: 0.7922,
    };
    for (const [symbol, base] of Object.entries(fallbackBase)) {
      if (!prices[symbol]) {
        prices[symbol] = { price: addNoise(base), change24h: 0, source: 'fallback' };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: Object.keys(prices).length,
      prices,
    });
  } catch {
    // Return fallback prices if everything fails
    const fallback: Record<string, { price: number; change24h: number; source: string }> = {};
    for (const [sym, price] of Object.entries(FALLBACK_PRICES)) {
      fallback[sym] = { price: addNoise(price), change24h: 0, source: 'fallback' };
    }
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: Object.keys(fallback).length,
      prices: fallback,
    });
  }
}

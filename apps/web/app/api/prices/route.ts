import { NextResponse } from 'next/server';
import { fetchCoinCapPrices, fetchKrakenPrices, fetchFrankfurterRates, fetchFreeGoldPrice, fetchFreeSilverPrice } from '../../lib/data-providers';

// Free price APIs - no key needed
const CRYPTO_SYMBOLS = ['bitcoin', 'ethereum', 'ripple', 'solana', 'cardano'];
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTCUSD',
  ethereum: 'ETHUSD',
  ripple: 'XRPUSD',
  solana: 'SOLUSD',
  cardano: 'ADAUSD',
};

// Fallback prices when ALL APIs are unavailable — snapshot date below
const FALLBACK_DATE = '2026-03-15';
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

// No noise injection — fallback prices are exact last-known values, clearly marked as stale

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

    // Fallback chain: CoinCap → Kraken (crypto), Frankfurter (forex), Free Gold API (metals)
    const missingCrypto = ['BTCUSD', 'ETHUSD', 'XRPUSD', 'SOLUSD', 'ADAUSD'].filter(s => !prices[s]);
    const missingForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'].filter(s => !prices[s]);
    const missingMetals = ['XAUUSD', 'XAGUSD'].filter(s => !prices[s]);

    if (missingCrypto.length > 0 || missingForex.length > 0 || missingMetals.length > 0) {
      const [coinCap, kraken, frankfurter, goldPrice, silverPrice] = await Promise.allSettled([
        missingCrypto.length > 0 ? fetchCoinCapPrices() : Promise.resolve([]),
        missingCrypto.length > 0 ? fetchKrakenPrices() : Promise.resolve([]),
        missingForex.length > 0 ? fetchFrankfurterRates() : Promise.resolve([]),
        missingMetals.includes('XAUUSD') ? fetchFreeGoldPrice() : Promise.resolve(null),
        missingMetals.includes('XAGUSD') ? fetchFreeSilverPrice() : Promise.resolve(null),
      ]);

      if (coinCap.status === 'fulfilled') {
        for (const q of coinCap.value) {
          if (!prices[q.symbol]) {
            prices[q.symbol] = { price: q.price, change24h: q.change24h ?? 0, source: 'coincap' };
          }
        }
      }
      if (kraken.status === 'fulfilled') {
        for (const q of kraken.value) {
          if (!prices[q.symbol]) {
            prices[q.symbol] = { price: q.price, change24h: q.change24h ?? 0, source: 'kraken' };
          }
        }
      }
      if (frankfurter.status === 'fulfilled') {
        for (const r of frankfurter.value) {
          if (!prices[r.pair]) {
            prices[r.pair] = { price: r.rate, change24h: 0, source: 'frankfurter' };
          }
        }
      }
      if (goldPrice.status === 'fulfilled' && goldPrice.value && !prices['XAUUSD']) {
        prices['XAUUSD'] = { price: goldPrice.value.price, change24h: 0, source: 'freegoldapi' };
      }
      if (silverPrice.status === 'fulfilled' && silverPrice.value && !prices['XAGUSD']) {
        prices['XAGUSD'] = { price: silverPrice.value.price, change24h: 0, source: 'freegoldapi' };
      }
    }

    // Static fallback for anything still missing
    const fallbackBase: Record<string, number> = {
      XAUUSD: 4505, XAGUSD: 71.36, EURUSD: 1.1559, GBPUSD: 1.3352,
      USDJPY: 159.53, AUDUSD: 0.6939, USDCAD: 1.3826, NZDUSD: 0.5799, USDCHF: 0.7922,
    };
    for (const [symbol, base] of Object.entries(fallbackBase)) {
      if (!prices[symbol]) {
        prices[symbol] = { price: base, change24h: 0, source: 'fallback' };
      }
    }

    const hasFallback = Object.values(prices).some((p) => p.source === 'fallback');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: Object.keys(prices).length,
      prices,
      ...(hasFallback && { stale: true, fallbackDate: FALLBACK_DATE }),
    });
  } catch {
    // Return fallback prices if everything fails
    const fallback: Record<string, { price: number; change24h: number; source: string }> = {};
    for (const [sym, price] of Object.entries(FALLBACK_PRICES)) {
      fallback[sym] = { price, change24h: 0, source: 'fallback' };
    }
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: Object.keys(fallback).length,
      prices: fallback,
      stale: true,
      fallbackDate: FALLBACK_DATE,
    });
  }
}

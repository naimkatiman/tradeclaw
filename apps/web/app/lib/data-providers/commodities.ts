/**
 * Commodity Data Providers — Free Gold API, GoldPricez
 * No API key required
 */

import { type GoldHistorical, type PriceQuote, safeFetch } from './types';

// ─── Free Gold API ─────────────────────────────────────────────────────────
// https://freegoldapi.com/ — 768 years of gold price history, free

interface FreeGoldResponse {
  price: number;
  currency: string;
  timestamp: string;
}

export async function fetchFreeGoldPrice(): Promise<PriceQuote | null> {
  const data = await safeFetch<FreeGoldResponse>(
    'https://freegoldapi.com/api/XAU/USD',
  );
  if (!data?.price) return null;

  return {
    symbol: 'XAUUSD',
    price: data.price,
    timestamp: Date.now(),
    source: 'freegoldapi',
  };
}

export async function fetchFreeGoldHistory(
  startYear: number = 2000,
  endYear: number = new Date().getFullYear(),
): Promise<GoldHistorical[]> {
  const data = await safeFetch<
    Array<{ date: string; price: number }>
  >(
    `https://freegoldapi.com/api/XAU/USD/history?start=${startYear}&end=${endYear}`,
    { timeoutMs: 15000 },
  );
  if (!data) return [];

  return data.map((d) => ({
    date: d.date,
    price: d.price,
    currency: 'USD',
  }));
}

// ─── Silver price from free sources ────────────────────────────────────────

export async function fetchFreeSilverPrice(): Promise<PriceQuote | null> {
  const data = await safeFetch<FreeGoldResponse>(
    'https://freegoldapi.com/api/XAG/USD',
  );
  if (!data?.price) return null;

  return {
    symbol: 'XAGUSD',
    price: data.price,
    timestamp: Date.now(),
    source: 'freegoldapi',
  };
}

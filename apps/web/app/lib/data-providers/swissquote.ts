/**
 * Swissquote Data Provider — real-time forex & metals via public data feed
 * No API key required. Swissquote is a regulated Swiss bank (SIX:SQN).
 * https://forex-data-feed.swissquote.com/
 */

import { type PriceQuote, safeFetch } from './types';

// ─── Symbol mapping: our symbols → Swissquote instrument paths ────────────

const SWISSQUOTE_INSTRUMENTS: Record<string, string> = {
  // Metals
  XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD',
  // Forex majors
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
  USDCHF: 'USD/CHF',
  // Forex crosses
  EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY',
};

interface SwissquoteSpread {
  spreadProfilePrices: Array<{
    bid: string;
    ask: string;
    ts: string;
  }>;
  tpiId: number;
}

/**
 * Fetch a single instrument's live bid/ask from Swissquote.
 * Returns mid price (average of bid + ask).
 */
export async function fetchSwissquotePrice(symbol: string): Promise<PriceQuote | null> {
  const instrument = SWISSQUOTE_INSTRUMENTS[symbol];
  if (!instrument) return null;

  const data = await safeFetch<SwissquoteSpread[]>(
    `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${instrument}`,
    { timeoutMs: 6000 },
  );
  if (!data?.length) return null;

  const spread = data[0]?.spreadProfilePrices?.[0];
  if (!spread) return null;

  const bid = parseFloat(spread.bid);
  const ask = parseFloat(spread.ask);
  if (isNaN(bid) || isNaN(ask) || bid <= 0) return null;

  const mid = (bid + ask) / 2;

  return {
    symbol,
    price: +mid.toFixed(5),
    timestamp: parseInt(spread.ts, 10) || Date.now(),
    source: 'swissquote',
  };
}

/**
 * Fetch live prices for all supported forex/metals instruments.
 */
export async function fetchSwissquotePrices(
  symbols?: string[],
): Promise<PriceQuote[]> {
  const requested = symbols ?? Object.keys(SWISSQUOTE_INSTRUMENTS);
  const results = await Promise.allSettled(
    requested
      .filter((s) => s in SWISSQUOTE_INSTRUMENTS)
      .map((s) => fetchSwissquotePrice(s)),
  );

  const quotes: PriceQuote[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) quotes.push(r.value);
  }
  return quotes;
}

/** Check whether a symbol is supported by this provider */
export function isSwissquoteSymbol(symbol: string): boolean {
  return symbol in SWISSQUOTE_INSTRUMENTS;
}

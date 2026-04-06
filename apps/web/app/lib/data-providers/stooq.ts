/**
 * Stooq Data Provider — free historical OHLCV candles via CSV download
 * No API key required. Supports forex, metals, indices.
 * https://stooq.com/
 */

import { type OHLCV, safeFetchText } from './types';

// Symbol mapping: our symbols → Stooq ticker
const STOOQ_SYMBOLS: Record<string, string> = {
  // Metals
  XAUUSD: 'xauusd',
  XAGUSD: 'xagusd',
  // Forex majors
  EURUSD: 'eurusd',
  GBPUSD: 'gbpusd',
  USDJPY: 'usdjpy',
  AUDUSD: 'audusd',
  USDCAD: 'usdcad',
  NZDUSD: 'nzdusd',
  USDCHF: 'usdchf',
};

// Stooq interval codes
const STOOQ_INTERVALS: Record<string, string> = {
  M15: '15',
  H1: '60',
  D1: 'd',
};

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Fetch OHLCV candles from Stooq's free CSV endpoint.
 * Returns candles sorted by timestamp ascending.
 */
export async function fetchStooqOHLCV(
  symbol: string,
  timeframe: string = 'H1',
  lookbackDays: number = 30,
): Promise<OHLCV[]> {
  const stooqSym = STOOQ_SYMBOLS[symbol];
  const interval = STOOQ_INTERVALS[timeframe];
  if (!stooqSym || !interval) return [];

  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 86400 * 1000);

  const url = `https://stooq.com/q/d/l/?s=${stooqSym}&d1=${formatDate(start)}&d2=${formatDate(end)}&i=${interval}`;

  const csv = await safeFetchText(url, 10000);
  if (!csv) return [];

  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Header: Date,Time,Open,High,Low,Close,Volume (hourly/intraday)
  // Or:     Date,Open,High,Low,Close,Volume (daily)
  const header = lines[0].toLowerCase();
  const hasTime = header.includes('time');

  const candles: OHLCV[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < (hasTime ? 7 : 6)) continue;

    let dateStr: string;
    let offset: number;

    if (hasTime) {
      dateStr = `${cols[0]}T${cols[1]}Z`;
      offset = 2;
    } else {
      dateStr = `${cols[0]}T00:00:00Z`;
      offset = 1;
    }

    const ts = Date.parse(dateStr);
    if (isNaN(ts)) continue;

    const o = parseFloat(cols[offset]);
    const h = parseFloat(cols[offset + 1]);
    const l = parseFloat(cols[offset + 2]);
    const c = parseFloat(cols[offset + 3]);
    const v = parseFloat(cols[offset + 4]) || 0;

    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
    if (o <= 0 || h <= 0 || l <= 0 || c <= 0) continue;

    candles.push({ timestamp: ts, open: o, high: h, low: l, close: c, volume: v });
  }

  // Sort ascending by timestamp
  candles.sort((a, b) => a.timestamp - b.timestamp);
  return candles;
}

/** Check whether a symbol is supported by Stooq */
export function isStooqSymbol(symbol: string): boolean {
  return symbol in STOOQ_SYMBOLS;
}

/**
 * Reads signals from the Python-generated signals-live.json file
 * Falls back to the real-time TA engine if the file is stale or missing
 */

import 'server-only';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface LiveSignal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  reasons: string[];
  indicators: {
    rsi: number;
    macd_histogram: number;
    ema_trend: 'up' | 'down';
    stochastic_k: number;
    volume_ratio: number;
  };
  source: string;
  timestamp: string;
  expires_in_minutes: number;
}

export interface LiveSignalsData {
  generated_at: string;
  min_confidence: number;
  count: number;
  stats: {
    symbols_checked: number;
    signals_generated: number;
    signals_below_threshold: number;
    data_fetch_errors: number;
  };
  signals: LiveSignal[];
}

// Stale threshold: 20 minutes
const STALE_THRESHOLD_MS = 20 * 60 * 1000;

/**
 * Get the path to signals-live.json
 * Works both in development and production
 */
function getSignalsFilePath(): string {
  // In production, the file should be in the data directory at project root
  // In development, it's at tradeclaw/data/signals-live.json
  const possiblePaths = [
    join(process.cwd(), 'data', 'signals-live.json'),
    join(process.cwd(), '..', '..', 'data', 'signals-live.json'),
    '/home/naim/.openclaw/workspace/tradeclaw/data/signals-live.json',
  ];

  // Return the first path (we'll handle missing file in the read)
  return possiblePaths[0];
}

/**
 * Read and validate signals from the live file
 * Returns null if file is missing, stale, or invalid
 */
export async function readLiveSignals(): Promise<{
  signals: LiveSignal[];
  isStale: boolean;
  generatedAt: string | null;
} | null> {
  const filePath = getSignalsFilePath();

  try {
    const content = await readFile(filePath, 'utf-8');
    const data: LiveSignalsData = JSON.parse(content);

    if (!data.signals || !Array.isArray(data.signals)) {
      return null;
    }

    // Check if data is stale
    const generatedAt = new Date(data.generated_at);
    const age = Date.now() - generatedAt.getTime();
    const isStale = age > STALE_THRESHOLD_MS;

    return {
      signals: data.signals,
      isStale,
      generatedAt: data.generated_at,
    };
  } catch {
    // File doesn't exist or is invalid
    return null;
  }
}

/**
 * Map Python signal format to the API v1 response format
 */
export function mapLiveSignalToV1(s: LiveSignal): {
  id: string;
  pair: string;
  direction: string;
  confidence: number;
  timeframe: string;
  price: number;
  tp: number;
  sl: number;
  rsi: number;
  macd: number;
  generatedAt: string;
  shareUrl: string;
} {
  return {
    id: s.id,
    pair: s.symbol,
    direction: s.signal,
    confidence: s.confidence,
    timeframe: s.timeframe,
    price: s.entry,
    tp: s.tp1,
    sl: s.sl,
    rsi: s.indicators.rsi,
    macd: s.indicators.macd_histogram,
    generatedAt: s.timestamp,
    shareUrl: `https://tradeclaw.win/signal/${s.symbol}-${s.timeframe}-${s.signal}`,
  };
}

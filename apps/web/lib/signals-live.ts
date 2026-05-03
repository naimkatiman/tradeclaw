/**
 * Reads live signals from the data/signals-live.json file written by the
 * local Python scanner-engine. Production tier reads come from
 * lib/tracked-signals.ts (TA engine + signal_history) — this module is
 * the local-dev / file-backed fallback.
 *
 * Single stale threshold: 15 minutes.
 */

import 'server-only';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface WinRateData {
  wins: number;
  losses: number;
  total: number;
  win_rate: number;
}

export interface CrossValidation {
  validated: boolean;
  binance_price?: number;
  tv_price?: number;
  divergence_pct?: number;
  price_confirmed?: boolean;
}

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
  candle_status?: string;
  indicators: {
    rsi: number;
    rsi_m5?: number;
    rsi_h1?: number;
    rsi_h4?: number;
    macd_histogram?: number;
    macd_h1?: number;
    ema_trend: 'up' | 'down';
    stochastic_k?: number;
    stoch_k?: number;
    volume_ratio?: number;
  };
  tp3?: number;
  agreeing_timeframes?: string[];
  confluence_score?: number;
  win_rate?: WinRateData | null;
  cross_validation?: CrossValidation | null;
  source: string;
  timestamp: string;
  expires_in_minutes: number;
}

export interface ReliabilityData {
  candle_statuses: Record<string, string>;
  binance_prices_available: number;
  win_rates: Record<string, WinRateData>;
  incomplete_candle_penalty: number;
  cross_validation_bonus: number;
}

interface LiveSignalsData {
  generated_at: string;
  engine_version?: string;
  min_confidence: number;
  count: number;
  reliability?: ReliabilityData;
  stats: {
    symbols_checked: number;
    signals_generated?: number;
    confluence_signals?: number;
    individual_signals?: number;
    signals_below_threshold?: number;
    data_fetch_errors?: number;
    data_errors?: number;
    engine?: string;
  };
  signals?: LiveSignal[];
  confluence_signals?: LiveSignal[];
  all_signals?: LiveSignal[];
}

// Stale threshold: 15 minutes (consolidated from old 10min and 20min values)
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Read live signals from the JSON file written by the local Python
 * scanner-engine. Production reads do not flow through here — see
 * lib/tracked-signals.ts.
 */
export async function readLiveSignals(): Promise<{
  signals: LiveSignal[];
  isStale: boolean;
  generatedAt: string | null;
  reliability?: ReliabilityData;
  engineVersion?: string;
} | null> {
  return readLiveSignalsFromFile();
}

/**
 * Fallback: read from signals-live.json file.
 */
async function readLiveSignalsFromFile(): Promise<{
  signals: LiveSignal[];
  isStale: boolean;
  generatedAt: string | null;
  reliability?: ReliabilityData;
  engineVersion?: string;
} | null> {
  const possiblePaths = [
    join(process.cwd(), 'data', 'signals-live.json'),
    join(process.cwd(), '..', '..', 'data', 'signals-live.json'),
    '/home/naim/.openclaw/workspace/tradeclaw/data/signals-live.json',
  ];

  for (const filePath of possiblePaths) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const data: LiveSignalsData = JSON.parse(content);

      const signals = data.signals ?? data.confluence_signals ?? [];
      if (!Array.isArray(signals)) continue;

      const generatedAt = new Date(data.generated_at);
      const age = Date.now() - generatedAt.getTime();
      const isStale = age > STALE_THRESHOLD_MS;

      return {
        signals,
        isStale,
        generatedAt: data.generated_at,
        reliability: data.reliability,
        engineVersion: data.engine_version,
      };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Map Python signal format to the API v1 response format
 */
export function mapLiveSignalToV1(s: LiveSignal) {
  return {
    id: s.id,
    pair: s.symbol,
    direction: s.signal,
    confidence: s.confidence,
    timeframe: s.timeframe,
    price: s.entry,
    tp: s.tp1,
    sl: s.sl,
    rsi: s.indicators?.rsi ?? s.indicators?.rsi_h1 ?? 0,
    macd: s.indicators?.macd_histogram ?? s.indicators?.macd_h1 ?? 0,
    generatedAt: s.timestamp,
    shareUrl: `https://tradeclaw.win/signal/${s.symbol}-${s.timeframe}-${s.signal}`,
    candle_status: s.candle_status ?? null,
    win_rate: s.win_rate ?? null,
    cross_validation: s.cross_validation ?? null,
    reasons: s.reasons ?? [],
  };
}

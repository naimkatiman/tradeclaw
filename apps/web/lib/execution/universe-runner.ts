/**
 * Universe runner — fetches data from Binance Futures, runs the screen,
 * and persists the result to universe_snapshots.
 *
 * Separated from universe.ts so the math is testable without network.
 */

import { execute, query } from '../db-pool';
import { get24hVolume, getExchangeInfo, getKlines } from './binance-futures';
import {
  applyMinFloor,
  DEFAULT_SCREEN_CONFIG,
  logReturns,
  screen,
  type IncludedSymbol,
  type ScreenConfig,
  type ScreenResult,
  type SymbolStat,
} from './universe';

const DEFAULT_CANDIDATE_LIMIT = 30;
const KLINE_FETCH_LIMIT = 31;          // 31 daily closes → 30 returns
const KLINE_INTERVAL = '1d' as const;
const MIN_INCLUDED_FLOOR = 5;

export interface RunUniverseOptions {
  config?: ScreenConfig;
  candidateLimit?: number;
  fallbackSymbols?: string[];
  snapshotDate?: string;               // ISO date (yyyy-mm-dd); defaults to today UTC
  skipPersist?: boolean;               // dry-run: skip universe_snapshots writes
}

export interface RunUniverseResult {
  snapshotDate: string;
  candidates: number;
  included: IncludedSymbol[];
  excluded: ScreenResult['excluded'];
  fallbackApplied: boolean;
  persisted: number;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFallbackSymbols(): string[] {
  const raw = process.env.EXEC_SYMBOLS_FALLBACK ?? 'BTCUSDT,ETHUSDT';
  return raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * Pulls top USDT-margined perps by 24h volume, fetches daily klines,
 * computes ER + log returns, runs screen(), and writes universe_snapshots.
 */
export async function runUniverseScreen(opts: RunUniverseOptions = {}): Promise<RunUniverseResult> {
  const config = opts.config ?? DEFAULT_SCREEN_CONFIG;
  const candidateLimit = opts.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const fallbackSymbols = opts.fallbackSymbols ?? getFallbackSymbols();
  const snapshotDate = opts.snapshotDate ?? todayUtcDate();

  // 1. List USDT-margined perps that are TRADING
  const exchangeInfo = await getExchangeInfo();
  const tradingUsdtPerps = new Set(
    exchangeInfo.symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => s.symbol),
  );

  // 2. Get 24h volume for everything, sort, take top N
  const tickers = await get24hVolume();
  const sorted = tickers
    .filter((t) => tradingUsdtPerps.has(t.symbol))
    .map((t) => ({ symbol: t.symbol, volUsd: Number(t.quoteVolume) }))
    .sort((a, b) => b.volUsd - a.volUsd)
    .slice(0, candidateLimit);

  // 3. Fetch klines for each candidate (sequentially throttled — Binance rate-limits)
  const stats: SymbolStat[] = [];
  for (const c of sorted) {
    try {
      const klines = await getKlines(c.symbol, KLINE_INTERVAL, KLINE_FETCH_LIMIT);
      if (klines.length < KLINE_FETCH_LIMIT - 1) continue;
      const closes = klines.map((k) => k.close);
      stats.push({
        symbol: c.symbol,
        volUsd: c.volUsd,
        closes,
        returns: logReturns(closes),
      });
    } catch (err) {
      console.warn(`[universe] kline fetch failed for ${c.symbol}:`, err instanceof Error ? err.message : err);
    }
  }

  // 4. Apply gates
  const screenResult = screen(stats, config);

  // 5. Min-floor: if too few symbols pass, use fallback list
  const finalIncluded = applyMinFloor(screenResult, MIN_INCLUDED_FLOOR, fallbackSymbols);
  const fallbackApplied = finalIncluded !== screenResult.included;

  // 6. Persist (idempotent on snapshot_date+symbol). Skip in dry-run mode.
  const persisted = opts.skipPersist
    ? 0
    : await persistSnapshot(snapshotDate, finalIncluded, screenResult.excluded, fallbackApplied);

  return {
    snapshotDate,
    candidates: stats.length,
    included: finalIncluded,
    excluded: screenResult.excluded,
    fallbackApplied,
    persisted,
  };
}

async function persistSnapshot(
  snapshotDate: string,
  included: IncludedSymbol[],
  excluded: ScreenResult['excluded'],
  fallbackApplied: boolean,
): Promise<number> {
  let count = 0;
  try {
    for (const s of included) {
      await execute(
        `INSERT INTO universe_snapshots (snapshot_date, symbol, ef_ratio, vol_24h_usd, included, excluded_reason)
         VALUES ($1, $2, $3, $4, TRUE, $5)
         ON CONFLICT (snapshot_date, symbol) DO UPDATE
           SET ef_ratio = EXCLUDED.ef_ratio,
               vol_24h_usd = EXCLUDED.vol_24h_usd,
               included = TRUE,
               excluded_reason = EXCLUDED.excluded_reason`,
        [snapshotDate, s.symbol, s.er, s.volUsd, fallbackApplied ? 'fallback' : null],
      );
      count++;
    }
    for (const s of excluded) {
      await execute(
        `INSERT INTO universe_snapshots (snapshot_date, symbol, ef_ratio, vol_24h_usd, included, excluded_reason)
         VALUES ($1, $2, $3, $4, FALSE, $5)
         ON CONFLICT (snapshot_date, symbol) DO UPDATE
           SET ef_ratio = EXCLUDED.ef_ratio,
               vol_24h_usd = EXCLUDED.vol_24h_usd,
               included = FALSE,
               excluded_reason = EXCLUDED.excluded_reason`,
        [snapshotDate, s.symbol, s.er, s.volUsd, s.reason],
      );
      count++;
    }
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[universe] migration 018 not applied — snapshot not persisted. Deploy with `npm start` to auto-run migrations.');
      return 0;
    }
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      console.warn('[universe] DB unreachable — snapshot not persisted (', code, ')');
      return 0;
    }
    throw err;
  }
  return count;
}

/**
 * Read today's included symbols. Used by the executor as the entry filter.
 * Falls back to env list when the table is empty or missing.
 */
export async function getTodayUniverse(): Promise<string[]> {
  try {
    const rows = await query<{ symbol: string }>(
      `SELECT symbol FROM universe_snapshots
       WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM universe_snapshots)
         AND included = TRUE`,
    );
    if (rows.length > 0) return rows.map((r) => r.symbol);
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') throw err;
  }
  return getFallbackSymbols();
}

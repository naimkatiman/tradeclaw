/**
 * Regime/candle freshness health check — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * Queries market_regimes and candles DIRECTLY — explicitly NOT through
 * fetchRegimeMap, whose error-swallowing (empty map on any DB failure) is
 * how the dead regime layer stayed invisible for months. Pure read; errors
 * propagate to the caller, which decides how to surface them.
 */

import { query, queryOne } from './db-pool';
import { REGIME_CANDLE_UNIVERSE } from './candle-store';

/** Latest regime row older than this (or no rows at all) = stale; the writer runs hourly. */
const STALE_REGIME_MS = 2 * 3_600_000;

/**
 * Universe symbols whose newest stored H1 bar opened more than this long ago
 * are flagged. `ts` is bar-OPEN time: with an hourly refresh the newest
 * closed bar opened 1-2h ago, so 3h means a fully missed refresh cycle.
 */
const STALE_CANDLE_MS = 3 * 3_600_000;

export interface RegimeHealth {
  regimeRows24h: number;
  latestDetectedAt: string | null;
  distinctSymbols24h: number;
  allOneLabel24h: { allOne: boolean; label: string | null };
  /** Latest row older than 2h, or zero rows. */
  staleRegime: boolean;
  /** Universe symbols whose latest H1 candle is missing or > 3h old. */
  staleCandles: Array<{ symbol: string; latestTs: number | null }>;
}

interface AggRow {
  rows_24h: number | string;
  distinct_symbols: number | string;
  distinct_labels: number | string;
  one_label: string | null;
}

export async function checkRegimeHealth(): Promise<RegimeHealth> {
  const agg = await queryOne<AggRow>(
    `SELECT COUNT(*)::int                 AS rows_24h,
            COUNT(DISTINCT symbol)::int   AS distinct_symbols,
            COUNT(DISTINCT regime)::int   AS distinct_labels,
            MIN(regime)                   AS one_label
       FROM market_regimes
      WHERE detected_at > NOW() - INTERVAL '24 hours'`,
  );

  const latest = await queryOne<{ detected_at: string | Date }>(
    `SELECT detected_at FROM market_regimes ORDER BY detected_at DESC LIMIT 1`,
  );

  const candleRows = await query<{ symbol: string; max_ts: string }>(
    `SELECT symbol, MAX(ts) AS max_ts
       FROM candles
      WHERE timeframe = 'H1' AND symbol = ANY($1::text[])
      GROUP BY symbol`,
    [[...REGIME_CANDLE_UNIVERSE]],
  );

  const rows24h = Number(agg?.rows_24h ?? 0);
  const distinctLabels = Number(agg?.distinct_labels ?? 0);
  const allOne = rows24h > 0 && distinctLabels === 1;

  const latestDetectedAt = latest ? new Date(latest.detected_at).toISOString() : null;
  const staleRegime =
    latestDetectedAt === null ||
    Date.now() - new Date(latestDetectedAt).getTime() > STALE_REGIME_MS;

  const latestTsBySymbol = new Map<string, number>();
  for (const row of candleRows) {
    latestTsBySymbol.set(row.symbol, Number(row.max_ts));
  }
  const staleCandles: Array<{ symbol: string; latestTs: number | null }> = [];
  for (const symbol of REGIME_CANDLE_UNIVERSE) {
    const latestTs = latestTsBySymbol.get(symbol) ?? null;
    if (latestTs === null || Date.now() - latestTs > STALE_CANDLE_MS) {
      staleCandles.push({ symbol, latestTs });
    }
  }

  return {
    regimeRows24h: rows24h,
    latestDetectedAt,
    distinctSymbols24h: Number(agg?.distinct_symbols ?? 0),
    allOneLabel24h: { allOne, label: allOne ? agg?.one_label ?? null : null },
    staleRegime,
    staleCandles,
  };
}

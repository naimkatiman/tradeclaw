/**
 * Regime-Aware Signal Filter
 *
 * Fetches current market regime from the DB and filters signals to the
 * directions allowed by the regime's allocation rules. Under the structural
 * vocabulary (trend/volatile/range) every regime allows both directions, so
 * the direction filter passes everything today — the mechanism is kept
 * intact on purpose: Phase 4's strategy router reuses it for
 * direction-conditional dispatch (plan D2,
 * docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * Falls back to 'range' (the unified unknown-label policy, plan D1) when
 * regime data is unavailable.
 */

import { query } from './db-pool';
import { REGIME_ALLOCATION_RULES } from '@tradeclaw/signals';
import type { MarketRegime } from '@tradeclaw/signals';

interface RegimeRow {
  symbol: string;
  regime: string;
}

/**
 * Fetch the latest regime for each symbol from the DB.
 * Returns a Map<symbol, MarketRegime>.
 * Falls back to empty map on DB errors (all symbols default to range).
 */
export async function fetchRegimeMap(): Promise<Map<string, MarketRegime>> {
  const map = new Map<string, MarketRegime>();

  try {
    const rows = await query<RegimeRow>(
      `SELECT DISTINCT ON (symbol) symbol, regime
       FROM market_regimes
       ORDER BY symbol, detected_at DESC`,
    );

    const validRegimes = new Set<string>(['trend', 'volatile', 'range']);

    for (const row of rows) {
      const regime = row.regime.toLowerCase();
      if (validRegimes.has(regime)) {
        map.set(row.symbol.toUpperCase(), regime as MarketRegime);
      }
    }
  } catch {
    // DB unavailable — return empty map, everything defaults to range
  }

  return map;
}

interface RegimeVolRow {
  symbol: string;
  vol20d: string | null;
}

/**
 * Fetch the latest stored daily-equivalent realized vol (features->>'vol20d',
 * written by regime-writer) for each symbol. Feeds computeAllocation's
 * currentVol so the volatility scaler is live (plan:
 * docs/plans/2026-07-18-wire-vol-scaler.md).
 *
 * Same fail-safe contract as fetchRegimeMap: rows without a finite positive
 * vol are skipped, any DB error yields an empty map (allocator runs
 * unscaled), never throws.
 */
export async function fetchRegimeVolMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  try {
    const rows = await query<RegimeVolRow>(
      `SELECT DISTINCT ON (symbol) symbol, features->>'vol20d' AS vol20d
       FROM market_regimes
       ORDER BY symbol, detected_at DESC`,
    );

    for (const row of rows) {
      const vol = row.vol20d === null ? NaN : Number(row.vol20d);
      if (Number.isFinite(vol) && vol > 0) {
        map.set(row.symbol.toUpperCase(), vol);
      }
    }
  } catch {
    // DB unavailable — empty map, position sizing runs unscaled
  }

  return map;
}

/**
 * Get the dominant regime across all symbols.
 * Uses simple majority vote. Falls back to 'range'.
 */
export function getDominantRegime(regimeMap: Map<string, MarketRegime>): MarketRegime {
  if (regimeMap.size === 0) return 'range';

  const counts = new Map<MarketRegime, number>();
  for (const regime of regimeMap.values()) {
    counts.set(regime, (counts.get(regime) ?? 0) + 1);
  }

  let dominant: MarketRegime = 'range';
  let maxCount = 0;
  for (const [regime, count] of counts) {
    if (count > maxCount) {
      dominant = regime;
      maxCount = count;
    }
  }

  return dominant;
}

/**
 * Filter signals by regime-allowed directions.
 *
 * Each signal is checked against its symbol's regime. If the regime's
 * allocation rules restrict directions, disallowed signals are removed.
 * All structural regimes currently allow both directions (see header).
 *
 * Signals for symbols without regime data default to 'range' (both allowed).
 */
export function filterSignalsByRegime<T extends { symbol: string; direction: string }>(
  signals: T[],
  regimeMap: Map<string, MarketRegime>,
): T[] {
  return signals.filter((signal) => {
    const regime = regimeMap.get(signal.symbol.toUpperCase()) ?? 'range';
    const rules = REGIME_ALLOCATION_RULES[regime];
    const allowedDirections = rules?.allowedDirections ?? ['BUY', 'SELL'];
    return allowedDirections.includes(signal.direction as 'BUY' | 'SELL');
  });
}

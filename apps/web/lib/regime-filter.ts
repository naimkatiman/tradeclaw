/**
 * Regime-Aware Signal Filter
 *
 * Fetches current market regime from the DB and filters signals to only
 * include directions allowed by the regime (e.g. BEAR → SELL only).
 * Falls back to 'neutral' (allows both) when regime data is unavailable.
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
 * Falls back to empty map on DB errors (all symbols default to neutral).
 */
export async function fetchRegimeMap(): Promise<Map<string, MarketRegime>> {
  const map = new Map<string, MarketRegime>();

  try {
    const rows = await query<RegimeRow>(
      `SELECT DISTINCT ON (symbol) symbol, regime
       FROM market_regimes
       ORDER BY symbol, detected_at DESC`,
    );

    const validRegimes = new Set<string>(['crash', 'bear', 'neutral', 'bull', 'euphoria']);

    for (const row of rows) {
      const regime = row.regime.toLowerCase();
      if (validRegimes.has(regime)) {
        map.set(row.symbol.toUpperCase(), regime as MarketRegime);
      }
    }
  } catch {
    // DB unavailable — return empty map, everything defaults to neutral
  }

  return map;
}

/**
 * Get the dominant regime across all symbols.
 * Uses simple majority vote. Falls back to 'neutral'.
 */
export function getDominantRegime(regimeMap: Map<string, MarketRegime>): MarketRegime {
  if (regimeMap.size === 0) return 'neutral';

  const counts = new Map<MarketRegime, number>();
  for (const regime of regimeMap.values()) {
    counts.set(regime, (counts.get(regime) ?? 0) + 1);
  }

  let dominant: MarketRegime = 'neutral';
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
 * Each signal is checked against its symbol's regime. If the regime
 * restricts directions (e.g. bear → SELL only), BUY signals are removed.
 *
 * Signals for symbols without regime data default to 'neutral' (both allowed).
 */
export function filterSignalsByRegime<T extends { symbol: string; direction: string }>(
  signals: T[],
  regimeMap: Map<string, MarketRegime>,
): T[] {
  return signals.filter((signal) => {
    const regime = regimeMap.get(signal.symbol.toUpperCase()) ?? 'neutral';
    const rules = REGIME_ALLOCATION_RULES[regime];
    const allowedDirections = rules?.allowedDirections ?? ['BUY', 'SELL'];
    return allowedDirections.includes(signal.direction as 'BUY' | 'SELL');
  });
}

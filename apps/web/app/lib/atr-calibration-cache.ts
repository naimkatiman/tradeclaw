/**
 * In-memory per-symbol ATR calibration cache.
 *
 * Recomputing the calibration grid search on every signal generation is
 * wasteful and, more importantly, requires an async history read from the
 * DB — which we cannot do from the synchronous generateSignalsFromTA path.
 *
 * This cache holds the latest per-symbol multiplier with a 1-hour TTL.
 * Callers SHOULD call `refreshAtrCalibration(symbols)` from a cron or
 * pre-warm path. The synchronous `getCachedAtrMultiplier(symbol)` returns
 * the cached value or the default when cold / expired.
 */

import {
  calibrateAtrMultiplier,
  DEFAULT_ATR_MULTIPLIER,
  type CalibrationResult,
  type OutcomeSample,
} from '@tradeclaw/signals';
import type { SignalHistoryRecord } from '../../lib/signal-history';

interface CachedEntry {
  result: CalibrationResult;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CachedEntry>();

/**
 * Convert a stored SignalHistoryRecord into the OutcomeSample shape expected
 * by the calibration engine.
 *
 * DEFERRED: the current schema does NOT persist `entryAtr` or
 * `adverseExcursion` — we approximate:
 *   - entryAtr is derived from the recorded stop distance by assuming the
 *     signal was emitted with the historical default multiplier (2.0).
 *     So entryAtr ≈ |entry - sl| / DEFAULT_ATR_MULTIPLIER.
 *   - adverseExcursion is unknown; we leave it undefined, which causes
 *     calibrateAtrMultiplier to conservatively assume the original stop
 *     distance for stop-outs and no pullback for wins.
 *
 * Once ATR and max-adverse-excursion are persisted into signal_history, this
 * shim can be replaced with a direct mapping.
 */
function recordToSample(r: SignalHistoryRecord): OutcomeSample | null {
  if (r.sl == null || r.tp1 == null) return null;
  const stopDistance = Math.abs(r.entryPrice - r.sl);
  if (!(stopDistance > 0)) return null;
  const entryAtr = stopDistance / DEFAULT_ATR_MULTIPLIER;

  // Use 24h outcome as the canonical resolution. 4h is too noisy.
  const o = r.outcomes['24h'];
  if (o === null) {
    return {
      direction: r.direction,
      outcome: 'open',
      entry: r.entryPrice,
      stop: r.sl,
      target: r.tp1,
      entryAtr,
      stopDistance,
    };
  }

  let outcome: OutcomeSample['outcome'];
  if (o.hit) {
    outcome = 'win';
  } else {
    // Distinguish stop-out from flat close: if the recorded close price
    // reached or breached the stop, treat as stop; otherwise flat loss.
    const hitStop =
      r.direction === 'BUY'
        ? o.price <= r.sl + 1e-9
        : o.price >= r.sl - 1e-9;
    outcome = hitStop ? 'stop' : 'loss';
  }

  return {
    direction: r.direction,
    outcome,
    entry: r.entryPrice,
    stop: r.sl,
    target: r.tp1,
    entryAtr,
    stopDistance,
  };
}

/**
 * Synchronous read: returns the cached multiplier for the symbol, or the
 * default if cold / expired / low-confidence.
 */
export function getCachedAtrMultiplier(symbol: string): number {
  const entry = cache.get(symbol.toUpperCase());
  if (!entry) return DEFAULT_ATR_MULTIPLIER;
  if (Date.now() > entry.expiresAt) return DEFAULT_ATR_MULTIPLIER;
  if (entry.result.confidence === 'low') return DEFAULT_ATR_MULTIPLIER;
  return entry.result.multiplier;
}

/** Synchronous read of the full cached result (may return undefined). */
export function getCachedAtrCalibration(symbol: string): CalibrationResult | undefined {
  const entry = cache.get(symbol.toUpperCase());
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) return undefined;
  return entry.result;
}

/**
 * Refresh the calibration cache for all symbols represented in the current
 * history. Should be called from a prewarm path (e.g. cron, api/calibration).
 */
export async function refreshAtrCalibration(): Promise<Map<string, CalibrationResult>> {
  // Dynamic import to avoid pulling fs/pg into client bundles
  const { readHistoryAsync } = await import('../../lib/signal-history');
  const history = await readHistoryAsync();
  const bySymbol = new Map<string, OutcomeSample[]>();

  for (const r of history) {
    const sample = recordToSample(r);
    if (!sample) continue;
    const key = r.pair.toUpperCase();
    const bucket = bySymbol.get(key) ?? [];
    bucket.push(sample);
    bySymbol.set(key, bucket);
  }

  const now = Date.now();
  const results = new Map<string, CalibrationResult>();
  for (const [symbol, samples] of bySymbol.entries()) {
    const result = calibrateAtrMultiplier(samples);
    cache.set(symbol, { result, expiresAt: now + TTL_MS });
    results.set(symbol, result);
  }
  return results;
}

/**
 * Invalidate the cached entry for a symbol — called when a new outcome is
 * recorded so the next read will recompute.
 */
export function invalidateAtrCalibration(symbol: string): void {
  cache.delete(symbol.toUpperCase());
}

/** Test helper — clear the entire cache. */
export function _clearAtrCalibrationCache(): void {
  cache.clear();
}

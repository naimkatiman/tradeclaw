/**
 * Phase 4 — D1: Pure regime→strategy router
 *            D2: Trend-route entry filter predicate
 *
 * Both functions are pure (no I/O). They are THE single implementation
 * reused by both the live router and the Phase 4 backtest harness (D5).
 * No parity drift — one copy only.
 */

import type { OHLCV } from '@tradeclaw/core';
import type { MarketRegime } from '@tradeclaw/signals';
import { calculateEMA, calculateADX } from '@tradeclaw/signals';
import type { StrategyId } from './types';

// ---------------------------------------------------------------------------
// D1 — Regime → Strategy router
// ---------------------------------------------------------------------------

/**
 * Select the backtest/entry-module strategy for a given market regime.
 *
 * Mapping (Phase 4 plan D1):
 *   trend    → 'hmm-top3'     (momentum continuation; confluence engine)
 *   volatile → 'vwap-ema-bb'  (mean-reversion both directions)
 *   range    → 'vwap-ema-bb'  (range-fade at band edges; smallest allocation
 *                               weight is already encoded in REGIME_ALLOCATION_RULES
 *                               — the router does NOT touch allocation)
 *   unknown  → 'vwap-ema-bb'  (range route; matches Phase 3 unknown-label policy)
 *
 * Direction is an input for signature stability and future direction-conditional
 * routing. v1 does NOT branch on direction — the router selects a strategy and
 * never imposes or flips direction (Phase 3 D2 contract). When direction-conditional
 * dispatch is added in a later phase, it will be a conditional inside this function,
 * not a separate function.
 */
export function selectStrategyForRegime(
  regime: MarketRegime,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _direction: 'BUY' | 'SELL',
): StrategyId {
  switch (regime) {
    case 'trend':
      return 'hmm-top3';
    case 'volatile':
    case 'range':
      return 'vwap-ema-bb';
    default: {
      // Compile-time exhaustiveness: if a 4th MarketRegime is ever added to the
      // canonical union, this assignment errors at build time — forcing an
      // explicit routing decision rather than a silent fallback.
      const _exhaustive: never = regime;
      void _exhaustive;
      // Runtime fallback preserved for bad cast-in values (a caller forcing an
      // off-union string past the type system) → the range route. Matches the
      // Phase 3 unknown-label → range allocation policy.
      return 'vwap-ema-bb';
    }
  }
}

// ---------------------------------------------------------------------------
// D2 — Trend-route entry filter predicate
// ---------------------------------------------------------------------------

/**
 * Options for passesTrendFilter.
 * All optional — defaults match the pilot plan (2026-05-01-tradeclaw-pilot-binance-futures.md).
 */
export interface TrendFilterOptions {
  /** EMA period for slope measurement (default: 50). */
  emaPeriod?: number;
  /** ADX period (default: 14). */
  adxPeriod?: number;
  /** Minimum ADX value required (default: 20). */
  adxMin?: number;
  /**
   * How many bars back to look for the "prior" EMA value when measuring slope.
   * Default: 3 bars. A small value keeps the slope responsive; a large value
   * risks lagging. Documented default: 3.
   */
  slopeLookback?: number;
}

/**
 * Trend-route entry filter (Phase 4 D2, pilot plan section).
 *
 * Encodes: H1 EMA-50 slope agrees with signal direction AND ADX(14) ≥ 20.
 *
 * Slope definition:
 *   EMA computed on the full trailing window ending at bar N (last bar) is
 *   compared against EMA computed on the window ending at bar N-slopeLookback.
 *   A rising EMA (ema_now > ema_prior) agrees with BUY; a falling EMA agrees
 *   with SELL.
 *   Default slopeLookback = 3 bars (small, responsive, documented).
 *
 * Warmup guard:
 *   Returns false when there are insufficient bars to compute both EMAs and ADX.
 *   Minimum required = emaPeriod + slopeLookback (for slope) and
 *   adxPeriod + 1 (for ADX). No false-positive trend entry on warmup.
 *
 * This is THE single implementation shared by the live shadow path and the
 * Phase 4 regime-conditioned backtest harness (D5). Do not duplicate it.
 *
 * PERFORMANCE (D5 implementer must heed): this call is O(n) in candle count —
 * two full-slice calculateEMA passes plus one full-slice calculateADX over the
 * supplied window. Calling it naively inside a per-bar backtest loop over a
 * ~17k-bar window is O(n²) (~290M ops) and will dominate runtime. Because the
 * "do not duplicate this shared implementation" mandate forbids forking a faster
 * copy, D5 must instead feed this function a bounded trailing slice per bar
 * (e.g. the last emaPeriod + slopeLookback + adxPeriod bars) so each call is
 * O(window) not O(history), OR maintain incremental EMA/ADX state and gate on
 * those values directly. Do NOT pass the full growing history every bar.
 *
 * @param candles  - OHLCV bar array, index 0 = oldest. Must have ≥ emaPeriod + slopeLookback bars.
 * @param direction - Signal direction to check agreement against.
 * @param opts     - Optional overrides; defaults match pilot plan.
 * @returns true only when both conditions hold.
 */
export function passesTrendFilter(
  candles: OHLCV[],
  direction: 'BUY' | 'SELL',
  opts?: TrendFilterOptions,
): boolean {
  const emaPeriod = opts?.emaPeriod ?? 50;
  const adxPeriod = opts?.adxPeriod ?? 14;
  const adxMin = opts?.adxMin ?? 20;
  const slopeLookback = opts?.slopeLookback ?? 3;

  // Warmup guard: we need at least emaPeriod + slopeLookback candles for the
  // slope comparison, and adxPeriod + 1 for ADX.
  const minBars = Math.max(emaPeriod + slopeLookback, adxPeriod + 1);
  if (candles.length < minBars) return false;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  // ── EMA slope ────────────────────────────────────────────────────────────
  // calculateEMA(prices, period) returns the EMA value at the END of the
  // supplied array. To get the "prior" EMA we slice off the last slopeLookback
  // bars so the EMA is computed on the window ending slopeLookback bars ago.
  //
  // APPROXIMATION (read before reusing in D5): this is TWO independent stateless
  // EMA recomputations over different-length slices, NOT a single stateful EMA
  // rewound slopeLookback bars. The seeding window differs slightly between the
  // two calls, so the slope sign is a close approximation, not an exact
  // bar-to-bar EMA delta. It is correct-enough here because the ADX≥20 gate
  // below rejects the choppy regime where the seeding difference could flip the
  // sign; in a trending regime the sign is robust. If a D5 backtest needs the
  // exact stateful slope, maintain a single rolling EMA state and read its value
  // at bar N vs bar N-slopeLookback instead.
  const emaNow = calculateEMA(closes, emaPeriod);
  const emaPrior = calculateEMA(closes.slice(0, closes.length - slopeLookback), emaPeriod);

  const slopeAgreesWithBuy = emaNow > emaPrior;
  const slopeAgreesWithSell = emaNow < emaPrior;

  const slopeOk =
    direction === 'BUY' ? slopeAgreesWithBuy : slopeAgreesWithSell;

  if (!slopeOk) return false;

  // ── ADX ──────────────────────────────────────────────────────────────────
  const { value: adxValue } = calculateADX(highs, lows, closes, adxPeriod);
  return adxValue >= adxMin;
}

/**
 * Entry filters — gate signals before they reach the order placer.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 *
 * Order matters. Cheapest filters first to short-circuit early:
 *   1. Universe       — DB lookup (already cached daily)
 *   2. Concurrency    — checks against live Binance state + our open executions
 *   3. Direction      — H1 EMA-50 slope agrees with signal direction
 *   4. Regime         — ADX(14) on H1 ≥ 20 AND HMM regime ≠ ranging
 */

import { ADX, EMA } from 'trading-signals';
import type { BinanceKline, BinancePosition, OrderSide } from './binance-futures';

export const DIRECTION_EMA_PERIOD = 50;
export const DIRECTION_SLOPE_LOOKBACK = 3;
export const REGIME_ADX_PERIOD = 14;
export const REGIME_ADX_FLOOR = 20;

export type FilterVerdict =
  | { passed: true }
  | { passed: false; reason: FilterRejectionReason; detail?: string };

export type FilterRejectionReason =
  | 'not_in_universe'
  | 'symbol_has_open_position'
  | 'max_positions_reached'
  | 'direction_disagrees'
  | 'insufficient_data_for_direction'
  | 'regime_chop'
  | 'regime_unknown'
  | 'insufficient_data_for_regime';

// ─── Universe filter ─────────────────────────────────────────────────────

export function universeFilter(symbol: string, todayUniverse: ReadonlySet<string>): FilterVerdict {
  if (todayUniverse.has(symbol)) return { passed: true };
  return { passed: false, reason: 'not_in_universe' };
}

// ─── Concurrency filter ─────────────────────────────────────────────────

export interface ConcurrencyState {
  livePositions: ReadonlyArray<BinancePosition>;
  openExecutionCount: number;
  maxPositions: number;
}

export function concurrencyFilter(symbol: string, state: ConcurrencyState): FilterVerdict {
  const hasLivePosition = state.livePositions.some(
    (p) => p.symbol === symbol && Math.abs(p.positionAmt) > 0,
  );
  if (hasLivePosition) {
    return { passed: false, reason: 'symbol_has_open_position', detail: `${symbol} already open on broker` };
  }
  if (state.openExecutionCount >= state.maxPositions) {
    return {
      passed: false,
      reason: 'max_positions_reached',
      detail: `${state.openExecutionCount}/${state.maxPositions}`,
    };
  }
  return { passed: true };
}

// ─── Direction filter ───────────────────────────────────────────────────

/**
 * H1 EMA-50 slope must agree with the signal direction.
 * Long  → EMA rising  (ema[t] > ema[t - lookback])
 * Short → EMA falling (ema[t] < ema[t - lookback])
 */
export function directionFilter(
  klinesH1: BinanceKline[],
  side: OrderSide,
  emaPeriod = DIRECTION_EMA_PERIOD,
  slopeLookback = DIRECTION_SLOPE_LOOKBACK,
): FilterVerdict {
  if (klinesH1.length < emaPeriod + slopeLookback) {
    return { passed: false, reason: 'insufficient_data_for_direction', detail: `${klinesH1.length} candles, need ${emaPeriod + slopeLookback}` };
  }
  const series: number[] = [];
  const ind = new EMA(emaPeriod);
  for (const k of klinesH1) {
    ind.update(k.close, false);
    const r = ind.getResult();
    series.push(r === null || r === undefined ? NaN : Number(r));
  }
  const last = series[series.length - 1];
  const prior = series[series.length - 1 - slopeLookback];
  if (!Number.isFinite(last) || !Number.isFinite(prior)) {
    return { passed: false, reason: 'insufficient_data_for_direction' };
  }
  const slopeUp = last > prior;
  const slopeDown = last < prior;
  if (side === 'BUY' && slopeUp) return { passed: true };
  if (side === 'SELL' && slopeDown) return { passed: true };
  return {
    passed: false,
    reason: 'direction_disagrees',
    detail: `side=${side} ema_last=${last.toFixed(6)} ema_prior=${prior.toFixed(6)}`,
  };
}

// ─── Regime filter ──────────────────────────────────────────────────────

export type HmmRegime = 'trending' | 'ranging' | 'unknown';

export function regimeFilter(
  klinesH1: BinanceKline[],
  hmmRegime: HmmRegime | null | undefined,
  adxFloor = REGIME_ADX_FLOOR,
  adxPeriod = REGIME_ADX_PERIOD,
): FilterVerdict {
  if (hmmRegime === 'ranging') {
    return { passed: false, reason: 'regime_chop', detail: 'hmm=ranging' };
  }
  // hmmRegime null/undefined/unknown → fall through to ADX as the gate
  if (klinesH1.length < adxPeriod * 2 + 1) {
    return { passed: false, reason: 'insufficient_data_for_regime', detail: `${klinesH1.length} candles` };
  }
  const ind = new ADX(adxPeriod);
  let lastAdx: number | null = null;
  for (const k of klinesH1) {
    ind.update({ high: k.high, low: k.low, close: k.close }, false);
    const r = ind.getResult();
    if (r !== null && r !== undefined) lastAdx = Number(r);
  }
  if (lastAdx === null) {
    return { passed: false, reason: 'insufficient_data_for_regime' };
  }
  if (lastAdx < adxFloor) {
    return { passed: false, reason: 'regime_chop', detail: `adx=${lastAdx.toFixed(2)} floor=${adxFloor}` };
  }
  return { passed: true };
}

// ─── Composer ───────────────────────────────────────────────────────────

export interface RunFiltersInput {
  symbol: string;
  side: OrderSide;
  todayUniverse: ReadonlySet<string>;
  concurrencyState: ConcurrencyState;
  klinesH1: BinanceKline[];
  hmmRegime: HmmRegime | null | undefined;
}

export function runEntryFilters(input: RunFiltersInput): FilterVerdict {
  const u = universeFilter(input.symbol, input.todayUniverse);
  if (!u.passed) return u;

  const c = concurrencyFilter(input.symbol, input.concurrencyState);
  if (!c.passed) return c;

  const d = directionFilter(input.klinesH1, input.side);
  if (!d.passed) return d;

  const r = regimeFilter(input.klinesH1, input.hmmRegime);
  if (!r.passed) return r;

  return { passed: true };
}

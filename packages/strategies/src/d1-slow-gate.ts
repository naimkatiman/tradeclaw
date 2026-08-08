import type { OHLCV } from '@tradeclaw/core';
import {
  CRYPTO_PERP_COSTS,
  type CostModel,
} from './backtest-options';
import type { EntryContext } from './types';

export const D1_SLOW_GATE_ID = 'd1-slow-gate' as const;
export const D1_SLOW_GATE_PAPER_STRATEGY_ID = 'd1-slow-gate-paper' as const;
export const D1_SLOW_GATE_TIMEFRAME = 'D1' as const;
export const D1_SLOW_GATE_SYMBOLS = ['BTCUSD', 'ETHUSD'] as const;
export const D1_SLOW_GATE_EMA_PERIOD = 200;
export const D1_SLOW_GATE_ATR_PERIOD = 14;
export const D1_SLOW_GATE_BASE_ATR_MULTIPLIER = 2.5;
export const D1_SLOW_GATE_MAX_COST_R = 0.1;
export const D1_SLOW_GATE_MAX_DIRECTION_CHANGES = 30;
export const D1_SLOW_GATE_FREQUENCY_WINDOW_MS = 365 * 86_400_000;

const DEFAULT_ROUND_TRIP_COST_PCT = 2 * (
  CRYPTO_PERP_COSTS.feePctPerSide + CRYPTO_PERP_COSTS.slippagePctPerSide
);

/** 0.40% round trip / 0.10R = 4.0% minimum price risk. */
export const D1_SLOW_GATE_STOP_FLOOR_PCT =
  (DEFAULT_ROUND_TRIP_COST_PCT / D1_SLOW_GATE_MAX_COST_R) / 100;

export type D1SlowGateAction = 'ENTER_LONG' | 'EXIT_GATE' | 'EXIT_STOP';

export interface D1SlowGateTransition {
  barIndex: number;
  timestamp: number;
  action: D1SlowGateAction;
  direction: 'BUY' | 'SELL';
  state: 'LONG' | 'FLAT';
  price: number;
  confidence: number;
  reason: string;
  ema200: number;
  entryAtr?: number;
  atrMultiplier?: number;
  stopDistance?: number;
  stopLoss?: number;
  costR?: number;
}

export interface D1SlowGateRun {
  equity: number[];
  /** Exposure selected at each D1 close for the next close-to-close interval. */
  exposure: Array<0 | 1>;
  transitions: D1SlowGateTransition[];
  maxRollingDirectionChanges: number;
  frequencyCapPassed: boolean;
  /** Mark-to-market final equity after charging an exit side if still long. */
  terminalEquity: number;
  /** Arithmetic sum of modeled percentage charges, for audit only. */
  totalCostPct: number;
}

export interface D1SlowGateOptions {
  costs?: CostModel;
  maxDirectionChanges?: number;
  frequencyWindowMs?: number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validateContext(context: EntryContext): string {
  const symbol = normalizeSymbol(context.symbol);
  if (!(D1_SLOW_GATE_SYMBOLS as readonly string[]).includes(symbol)) {
    throw new Error(`d1-slow-gate unsupported symbol: ${context.symbol}`);
  }
  if (context.timeframe.toUpperCase() !== D1_SLOW_GATE_TIMEFRAME) {
    throw new Error(`d1-slow-gate requires D1 candles, received ${context.timeframe}`);
  }
  return symbol;
}

function validateCandles(candles: OHLCV[]): void {
  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];
    if (!Number.isSafeInteger(candle.timestamp)) {
      throw new Error(`d1-slow-gate candle ${index} timestamp must be a safe integer`);
    }
    if (index > 0 && candle.timestamp <= candles[index - 1].timestamp) {
      throw new Error('d1-slow-gate candle timestamps must be strictly increasing');
    }
    for (const [field, value] of Object.entries({
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`d1-slow-gate candle ${index} ${field} must be finite and positive`);
      }
    }
    if (
      candle.high < candle.low ||
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    ) {
      throw new Error(`d1-slow-gate candle ${index} has an invalid OHLC range`);
    }
    if (!Number.isFinite(candle.volume) || candle.volume < 0) {
      throw new Error(`d1-slow-gate candle ${index} volume must be finite and non-negative`);
    }
  }
}

/** EMA series aligned to input, SMA-seeded at period - 1. */
export function d1SlowGateEmaSeries(values: number[]): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < D1_SLOW_GATE_EMA_PERIOD) return out;

  let sum = 0;
  for (let index = 0; index < D1_SLOW_GATE_EMA_PERIOD; index++) {
    sum += values[index];
  }
  let ema = sum / D1_SLOW_GATE_EMA_PERIOD;
  out[D1_SLOW_GATE_EMA_PERIOD - 1] = ema;

  const weight = 2 / (D1_SLOW_GATE_EMA_PERIOD + 1);
  for (let index = D1_SLOW_GATE_EMA_PERIOD; index < values.length; index++) {
    ema = values[index] * weight + ema * (1 - weight);
    out[index] = ema;
  }
  return out;
}

/** SMA true-range ATR aligned to input, first value at index `period`. */
export function d1SlowGateAtrSeries(candles: OHLCV[]): Array<number | null> {
  const out: Array<number | null> = new Array(candles.length).fill(null);
  const trueRanges: number[] = [];
  let sum = 0;
  for (let index = 1; index < candles.length; index++) {
    const previousClose = candles[index - 1].close;
    const trueRange = Math.max(
      candles[index].high - candles[index].low,
      Math.abs(candles[index].high - previousClose),
      Math.abs(candles[index].low - previousClose),
    );
    trueRanges.push(trueRange);
    sum += trueRange;
    if (trueRanges.length > D1_SLOW_GATE_ATR_PERIOD) {
      sum -= trueRanges[trueRanges.length - 1 - D1_SLOW_GATE_ATR_PERIOD];
    }
    if (trueRanges.length >= D1_SLOW_GATE_ATR_PERIOD) {
      out[index] = sum / D1_SLOW_GATE_ATR_PERIOD;
    }
  }
  return out;
}

export function maxRollingDirectionChanges(
  transitions: ReadonlyArray<Pick<D1SlowGateTransition, 'timestamp'>>,
  windowMs = D1_SLOW_GATE_FREQUENCY_WINDOW_MS,
): number {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('d1-slow-gate frequency window must be finite and positive');
  }
  const timestamps = transitions.map((transition) => transition.timestamp).sort((a, b) => a - b);
  let first = 0;
  let max = 0;
  for (let last = 0; last < timestamps.length; last++) {
    while (timestamps[last] - timestamps[first] >= windowMs) first++;
    max = Math.max(max, last - first + 1);
  }
  return max;
}

function stopGeometry(
  price: number,
  atr: number,
  costs: CostModel,
): Pick<D1SlowGateTransition, 'entryAtr' | 'atrMultiplier' | 'stopDistance' | 'stopLoss' | 'costR'> {
  const roundTripCostPct = 2 * (costs.feePctPerSide + costs.slippagePctPerSide);
  const minimumRiskFraction = (roundTripCostPct / D1_SLOW_GATE_MAX_COST_R) / 100;
  const atrDistance = atr * D1_SLOW_GATE_BASE_ATR_MULTIPLIER;
  const stopDistance = Math.max(atrDistance, price * minimumRiskFraction);
  const stopLoss = price - stopDistance;
  if (!Number.isFinite(stopDistance) || stopDistance <= 0 || stopLoss <= 0) {
    throw new Error('d1-slow-gate stop geometry would produce a non-positive stop');
  }
  const riskPct = (stopDistance / price) * 100;
  const costR = roundTripCostPct / riskPct;
  return {
    entryAtr: atr,
    atrMultiplier: stopDistance / atr,
    stopDistance,
    stopLoss,
    costR,
  };
}

/**
 * Frozen D1 long/flat state machine used by both paper emission and research.
 * Decisions at close(i) affect the interval close(i) -> close(i+1). A stop in
 * bar i exits the position carried from close(i-1), using a gap-aware fill.
 */
export function runD1SlowGate(
  candles: OHLCV[],
  context: EntryContext,
  options: D1SlowGateOptions = {},
): D1SlowGateRun {
  validateContext(context);
  validateCandles(candles);

  const costs = options.costs ?? CRYPTO_PERP_COSTS;
  const maxDirectionChanges = options.maxDirectionChanges ?? D1_SLOW_GATE_MAX_DIRECTION_CHANGES;
  const frequencyWindowMs = options.frequencyWindowMs ?? D1_SLOW_GATE_FREQUENCY_WINDOW_MS;
  if (!Number.isSafeInteger(maxDirectionChanges) || maxDirectionChanges < 1) {
    throw new Error('d1-slow-gate max direction changes must be a positive safe integer');
  }

  const closes = candles.map((candle) => candle.close);
  const ema = d1SlowGateEmaSeries(closes);
  const atr = d1SlowGateAtrSeries(candles);
  const equity = new Array<number>(candles.length).fill(1);
  const exposure = new Array<0 | 1>(candles.length).fill(0);
  const transitions: D1SlowGateTransition[] = [];

  const sideCostFraction = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  const fundingPerDayFraction = (costs.fundingPctPer8h * 3) / 100;
  let value = 1;
  let totalCostPct = 0;
  let long = false;
  let stopLoss: number | null = null;
  let blockedUntilFlat = false;
  let previousRawGate = false;

  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];

    // First realize the interval whose exposure was selected at yesterday's close.
    if (index > 0 && long) {
      const previousClose = candles[index - 1].close;
      if (stopLoss !== null && candle.low <= stopLoss) {
        const exitPrice = Math.min(stopLoss, candle.open);
        value *= exitPrice / previousClose;
        value *= 1 - fundingPerDayFraction;
        value *= 1 - sideCostFraction;
        totalCostPct += costs.fundingPctPer8h * 3;
        totalCostPct += costs.feePctPerSide + costs.slippagePctPerSide;
        transitions.push({
          barIndex: index,
          timestamp: candle.timestamp,
          action: 'EXIT_STOP',
          direction: 'SELL',
          state: 'FLAT',
          price: exitPrice,
          confidence: 1,
          reason: 'd1-slow-gate-stop-exit',
          ema200: ema[index] ?? ema[index - 1] ?? candle.close,
        });
        long = false;
        stopLoss = null;
        blockedUntilFlat = true;
      } else {
        value *= candle.close / previousClose;
        value *= 1 - fundingPerDayFraction;
        totalCostPct += costs.fundingPctPer8h * 3;
      }
    }

    const currentEma = ema[index];
    const rawGate = currentEma !== null && candle.close > currentEma;
    if (!rawGate) blockedUntilFlat = false;

    if (long && !rawGate) {
      value *= 1 - sideCostFraction;
      totalCostPct += costs.feePctPerSide + costs.slippagePctPerSide;
      transitions.push({
        barIndex: index,
        timestamp: candle.timestamp,
        action: 'EXIT_GATE',
        direction: 'SELL',
        state: 'FLAT',
        price: candle.close,
        confidence: 1,
        reason: 'd1-slow-gate-flat-exit',
        ema200: currentEma ?? candle.close,
      });
      long = false;
      stopLoss = null;
    }

    if (!long && rawGate && !previousRawGate && !blockedUntilFlat) {
      const currentAtr = atr[index];
      if (currentAtr === null || !Number.isFinite(currentAtr) || currentAtr <= 0) {
        throw new Error(`d1-slow-gate ATR unavailable at entry bar ${index}`);
      }
      const geometry = stopGeometry(candle.close, currentAtr, costs);
      value *= 1 - sideCostFraction;
      totalCostPct += costs.feePctPerSide + costs.slippagePctPerSide;
      stopLoss = geometry.stopLoss!;
      long = true;
      const distanceFromEma = Math.abs(candle.close - currentEma!) / candle.close;
      transitions.push({
        barIndex: index,
        timestamp: candle.timestamp,
        action: 'ENTER_LONG',
        direction: 'BUY',
        state: 'LONG',
        price: candle.close,
        confidence: Math.min(1, distanceFromEma / 0.1),
        reason: 'd1-slow-gate-enter-long',
        ema200: currentEma!,
        ...geometry,
      });
    }

    previousRawGate = rawGate;
    exposure[index] = long ? 1 : 0;
    equity[index] = value;
  }

  if (!equity.every((point) => Number.isFinite(point) && point > 0)) {
    throw new Error('d1-slow-gate produced non-finite or non-positive equity');
  }
  const maxRolling = maxRollingDirectionChanges(transitions, frequencyWindowMs);
  const terminalEquity = value * (long ? 1 - sideCostFraction : 1);

  return {
    equity,
    exposure,
    transitions,
    maxRollingDirectionChanges: maxRolling,
    frequencyCapPassed: maxRolling <= maxDirectionChanges,
    terminalEquity,
    totalCostPct: totalCostPct + (long ? costs.feePctPerSide + costs.slippagePctPerSide : 0),
  };
}

/**
 * Pure, deterministic assembly for TC-255's preregistered external strategy
 * replication. This module deliberately has no clock, file, network, database,
 * environment, or live-strategy access.
 */

import type { OHLCV } from '@tradeclaw/core';
import { CRYPTO_PERP_COSTS, type CostModel } from '@tradeclaw/strategies';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;
const ANNUALIZATION_DAYS = 365;
const FOLD_COUNT = 4;

export const EXTERNAL_REPLICATION_START_TS = Date.UTC(2018, 11, 1);
export const EXTERNAL_REPLICATION_HOLDOUT_TS = Date.UTC(2025, 10, 14);
export const EXTERNAL_REPLICATION_SYMBOLS = ['BTCUSD', 'ETHUSD'] as const;
export const EXTERNAL_REPLICATION_CONFIGS = [
  'h1-macd-one-bar',
  'h1-macd-cross-exit',
  'd1h1-macd-one-bar',
  'd1h1-macd-negative-bar-exit',
] as const;

export type ExternalReplicationSymbol = (typeof EXTERNAL_REPLICATION_SYMBOLS)[number];
export type ExternalReplicationConfig = (typeof EXTERNAL_REPLICATION_CONFIGS)[number];
export type Timeframe = 'H1' | 'D1';

export const EXTERNAL_REPLICATION_EXPECTED_SHA256: Record<
  ExternalReplicationSymbol,
  Record<Timeframe, string>
> = {
  BTCUSD: {
    H1: '2ae70142b058695e4bf4fd5b212712f0c2a2068646c7c19469e1effda8068e91',
    D1: 'e8ffc544670131dccb0a0717e45ac6504c2666d5e060755ebc546a711c669a91',
  },
  ETHUSD: {
    H1: '4c6a77b50b254f358277e45e64f5ac2890362df59bf151bf0fe3606e02c30128',
    D1: 'eeee00aed94d5f51be5e315427c935e41519bab693726c62a0d1d1d209f91ed7',
  },
};

function round(value: number, digits = 8): number {
  return Number(value.toFixed(digits));
}

function finiteRound(value: number | null, digits = 8): number | null {
  return value === null ? null : round(value, digits);
}

function iso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function isoHour(timestamp: number): string {
  return iso(timestamp).slice(0, 13) + ':00Z';
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values)!;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
    / (values.length - 1);
  return Math.sqrt(variance);
}

export interface FrozenSeriesInput {
  source: string;
  sourceSha256: string;
  candles: OHLCV[];
}

export interface ExternalReplicationInput {
  symbol: ExternalReplicationSymbol;
  H1: FrozenSeriesInput;
  D1: FrozenSeriesInput;
}

export interface CadenceEvidence {
  bars: number;
  from: string;
  to: string;
  utcAligned: boolean;
  strictlyIncreasing: boolean;
  gapCount: number;
  largestGapBars: number;
  passed: boolean;
}

/**
 * Validate real source bars without inventing candles. Gaps are allowed only
 * when their length is an exact multiple of the declared timeframe; they are
 * surfaced in the artifact and the signal engine refuses cross-gap entries.
 */
export function validateAlignedSeries(candles: OHLCV[], timeframe: Timeframe): CadenceEvidence {
  if (candles.length === 0) throw new Error(`${timeframe} series is empty`);
  const step = timeframe === 'H1' ? HOUR_MS : DAY_MS;
  let gapCount = 0;
  let largestGapBars = 1;

  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp % step !== 0) {
      throw new Error(`${timeframe} bar ${index} is not aligned to its UTC bar-open cadence`);
    }
    if (index > 0) {
      const gap = candle.timestamp - candles[index - 1].timestamp;
      if (gap <= 0) throw new Error(`${timeframe} timestamps are not strictly increasing at bar ${index}`);
      if (gap % step !== 0) throw new Error(`${timeframe} gap is not an integer number of bars at ${index}`);
      const gapBars = gap / step;
      if (gapBars > 1) {
        gapCount += 1;
        largestGapBars = Math.max(largestGapBars, gapBars);
      }
    }

    for (const [field, value] of Object.entries({
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${timeframe} bar ${index} ${field} must be finite and positive`);
      }
    }
    if (
      candle.high < candle.low ||
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    ) {
      throw new Error(`${timeframe} bar ${index} has an invalid OHLC range`);
    }
    if (!Number.isFinite(candle.volume) || candle.volume < 0) {
      throw new Error(`${timeframe} bar ${index} volume must be finite and non-negative`);
    }
  }

  return {
    bars: candles.length,
    from: iso(candles[0].timestamp),
    to: iso(candles[candles.length - 1].timestamp),
    utcAligned: true,
    strictlyIncreasing: true,
    gapCount,
    largestGapBars,
    passed: true,
  };
}

/** SMA-seeded EMA, matching the preregistration exactly. */
export function emaSeries(values: number[], period: number): Array<number | null> {
  if (!Number.isSafeInteger(period) || period <= 0) throw new Error('EMA period must be a positive integer');
  if (!values.every(Number.isFinite)) throw new Error('EMA values must be finite');
  const output = new Array<number | null>(values.length).fill(null);
  if (values.length < period) return output;

  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output[period - 1] = seed;
  const alpha = 2 / (period + 1);
  for (let index = period; index < values.length; index++) {
    output[index] = alpha * values[index] + (1 - alpha) * output[index - 1]!;
  }
  return output;
}

export interface MacdSeries {
  line: Array<number | null>;
  signal: Array<number | null>;
  histogram: Array<number | null>;
}

/** MACD(12,26,9), with signal EMA seeded from the first nine finite MACD values. */
export function macdSeries(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdSeries {
  if (fastPeriod >= slowPeriod) throw new Error('MACD fast period must be below slow period');
  const fast = emaSeries(closes, fastPeriod);
  const slow = emaSeries(closes, slowPeriod);
  const line = closes.map((_close, index) => (
    fast[index] === null || slow[index] === null ? null : fast[index]! - slow[index]!
  ));
  const finiteLine = line.filter((value): value is number => value !== null);
  const finiteSignal = emaSeries(finiteLine, signalPeriod);
  const signal = new Array<number | null>(closes.length).fill(null);
  let finiteIndex = 0;
  for (let index = 0; index < line.length; index++) {
    if (line[index] !== null) {
      signal[index] = finiteSignal[finiteIndex];
      finiteIndex += 1;
    }
  }
  const histogram = line.map((value, index) => (
    value === null || signal[index] === null ? null : value - signal[index]!
  ));
  return { line, signal, histogram };
}

export function bullishCrossovers(macd: MacdSeries): boolean[] {
  return macd.line.map((line, index) => {
    if (index === 0 || line === null || macd.signal[index] === null) return false;
    const previousLine = macd.line[index - 1];
    const previousSignal = macd.signal[index - 1];
    return previousLine !== null && previousSignal !== null
      && previousLine <= previousSignal
      && line > macd.signal[index]!;
  });
}

export function bearishCrossovers(macd: MacdSeries): boolean[] {
  return macd.line.map((line, index) => {
    if (index === 0 || line === null || macd.signal[index] === null) return false;
    const previousLine = macd.line[index - 1];
    const previousSignal = macd.signal[index - 1];
    return previousLine !== null && previousSignal !== null
      && previousLine >= previousSignal
      && line < macd.signal[index]!;
  });
}

/** Latest D1 bar whose close is available at an H1 signal close. */
export function lastFullyClosedD1Index(d1: OHLCV[], signalCloseTs: number): number {
  let low = 0;
  let high = d1.length - 1;
  let answer = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (d1[middle].timestamp + DAY_MS <= signalCloseTs) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer;
}

interface SignalSchedules {
  h1: boolean[];
  h1Exit: boolean[];
  d1h1: boolean[];
  qa: {
    h1BullishCrossovers: number;
    h1BearishCrossovers: number;
    d1AdmittedCrossovers: number;
    d1RejectedCrossovers: number;
    skippedCrossGapEntries: number;
    missingCompletedD1: number;
    lookaheadViolations: number;
    maximumD1StalenessHours: number;
  };
}

function buildSignalSchedules(h1: OHLCV[], d1: OHLCV[]): SignalSchedules {
  const h1Macd = macdSeries(h1.map((candle) => candle.close));
  const d1Macd = macdSeries(d1.map((candle) => candle.close));
  const crosses = bullishCrossovers(h1Macd);
  const bearish = bearishCrossovers(h1Macd);
  const h1Schedule = new Array<boolean>(h1.length).fill(false);
  const h1ExitSchedule = new Array<boolean>(h1.length).fill(false);
  const d1h1Schedule = new Array<boolean>(h1.length).fill(false);
  let h1BullishCrossovers = 0;
  let h1BearishCrossovers = 0;
  let d1AdmittedCrossovers = 0;
  let d1RejectedCrossovers = 0;
  let skippedCrossGapEntries = 0;
  let missingCompletedD1 = 0;
  let lookaheadViolations = 0;
  let maximumD1StalenessHours = 0;

  for (let signalIndex = 0; signalIndex < h1.length - 1; signalIndex++) {
    if (bearish[signalIndex]) {
      h1BearishCrossovers += 1;
      // A held position must not ignore risk merely because the next source bar
      // follows an exchange-data gap. The exit remains causal at that next
      // available open and funding covers the entire wall-clock interval.
      h1ExitSchedule[signalIndex + 1] = true;
    }
    if (!crosses[signalIndex]) continue;
    h1BullishCrossovers += 1;
    const signalCloseTs = h1[signalIndex].timestamp + HOUR_MS;
    const entryIndex = signalIndex + 1;
    if (h1[entryIndex].timestamp !== signalCloseTs) {
      skippedCrossGapEntries += 1;
      continue;
    }
    h1Schedule[entryIndex] = true;

    const d1Index = lastFullyClosedD1Index(d1, signalCloseTs);
    if (d1Index < 0) {
      missingCompletedD1 += 1;
      continue;
    }
    const d1ClosedAt = d1[d1Index].timestamp + DAY_MS;
    if (d1ClosedAt > signalCloseTs) lookaheadViolations += 1;
    maximumD1StalenessHours = Math.max(
      maximumD1StalenessHours,
      (signalCloseTs - d1ClosedAt) / HOUR_MS,
    );
    const bullish = d1Macd.line[d1Index] !== null
      && d1Macd.signal[d1Index] !== null
      && d1Macd.line[d1Index]! > d1Macd.signal[d1Index]!;
    if (bullish) {
      d1h1Schedule[entryIndex] = true;
      d1AdmittedCrossovers += 1;
    } else {
      d1RejectedCrossovers += 1;
    }
  }

  return {
    h1: h1Schedule,
    h1Exit: h1ExitSchedule,
    d1h1: d1h1Schedule,
    qa: {
      h1BullishCrossovers,
      h1BearishCrossovers,
      d1AdmittedCrossovers,
      d1RejectedCrossovers,
      skippedCrossGapEntries,
      missingCompletedD1,
      lookaheadViolations,
      maximumD1StalenessHours: round(maximumD1StalenessHours),
    },
  };
}

export interface PrefixInvariantEvidence {
  passed: boolean;
  checkpoints: Array<{
    h1Bars: number;
    d1Bars: number;
    through: string;
    h1MacdMatches: boolean;
    d1MacdMatches: boolean;
    passed: boolean;
  }>;
}

/** Prove that appending future candles cannot rewrite earlier MACD values. */
export function checkMacdPrefixInvariance(h1: OHLCV[], d1: OHLCV[]): PrefixInvariantEvidence {
  const fullH1 = macdSeries(h1.map((candle) => candle.close));
  const fullD1 = macdSeries(d1.map((candle) => candle.close));
  const requested = [0.25, 0.5, 0.75, (h1.length - 1) / h1.length]
    .map((fraction) => Math.max(40, Math.floor(h1.length * fraction)));
  const h1Lengths = [...new Set(requested)].filter((length) => length < h1.length);
  const checkpoints = h1Lengths.map((h1Bars) => {
    const throughTs = h1[h1Bars - 1].timestamp + HOUR_MS;
    const d1Bars = d1.filter((candle) => candle.timestamp + DAY_MS <= throughTs).length;
    if (d1Bars < 40) throw new Error('prefix checkpoint has insufficient D1 MACD warmup');
    const h1Prefix = macdSeries(h1.slice(0, h1Bars).map((candle) => candle.close));
    const d1Prefix = macdSeries(d1.slice(0, d1Bars).map((candle) => candle.close));
    const h1MacdMatches = JSON.stringify(h1Prefix) === JSON.stringify({
      line: fullH1.line.slice(0, h1Bars),
      signal: fullH1.signal.slice(0, h1Bars),
      histogram: fullH1.histogram.slice(0, h1Bars),
    });
    const d1MacdMatches = JSON.stringify(d1Prefix) === JSON.stringify({
      line: fullD1.line.slice(0, d1Bars),
      signal: fullD1.signal.slice(0, d1Bars),
      histogram: fullD1.histogram.slice(0, d1Bars),
    });
    return {
      h1Bars,
      d1Bars,
      through: isoHour(h1[h1Bars - 1].timestamp),
      h1MacdMatches,
      d1MacdMatches,
      passed: h1MacdMatches && d1MacdMatches,
    };
  });
  return { passed: checkpoints.length === 4 && checkpoints.every((item) => item.passed), checkpoints };
}

export interface EvaluationWindow {
  label: string;
  startTs: number;
  endExclusiveTs: number;
}

export interface TradeRecord {
  entryAt: string;
  exitAt: string;
  entryPrice: number;
  exitPrice: number;
  heldHours: number;
  grossReturn: number;
  netReturn: number;
  exitReason: 'macd-cross' | 'one-bar' | 'negative-bar' | 'window-end';
}

interface CurvePoint {
  timestamp: number;
  gross: number;
  net: number;
}

interface RawSimulation {
  window: EvaluationWindow;
  points: CurvePoint[];
  trades: TradeRecord[];
}

interface OpenPosition {
  entryIndex: number;
  entryTs: number;
  entryPrice: number;
  fundingFactor: number;
}

function fundingFactor(heldHours: number, costs: CostModel): number {
  const factor = 1 - (costs.fundingPctPer8h / 100) * (heldHours / 8);
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error('modeled funding exhausted the position; window is invalid');
  }
  return factor;
}

function simulationIndices(h1: OHLCV[], window: EvaluationWindow): number[] {
  if (
    !Number.isSafeInteger(window.startTs) ||
    !Number.isSafeInteger(window.endExclusiveTs) ||
    window.endExclusiveTs <= window.startTs
  ) {
    throw new Error(`invalid evaluation window ${window.label}`);
  }
  const indices: number[] = [];
  for (let index = 0; index < h1.length; index++) {
    if (h1[index].timestamp >= window.startTs && h1[index].timestamp < window.endExclusiveTs) {
      indices.push(index);
    }
  }
  if (indices.length === 0) throw new Error(`evaluation window ${window.label} has no H1 bars`);
  return indices;
}

/**
 * Simulate a frozen entry schedule. Entry costs are paid at the bar open,
 * price is marked at every available H1 close, funding follows wall-clock
 * holding time, and every terminal position is force-closed.
 */
export function simulateEntrySchedule(
  h1: OHLCV[],
  entrySchedule: boolean[],
  config: ExternalReplicationConfig,
  window: EvaluationWindow,
  costs: CostModel = CRYPTO_PERP_COSTS,
  openExitSchedule: boolean[] | null = null,
): RawSimulation {
  if (entrySchedule.length !== h1.length) throw new Error('entry schedule must align with H1 candles');
  if (openExitSchedule !== null && openExitSchedule.length !== h1.length) {
    throw new Error('exit schedule must align with H1 candles');
  }
  if (config === 'h1-macd-cross-exit' && openExitSchedule === null) {
    throw new Error('pure H1 MACD configuration requires a bearish-crossover exit schedule');
  }
  const indices = simulationIndices(h1, window);
  const finalIndex = indices[indices.length - 1];
  const sideCost = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  if (sideCost < 0 || sideCost >= 1) throw new Error('side cost must be in [0, 100) percent');
  let gross = 1;
  let net = 1;
  let position: OpenPosition | null = null;
  let previousMarkPrice: number | null = null;
  const trades: TradeRecord[] = [];
  const points: CurvePoint[] = [];

  for (const index of indices) {
    const candle = h1[index];

    // The bearish crossover is observed at the preceding H1 close, so its
    // causal fill is this bar's open. Mark any intervening gap and accrue its
    // funding before paying the exit-side cost.
    if (position !== null && openExitSchedule?.[index]) {
      gross *= candle.open / previousMarkPrice!;
      net *= candle.open / previousMarkPrice!;
      const heldHours = (candle.timestamp - position.entryTs) / HOUR_MS;
      const nextFundingFactor = fundingFactor(heldHours, costs);
      net *= nextFundingFactor / position.fundingFactor;
      position.fundingFactor = nextFundingFactor;
      net *= 1 - sideCost;
      const grossFactor = candle.open / position.entryPrice;
      const netFactor = grossFactor * (1 - sideCost) ** 2 * position.fundingFactor;
      trades.push({
        entryAt: iso(position.entryTs),
        exitAt: iso(candle.timestamp),
        entryPrice: position.entryPrice,
        exitPrice: candle.open,
        heldHours,
        grossReturn: grossFactor - 1,
        netReturn: netFactor - 1,
        exitReason: 'macd-cross',
      });
      position = null;
      previousMarkPrice = null;
    }

    if (position === null && entrySchedule[index]) {
      position = {
        entryIndex: index,
        entryTs: candle.timestamp,
        entryPrice: candle.open,
        fundingFactor: 1,
      };
      previousMarkPrice = candle.open;
      net *= 1 - sideCost;
    }

    if (position !== null) {
      gross *= candle.close / previousMarkPrice!;
      net *= candle.close / previousMarkPrice!;
      previousMarkPrice = candle.close;
      const closeTs = candle.timestamp + HOUR_MS;
      const heldHours = (closeTs - position.entryTs) / HOUR_MS;
      const nextFundingFactor = fundingFactor(heldHours, costs);
      net *= nextFundingFactor / position.fundingFactor;
      position.fundingFactor = nextFundingFactor;

      const oneBarExit = config === 'h1-macd-one-bar' || config === 'd1h1-macd-one-bar';
      const negativeBarExit = config === 'd1h1-macd-negative-bar-exit' && candle.close < candle.open;
      const windowExit = index === finalIndex;
      if (oneBarExit || negativeBarExit || windowExit) {
        const exitReason: TradeRecord['exitReason'] = oneBarExit
          ? 'one-bar'
          : negativeBarExit
            ? 'negative-bar'
            : 'window-end';
        net *= 1 - sideCost;
        const grossFactor = candle.close / position.entryPrice;
        const netFactor = grossFactor * (1 - sideCost) ** 2 * position.fundingFactor;
        trades.push({
          entryAt: iso(position.entryTs),
          exitAt: iso(closeTs),
          entryPrice: position.entryPrice,
          exitPrice: candle.close,
          heldHours,
          grossReturn: grossFactor - 1,
          netReturn: netFactor - 1,
          exitReason,
        });
        position = null;
        previousMarkPrice = null;
      }
    }
    if (!Number.isFinite(gross) || gross <= 0 || !Number.isFinite(net) || net <= 0) {
      throw new Error(`non-finite or non-positive equity at H1 bar ${index}`);
    }
    points.push({ timestamp: candle.timestamp + HOUR_MS, gross, net });
  }

  return { window, points, trades };
}

function dailyReturns(points: CurvePoint[], field: 'gross' | 'net'): number[] {
  const dailyLast = new Map<string, number>();
  for (const point of points) dailyLast.set(iso(point.timestamp).slice(0, 10), point[field]);
  const values = [...dailyLast.values()];
  const returns: number[] = [];
  let previous = 1;
  for (const value of values) {
    returns.push(value / previous - 1);
    previous = value;
  }
  return returns;
}

function maximumDrawdown(values: number[]): number {
  let peak = 1;
  let drawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, 1 - value / peak);
  }
  return drawdown;
}

interface RawPerformanceMetrics {
  bars: number;
  performanceDays: number;
  completedTrades: number;
  heldHours: number;
  exposureFraction: number;
  grossCompoundedReturn: number;
  netCompoundedReturn: number;
  meanGrossTradeReturn: number | null;
  meanNetTradeReturn: number | null;
  netWinRate: number | null;
  netProfitFactor: number | null;
  netTradeTStatistic: number | null;
  annualizedVolatility: number | null;
  sharpe: number | null;
  maximumDrawdown: number;
  cagr: number;
  calmar: number | null;
  costs: {
    roundTripFeeSlippagePctSum: number;
    fundingPctSum: number;
    compoundedReturnDrag: number;
  };
}

export interface PerformanceMetrics {
  bars: number;
  performanceDays: number;
  completedTrades: number;
  heldHours: number;
  exposureFraction: number;
  grossCompoundedReturn: number;
  netCompoundedReturn: number;
  meanGrossTradeReturn: number | null;
  meanNetTradeReturn: number | null;
  netWinRate: number | null;
  netProfitFactor: number | null;
  netTradeTStatistic: number | null;
  annualizedVolatility: number | null;
  sharpe: number | null;
  maximumDrawdown: number;
  cagr: number;
  calmar: number | null;
  costs: {
    roundTripFeeSlippagePctSum: number;
    fundingPctSum: number;
    compoundedReturnDrag: number;
  };
}

function rawPerformanceMetrics(simulation: RawSimulation, costs: CostModel): RawPerformanceMetrics {
  const { points, trades, window } = simulation;
  if (points.length === 0) throw new Error('performance metrics require curve points');
  const grossTerminal = points[points.length - 1].gross;
  const netTerminal = points[points.length - 1].net;
  const performanceDays = (window.endExclusiveTs - window.startTs) / DAY_MS;
  const years = performanceDays / YEAR_DAYS;
  const netReturns = trades.map((trade) => trade.netReturn);
  const grossReturns = trades.map((trade) => trade.grossReturn);
  const netMean = mean(netReturns);
  const netStd = sampleStandardDeviation(netReturns);
  const daily = dailyReturns(points, 'net');
  const dailyMean = mean(daily);
  const dailyStd = sampleStandardDeviation(daily);
  const heldHours = trades.reduce((sum, trade) => sum + trade.heldHours, 0);
  const gains = netReturns.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(netReturns.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));
  const maximumDrawdownValue = maximumDrawdown(points.map((point) => point.net));
  const cagr = Math.pow(netTerminal, 1 / years) - 1;
  return {
    bars: points.length,
    performanceDays,
    completedTrades: trades.length,
    heldHours,
    exposureFraction: heldHours / (performanceDays * 24),
    grossCompoundedReturn: grossTerminal - 1,
    netCompoundedReturn: netTerminal - 1,
    meanGrossTradeReturn: mean(grossReturns),
    meanNetTradeReturn: netMean,
    netWinRate: trades.length === 0 ? null : netReturns.filter((value) => value > 0).length / trades.length,
    netProfitFactor: losses > 0 ? gains / losses : gains > 0 ? null : 0,
    netTradeTStatistic: netMean !== null && netStd !== null && netStd > 0
      ? netMean / (netStd / Math.sqrt(netReturns.length))
      : null,
    annualizedVolatility: dailyStd === null ? null : dailyStd * Math.sqrt(ANNUALIZATION_DAYS),
    sharpe: dailyMean !== null && dailyStd !== null && dailyStd > 0
      ? (dailyMean / dailyStd) * Math.sqrt(ANNUALIZATION_DAYS)
      : null,
    maximumDrawdown: maximumDrawdownValue,
    cagr,
    calmar: maximumDrawdownValue > 0 ? cagr / maximumDrawdownValue : null,
    costs: {
      roundTripFeeSlippagePctSum: trades.length * 2
        * (costs.feePctPerSide + costs.slippagePctPerSide),
      fundingPctSum: heldHours * costs.fundingPctPer8h / 8,
      compoundedReturnDrag: grossTerminal - netTerminal,
    },
  };
}

function stablePerformanceMetrics(raw: RawPerformanceMetrics): PerformanceMetrics {
  return {
    bars: raw.bars,
    performanceDays: round(raw.performanceDays),
    completedTrades: raw.completedTrades,
    heldHours: round(raw.heldHours),
    exposureFraction: round(raw.exposureFraction),
    grossCompoundedReturn: round(raw.grossCompoundedReturn),
    netCompoundedReturn: round(raw.netCompoundedReturn),
    meanGrossTradeReturn: finiteRound(raw.meanGrossTradeReturn),
    meanNetTradeReturn: finiteRound(raw.meanNetTradeReturn),
    netWinRate: finiteRound(raw.netWinRate),
    netProfitFactor: finiteRound(raw.netProfitFactor),
    netTradeTStatistic: finiteRound(raw.netTradeTStatistic),
    annualizedVolatility: finiteRound(raw.annualizedVolatility),
    sharpe: finiteRound(raw.sharpe),
    maximumDrawdown: round(raw.maximumDrawdown),
    cagr: round(raw.cagr),
    calmar: finiteRound(raw.calmar),
    costs: {
      roundTripFeeSlippagePctSum: round(raw.costs.roundTripFeeSlippagePctSum),
      fundingPctSum: round(raw.costs.fundingPctSum),
      compoundedReturnDrag: round(raw.costs.compoundedReturnDrag),
    },
  };
}

function simulateBuyAndHold(
  h1: OHLCV[],
  window: EvaluationWindow,
  costs: CostModel,
  includeFunding: boolean,
): RawSimulation {
  const indices = simulationIndices(h1, window);
  const first = h1[indices[0]];
  const finalIndex = indices[indices.length - 1];
  const sideCost = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  const points = indices.map((index) => {
    const candle = h1[index];
    const heldHours = (candle.timestamp + HOUR_MS - first.timestamp) / HOUR_MS;
    const funding = includeFunding ? fundingFactor(heldHours, costs) : 1;
    const exit = index === finalIndex ? 1 - sideCost : 1;
    return {
      timestamp: candle.timestamp + HOUR_MS,
      gross: candle.close / first.open,
      net: (1 - sideCost) * (candle.close / first.open) * funding * exit,
    };
  });
  const final = h1[finalIndex];
  const heldHours = (final.timestamp + HOUR_MS - first.timestamp) / HOUR_MS;
  const grossFactor = final.close / first.open;
  const netFactor = grossFactor * (1 - sideCost) ** 2
    * (includeFunding ? fundingFactor(heldHours, costs) : 1);
  return {
    window,
    points,
    trades: [{
      entryAt: iso(first.timestamp),
      exitAt: iso(final.timestamp + HOUR_MS),
      entryPrice: first.open,
      exitPrice: final.close,
      heldHours,
      grossReturn: grossFactor - 1,
      netReturn: netFactor - 1,
      exitReason: 'window-end',
    }],
  };
}

interface WindowResultInternal {
  publicResult: PerformanceMetrics;
  raw: RawPerformanceMetrics;
  simulation: RawSimulation;
}

function evaluateSchedule(
  h1: OHLCV[],
  schedule: boolean[],
  openExitSchedule: boolean[] | null,
  config: ExternalReplicationConfig,
  window: EvaluationWindow,
  costs: CostModel,
): WindowResultInternal {
  const simulation = simulateEntrySchedule(
    h1,
    schedule,
    config,
    window,
    costs,
    openExitSchedule,
  );
  const raw = rawPerformanceMetrics(simulation, costs);
  return { publicResult: stablePerformanceMetrics(raw), raw, simulation };
}

function evaluateBenchmark(
  h1: OHLCV[],
  window: EvaluationWindow,
  costs: CostModel,
  includeFunding: boolean,
): WindowResultInternal {
  const simulation = simulateBuyAndHold(h1, window, costs, includeFunding);
  const benchmarkCosts = includeFunding ? costs : { ...costs, fundingPctPer8h: 0 };
  const raw = rawPerformanceMetrics(simulation, benchmarkCosts);
  return { publicResult: stablePerformanceMetrics(raw), raw, simulation };
}

function chronologicalFolds(startTs: number, endExclusiveTs: number): EvaluationWindow[] {
  const totalHours = (endExclusiveTs - startTs) / HOUR_MS;
  if (!Number.isSafeInteger(totalHours) || totalHours < FOLD_COUNT) {
    throw new Error('replication window must span an integer number of H1 bars');
  }
  return Array.from({ length: FOLD_COUNT }, (_value, index) => ({
    label: `fold${index + 1}`,
    startTs: startTs + Math.floor(totalHours * index / FOLD_COUNT) * HOUR_MS,
    endExclusiveTs: index === FOLD_COUNT - 1
      ? endExclusiveTs
      : startTs + Math.floor(totalHours * (index + 1) / FOLD_COUNT) * HOUR_MS,
  }));
}

interface ConfigInternal {
  publicResult: {
    full: PerformanceMetrics;
    holdout: PerformanceMetrics;
    folds: Array<{ label: string; from: string; toExclusive: string; metrics: PerformanceMetrics }>;
  };
  full: WindowResultInternal;
  holdout: WindowResultInternal;
  folds: WindowResultInternal[];
}

interface SymbolInternal {
  publicResult: {
    configurations: Record<ExternalReplicationConfig, ConfigInternal['publicResult']>;
    benchmarks: {
      cashNetReturn: 0;
      full: { spot: PerformanceMetrics; perpetual: PerformanceMetrics };
      holdout: { spot: PerformanceMetrics; perpetual: PerformanceMetrics };
      folds: Array<{
        label: string;
        from: string;
        toExclusive: string;
        spot: PerformanceMetrics;
        perpetual: PerformanceMetrics;
      }>;
    };
  };
  configs: Record<ExternalReplicationConfig, ConfigInternal>;
  benchmarks: {
    full: { spot: WindowResultInternal; perpetual: WindowResultInternal };
    holdout: { spot: WindowResultInternal; perpetual: WindowResultInternal };
    folds: Array<{ spot: WindowResultInternal; perpetual: WindowResultInternal }>;
  };
  schedules: SignalSchedules;
}

function evaluateSymbol(
  input: ExternalReplicationInput,
  fullWindow: EvaluationWindow,
  holdoutWindow: EvaluationWindow,
  folds: EvaluationWindow[],
  costs: CostModel,
): SymbolInternal {
  const schedules = buildSignalSchedules(input.H1.candles, input.D1.candles);
  const configs = Object.fromEntries(EXTERNAL_REPLICATION_CONFIGS.map((config) => {
    const h1Control = config === 'h1-macd-one-bar' || config === 'h1-macd-cross-exit';
    const schedule = h1Control ? schedules.h1 : schedules.d1h1;
    const exitSchedule = config === 'h1-macd-cross-exit' ? schedules.h1Exit : null;
    const full = evaluateSchedule(input.H1.candles, schedule, exitSchedule, config, fullWindow, costs);
    const holdout = evaluateSchedule(input.H1.candles, schedule, exitSchedule, config, holdoutWindow, costs);
    const foldResults = folds.map((fold) => (
      evaluateSchedule(input.H1.candles, schedule, exitSchedule, config, fold, costs)
    ));
    return [config, {
      publicResult: {
        full: full.publicResult,
        holdout: holdout.publicResult,
        folds: foldResults.map((result, index) => ({
          label: folds[index].label,
          from: iso(folds[index].startTs),
          toExclusive: iso(folds[index].endExclusiveTs),
          metrics: result.publicResult,
        })),
      },
      full,
      holdout,
      folds: foldResults,
    }];
  })) as Record<ExternalReplicationConfig, ConfigInternal>;

  const benchmarkFull = {
    spot: evaluateBenchmark(input.H1.candles, fullWindow, costs, false),
    perpetual: evaluateBenchmark(input.H1.candles, fullWindow, costs, true),
  };
  const benchmarkHoldout = {
    spot: evaluateBenchmark(input.H1.candles, holdoutWindow, costs, false),
    perpetual: evaluateBenchmark(input.H1.candles, holdoutWindow, costs, true),
  };
  const benchmarkFolds = folds.map((fold) => ({
    spot: evaluateBenchmark(input.H1.candles, fold, costs, false),
    perpetual: evaluateBenchmark(input.H1.candles, fold, costs, true),
  }));

  return {
    publicResult: {
      configurations: Object.fromEntries(EXTERNAL_REPLICATION_CONFIGS.map((config) => [
        config,
        configs[config].publicResult,
      ])) as Record<ExternalReplicationConfig, ConfigInternal['publicResult']>,
      benchmarks: {
        cashNetReturn: 0,
        full: { spot: benchmarkFull.spot.publicResult, perpetual: benchmarkFull.perpetual.publicResult },
        holdout: {
          spot: benchmarkHoldout.spot.publicResult,
          perpetual: benchmarkHoldout.perpetual.publicResult,
        },
        folds: benchmarkFolds.map((result, index) => ({
          label: folds[index].label,
          from: iso(folds[index].startTs),
          toExclusive: iso(folds[index].endExclusiveTs),
          spot: result.spot.publicResult,
          perpetual: result.perpetual.publicResult,
        })),
      },
    },
    configs,
    benchmarks: { full: benchmarkFull, holdout: benchmarkHoldout, folds: benchmarkFolds },
    schedules,
  };
}

interface PortfolioMetricsRaw {
  performanceDays: number;
  grossCompoundedReturn: number;
  netCompoundedReturn: number;
  annualizedVolatility: number | null;
  sharpe: number | null;
  maximumDrawdown: number;
  cagr: number;
  calmar: number | null;
}

export interface PortfolioMetrics {
  performanceDays: number;
  grossCompoundedReturn: number;
  netCompoundedReturn: number;
  annualizedVolatility: number | null;
  sharpe: number | null;
  maximumDrawdown: number;
  cagr: number;
  calmar: number | null;
}

function combineSleeves(first: RawSimulation, second: RawSimulation): RawSimulation {
  if (first.points.length !== second.points.length || first.points.length === 0) {
    throw new Error('fixed portfolio sleeves must align and be non-empty');
  }
  const points = first.points.map((point, index) => {
    const other = second.points[index];
    if (point.timestamp !== other.timestamp) throw new Error('fixed portfolio timestamps do not align');
    return {
      timestamp: point.timestamp,
      gross: 0.5 * point.gross + 0.5 * other.gross,
      net: 0.5 * point.net + 0.5 * other.net,
    };
  });
  return { window: first.window, points, trades: [] };
}

function rawPortfolioMetrics(simulation: RawSimulation): PortfolioMetricsRaw {
  const terminal = simulation.points[simulation.points.length - 1];
  const performanceDays = (simulation.window.endExclusiveTs - simulation.window.startTs) / DAY_MS;
  const years = performanceDays / YEAR_DAYS;
  const returns = dailyReturns(simulation.points, 'net');
  const average = mean(returns);
  const standardDeviation = sampleStandardDeviation(returns);
  const drawdown = maximumDrawdown(simulation.points.map((point) => point.net));
  const cagr = Math.pow(terminal.net, 1 / years) - 1;
  return {
    performanceDays,
    grossCompoundedReturn: terminal.gross - 1,
    netCompoundedReturn: terminal.net - 1,
    annualizedVolatility: standardDeviation === null ? null : standardDeviation * Math.sqrt(ANNUALIZATION_DAYS),
    sharpe: average !== null && standardDeviation !== null && standardDeviation > 0
      ? average / standardDeviation * Math.sqrt(ANNUALIZATION_DAYS)
      : null,
    maximumDrawdown: drawdown,
    cagr,
    calmar: drawdown > 0 ? cagr / drawdown : null,
  };
}

function stablePortfolioMetrics(raw: PortfolioMetricsRaw): PortfolioMetrics {
  return {
    performanceDays: round(raw.performanceDays),
    grossCompoundedReturn: round(raw.grossCompoundedReturn),
    netCompoundedReturn: round(raw.netCompoundedReturn),
    annualizedVolatility: finiteRound(raw.annualizedVolatility),
    sharpe: finiteRound(raw.sharpe),
    maximumDrawdown: round(raw.maximumDrawdown),
    cagr: round(raw.cagr),
    calmar: finiteRound(raw.calmar),
  };
}

export interface ReplicationDecision {
  btcReplication: {
    verdict: 'PASS' | 'FAIL';
    conditions: Record<string, boolean>;
    positiveFolds: number;
    reasons: string[];
  };
  portfolioCandidate: {
    verdict: 'PASS' | 'FAIL';
    conditions: Record<string, boolean>;
    ethPositiveFolds: number;
    reasons: string[];
  };
  eligibleForProspectiveReview: boolean;
  activationApproved: false;
  liveMutationApproved: false;
  lane: 'modeled-research';
}

function calmarGreater(candidate: number | null, benchmark: number | null): boolean {
  return candidate !== null && benchmark !== null && candidate > benchmark;
}

export function decideExternalReplication(input: {
  btc: { full: RawPerformanceMetrics; holdout: RawPerformanceMetrics; folds: RawPerformanceMetrics[]; spot: RawPerformanceMetrics };
  eth: { full: RawPerformanceMetrics; folds: RawPerformanceMetrics[] };
  portfolio: { full: PortfolioMetricsRaw; holdout: PortfolioMetricsRaw; spot: PortfolioMetricsRaw };
  qaPassed: boolean;
}): ReplicationDecision {
  const btcPositiveFolds = input.btc.folds.filter((fold) => fold.netCompoundedReturn > 0).length;
  const btcConditions = {
    qaPassed: input.qaPassed,
    fullNetReturnPositive: input.btc.full.netCompoundedReturn > 0,
    meanNetTradeReturnPositive: (input.btc.full.meanNetTradeReturn ?? Number.NEGATIVE_INFINITY) > 0,
    tradeTStatisticAtLeast1Point96: (input.btc.full.netTradeTStatistic ?? Number.NEGATIVE_INFINITY) >= 1.96,
    atLeast100Trades: input.btc.full.completedTrades >= 100,
    atLeastThreePositiveFolds: btcPositiveFolds >= 3,
    holdoutAtLeast20Trades: input.btc.holdout.completedTrades >= 20,
    holdoutNetReturnPositive: input.btc.holdout.netCompoundedReturn > 0,
    holdoutMeanNetTradeReturnPositive:
      (input.btc.holdout.meanNetTradeReturn ?? Number.NEGATIVE_INFINITY) > 0,
    maximumDrawdownBelowSpot: input.btc.full.maximumDrawdown < input.btc.spot.maximumDrawdown,
    calmarAboveSpot: calmarGreater(input.btc.full.calmar, input.btc.spot.calmar),
  };
  const btcReasons = Object.entries(btcConditions)
    .filter(([, passed]) => !passed)
    .map(([condition]) => `BTC condition failed: ${condition}`);

  const ethPositiveFolds = input.eth.folds.filter((fold) => fold.netCompoundedReturn > 0).length;
  const portfolioConditions = {
    btcReplicationPassed: btcReasons.length === 0,
    ethFullNetReturnPositive: input.eth.full.netCompoundedReturn > 0,
    ethMeanNetTradeReturnPositive: (input.eth.full.meanNetTradeReturn ?? Number.NEGATIVE_INFINITY) > 0,
    ethTradeTStatisticAtLeast1Point96:
      (input.eth.full.netTradeTStatistic ?? Number.NEGATIVE_INFINITY) >= 1.96,
    ethAtLeastThreePositiveFolds: ethPositiveFolds >= 3,
    portfolioFullNetReturnPositive: input.portfolio.full.netCompoundedReturn > 0,
    portfolioHoldoutNetReturnPositive: input.portfolio.holdout.netCompoundedReturn > 0,
    portfolioMaximumDrawdownBelowSpot:
      input.portfolio.full.maximumDrawdown < input.portfolio.spot.maximumDrawdown,
    portfolioCalmarAboveSpot: calmarGreater(input.portfolio.full.calmar, input.portfolio.spot.calmar),
  };
  const portfolioReasons = Object.entries(portfolioConditions)
    .filter(([, passed]) => !passed)
    .map(([condition]) => `portfolio condition failed: ${condition}`);
  const portfolioPassed = portfolioReasons.length === 0;
  return {
    btcReplication: {
      verdict: btcReasons.length === 0 ? 'PASS' : 'FAIL',
      conditions: btcConditions,
      positiveFolds: btcPositiveFolds,
      reasons: btcReasons,
    },
    portfolioCandidate: {
      verdict: portfolioPassed ? 'PASS' : 'FAIL',
      conditions: portfolioConditions,
      ethPositiveFolds,
      reasons: portfolioReasons,
    },
    eligibleForProspectiveReview: portfolioPassed,
    activationApproved: false,
    liveMutationApproved: false,
    lane: 'modeled-research',
  };
}

export interface ExternalMultiTimeframeArtifact {
  meta: {
    schemaVersion: 2;
    studyDate: '2026-08-29';
    task: 'TC-255';
    catalogCommit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3';
    preregistration: 'docs/plans/2026-08-29-external-multi-timeframe-replication.md';
    preregistrationSha256: '8679c1aa033b5e52f1cc6c9097ed14d34aa101a6fd592188d8edb20f8a23cb8f';
    sourceAuditCorrection: {
      scope: 'additional-ungated-h1-control-only';
      supersededArtifactSha256: '98303cfb62bba1d4609125425e3333e49722ddc724002a6bab46a8f6e5d34759';
      gateInputsChanged: false;
      verdictChanged: false;
    };
  };
  spec: Record<string, unknown>;
  sources: Record<ExternalReplicationSymbol, Record<Timeframe, {
    source: string;
    sha256: string;
    bars: number;
    from: string;
    to: string;
  }>>;
  qa: {
    sourceIdentityPassed: boolean;
    crossSymbolH1Aligned: boolean;
    cadence: Record<ExternalReplicationSymbol, Record<Timeframe, CadenceEvidence>>;
    causalAlignment: Record<ExternalReplicationSymbol, SignalSchedules['qa']>;
    prefixInvariance: Record<ExternalReplicationSymbol, PrefixInvariantEvidence>;
    passed: boolean;
  };
  windows: {
    full: { from: string; toExclusive: string };
    holdout: { from: string; toExclusive: string };
    folds: Array<{ label: string; from: string; toExclusive: string }>;
  };
  results: {
    symbols: Record<ExternalReplicationSymbol, SymbolInternal['publicResult']>;
    portfolio: {
      strategy: { full: PortfolioMetrics; holdout: PortfolioMetrics };
      benchmarks: {
        cashNetReturn: 0;
        spot: { full: PortfolioMetrics; holdout: PortfolioMetrics };
        perpetual: { full: PortfolioMetrics; holdout: PortfolioMetrics };
      };
      sleeveTradeCounts: {
        full: Record<ExternalReplicationSymbol, number>;
        holdout: Record<ExternalReplicationSymbol, number>;
      };
    };
  };
  decision: ReplicationDecision;
}

function alignedTimestamps(first: OHLCV[], second: OHLCV[]): boolean {
  return first.length === second.length
    && first.every((candle, index) => candle.timestamp === second[index].timestamp);
}

export function assembleExternalMultiTimeframeReplication(
  inputs: ReadonlyArray<ExternalReplicationInput>,
): ExternalMultiTimeframeArtifact {
  const bySymbol = new Map(inputs.map((input) => [input.symbol, input]));
  if (inputs.length !== EXTERNAL_REPLICATION_SYMBOLS.length || bySymbol.size !== inputs.length) {
    throw new Error('external replication requires exactly one BTCUSD and one ETHUSD input');
  }
  const ordered = EXTERNAL_REPLICATION_SYMBOLS.map((symbol) => {
    const input = bySymbol.get(symbol);
    if (!input) throw new Error(`external replication is missing ${symbol}`);
    return input;
  });

  const cadence = Object.fromEntries(ordered.map((input) => [input.symbol, {
    H1: validateAlignedSeries(input.H1.candles, 'H1'),
    D1: validateAlignedSeries(input.D1.candles, 'D1'),
  }])) as ExternalMultiTimeframeArtifact['qa']['cadence'];
  const commonH1Aligned = alignedTimestamps(ordered[0].H1.candles, ordered[1].H1.candles);
  if (!commonH1Aligned) throw new Error('BTCUSD and ETHUSD H1 timestamps must align for fixed sleeves');
  const finalH1Ts = ordered[0].H1.candles[ordered[0].H1.candles.length - 1].timestamp;
  const endExclusiveTs = finalH1Ts + HOUR_MS;
  if (EXTERNAL_REPLICATION_START_TS >= endExclusiveTs) throw new Error('research start is outside the H1 source');
  if (EXTERNAL_REPLICATION_HOLDOUT_TS >= endExclusiveTs) throw new Error('holdout start is outside the H1 source');
  for (const input of ordered) {
    const firstClosedD1 = input.D1.candles[0].timestamp + DAY_MS;
    const lastClosedD1 = input.D1.candles[input.D1.candles.length - 1].timestamp + DAY_MS;
    if (firstClosedD1 > EXTERNAL_REPLICATION_START_TS || endExclusiveTs - lastClosedD1 > DAY_MS) {
      throw new Error(`${input.symbol} has missing completed-D1 coverage for the research window`);
    }
  }

  const fullWindow: EvaluationWindow = {
    label: 'full',
    startTs: EXTERNAL_REPLICATION_START_TS,
    endExclusiveTs,
  };
  const holdoutWindow: EvaluationWindow = {
    label: 'holdout',
    startTs: EXTERNAL_REPLICATION_HOLDOUT_TS,
    endExclusiveTs,
  };
  const folds = chronologicalFolds(EXTERNAL_REPLICATION_START_TS, endExclusiveTs);
  const evaluated = Object.fromEntries(ordered.map((input) => [
    input.symbol,
    evaluateSymbol(input, fullWindow, holdoutWindow, folds, CRYPTO_PERP_COSTS),
  ])) as Record<ExternalReplicationSymbol, SymbolInternal>;

  const sourceIdentityPassed = ordered.every((input) => (
    input.H1.source === 'binance'
    && input.D1.source === 'binance'
    && input.H1.sourceSha256 === EXTERNAL_REPLICATION_EXPECTED_SHA256[input.symbol].H1
    && input.D1.sourceSha256 === EXTERNAL_REPLICATION_EXPECTED_SHA256[input.symbol].D1
  ));
  const prefixInvariance = Object.fromEntries(ordered.map((input) => [
    input.symbol,
    checkMacdPrefixInvariance(input.H1.candles, input.D1.candles),
  ])) as ExternalMultiTimeframeArtifact['qa']['prefixInvariance'];
  const causalAlignment = Object.fromEntries(EXTERNAL_REPLICATION_SYMBOLS.map((symbol) => [
    symbol,
    evaluated[symbol].schedules.qa,
  ])) as ExternalMultiTimeframeArtifact['qa']['causalAlignment'];
  const qaPassed = sourceIdentityPassed
    && commonH1Aligned
    && EXTERNAL_REPLICATION_SYMBOLS.every((symbol) => (
      cadence[symbol].H1.passed
      && cadence[symbol].D1.passed
      && causalAlignment[symbol].missingCompletedD1 === 0
      && causalAlignment[symbol].lookaheadViolations === 0
      && prefixInvariance[symbol].passed
    ));

  const finalConfig = 'd1h1-macd-negative-bar-exit' as const;
  const btcFinal = evaluated.BTCUSD.configs[finalConfig];
  const ethFinal = evaluated.ETHUSD.configs[finalConfig];
  const portfolioStrategyFullSimulation = combineSleeves(
    btcFinal.full.simulation,
    ethFinal.full.simulation,
  );
  const portfolioStrategyHoldoutSimulation = combineSleeves(
    btcFinal.holdout.simulation,
    ethFinal.holdout.simulation,
  );
  const portfolioSpotFullSimulation = combineSleeves(
    evaluated.BTCUSD.benchmarks.full.spot.simulation,
    evaluated.ETHUSD.benchmarks.full.spot.simulation,
  );
  const portfolioSpotHoldoutSimulation = combineSleeves(
    evaluated.BTCUSD.benchmarks.holdout.spot.simulation,
    evaluated.ETHUSD.benchmarks.holdout.spot.simulation,
  );
  const portfolioPerpFullSimulation = combineSleeves(
    evaluated.BTCUSD.benchmarks.full.perpetual.simulation,
    evaluated.ETHUSD.benchmarks.full.perpetual.simulation,
  );
  const portfolioPerpHoldoutSimulation = combineSleeves(
    evaluated.BTCUSD.benchmarks.holdout.perpetual.simulation,
    evaluated.ETHUSD.benchmarks.holdout.perpetual.simulation,
  );
  const portfolioRaw = {
    strategy: {
      full: rawPortfolioMetrics(portfolioStrategyFullSimulation),
      holdout: rawPortfolioMetrics(portfolioStrategyHoldoutSimulation),
    },
    spot: {
      full: rawPortfolioMetrics(portfolioSpotFullSimulation),
      holdout: rawPortfolioMetrics(portfolioSpotHoldoutSimulation),
    },
    perpetual: {
      full: rawPortfolioMetrics(portfolioPerpFullSimulation),
      holdout: rawPortfolioMetrics(portfolioPerpHoldoutSimulation),
    },
  };
  const decision = decideExternalReplication({
    btc: {
      full: btcFinal.full.raw,
      holdout: btcFinal.holdout.raw,
      folds: btcFinal.folds.map((fold) => fold.raw),
      spot: evaluated.BTCUSD.benchmarks.full.spot.raw,
    },
    eth: {
      full: ethFinal.full.raw,
      folds: ethFinal.folds.map((fold) => fold.raw),
    },
    portfolio: {
      full: portfolioRaw.strategy.full,
      holdout: portfolioRaw.strategy.holdout,
      spot: portfolioRaw.spot.full,
    },
    qaPassed,
  });

  const sources = Object.fromEntries(ordered.map((input) => [input.symbol, Object.fromEntries(
    (['H1', 'D1'] as const).map((timeframe) => {
      const series = input[timeframe];
      return [timeframe, {
        source: series.source,
        sha256: series.sourceSha256,
        bars: series.candles.length,
        from: iso(series.candles[0].timestamp),
        to: iso(series.candles[series.candles.length - 1].timestamp),
      }];
    }),
  )])) as ExternalMultiTimeframeArtifact['sources'];

  return {
    meta: {
      schemaVersion: 2,
      studyDate: '2026-08-29',
      task: 'TC-255',
      catalogCommit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
      preregistration: 'docs/plans/2026-08-29-external-multi-timeframe-replication.md',
      preregistrationSha256: '8679c1aa033b5e52f1cc6c9097ed14d34aa101a6fd592188d8edb20f8a23cb8f',
      sourceAuditCorrection: {
        scope: 'additional-ungated-h1-control-only',
        supersededArtifactSha256: '98303cfb62bba1d4609125425e3333e49722ddc724002a6bab46a8f6e5d34759',
        gateInputsChanged: false,
        verdictChanged: false,
      },
    },
    spec: {
      sourceRule: {
        indicator: 'MACD(12,26,9), SMA-seeded EMAs',
        direction: 'long-flat',
        signal: 'H1 bullish MACD crossover at close',
        entryFill: 'next contiguous H1 open',
        h1ControlAmbiguity: [
          'later article text says the D1 stage one-bar hold remains from the baseline',
          'methodology prose says the baseline exits on a bearish H1 MACD crossover',
        ],
        h1CrossExitFill: 'next available H1 open after bearish crossover',
        d1Filter: 'MACD above signal on latest D1 bar closed by H1 signal close',
        finalExit: 'first H1 close below its open',
      },
      configurations: [...EXTERNAL_REPLICATION_CONFIGS],
      universe: [...EXTERNAL_REPLICATION_SYMBOLS],
      originalReplicationMarket: 'BTCUSD',
      externalFalsificationMarket: 'ETHUSD',
      costs: { ...CRYPTO_PERP_COSTS },
      fundingAccrual: 'linear by wall-clock held hours, sign-agnostic cost',
      sizing: { kind: 'fixed-independent-sleeves', weights: { BTCUSD: 0.5, ETHUSD: 0.5 }, crossRebalancing: false },
      folds: FOLD_COUNT,
      foldMethod: 'four equal contiguous elapsed-time windows; full-history indicators; entries attributed by entry time; force-close at boundary',
      benchmarks: ['cash', 'costed-spot-buy-and-hold', 'costed-perpetual-buy-and-hold'],
      annualizationDays: ANNUALIZATION_DAYS,
      riskFreeRate: 0,
      noParameterSearch: true,
      researchOnly: true,
      erratum: {
        discovered: 'post-result primary-source wording audit',
        correction: 'retained preregistered H1 one-bar control and added bearish-MACD-crossover interpretation as an ungated sensitivity',
        gateScope: 'none; D1 one-bar and final negative-candle configurations were already correct',
        initialArtifactDisposition: 'superseded but retained by SHA-256 in metadata and result report',
      },
    },
    sources,
    qa: {
      sourceIdentityPassed,
      crossSymbolH1Aligned: commonH1Aligned,
      cadence,
      causalAlignment,
      prefixInvariance,
      passed: qaPassed,
    },
    windows: {
      full: { from: iso(fullWindow.startTs), toExclusive: iso(fullWindow.endExclusiveTs) },
      holdout: { from: iso(holdoutWindow.startTs), toExclusive: iso(holdoutWindow.endExclusiveTs) },
      folds: folds.map((fold) => ({
        label: fold.label,
        from: iso(fold.startTs),
        toExclusive: iso(fold.endExclusiveTs),
      })),
    },
    results: {
      symbols: Object.fromEntries(EXTERNAL_REPLICATION_SYMBOLS.map((symbol) => [
        symbol,
        evaluated[symbol].publicResult,
      ])) as ExternalMultiTimeframeArtifact['results']['symbols'],
      portfolio: {
        strategy: {
          full: stablePortfolioMetrics(portfolioRaw.strategy.full),
          holdout: stablePortfolioMetrics(portfolioRaw.strategy.holdout),
        },
        benchmarks: {
          cashNetReturn: 0,
          spot: {
            full: stablePortfolioMetrics(portfolioRaw.spot.full),
            holdout: stablePortfolioMetrics(portfolioRaw.spot.holdout),
          },
          perpetual: {
            full: stablePortfolioMetrics(portfolioRaw.perpetual.full),
            holdout: stablePortfolioMetrics(portfolioRaw.perpetual.holdout),
          },
        },
        sleeveTradeCounts: {
          full: {
            BTCUSD: btcFinal.full.raw.completedTrades,
            ETHUSD: ethFinal.full.raw.completedTrades,
          },
          holdout: {
            BTCUSD: btcFinal.holdout.raw.completedTrades,
            ETHUSD: ethFinal.holdout.raw.completedTrades,
          },
        },
      },
    },
    decision,
  };
}

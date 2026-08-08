/**
 * Pure, deterministic assembly for the preregistered D1 slow-gate validation.
 * No file, clock, network, database, or environment access belongs here.
 */

import crypto from 'crypto';
import type { OHLCV } from '@tradeclaw/core';
import {
  CRYPTO_PERP_COSTS,
  D1_SLOW_GATE_ATR_PERIOD,
  D1_SLOW_GATE_BASE_ATR_MULTIPLIER,
  D1_SLOW_GATE_EMA_PERIOD,
  D1_SLOW_GATE_MAX_COST_R,
  D1_SLOW_GATE_MAX_DIRECTION_CHANGES,
  D1_SLOW_GATE_STOP_FLOOR_PCT,
  d1SlowGateEmaSeries,
  runD1SlowGate,
  type CostModel,
  type D1SlowGateRun,
} from '@tradeclaw/strategies';

const DAY_MS = 86_400_000;
const FOLD_COUNT = 4;
const CALMAR_REQUIRED_FOLDS = 3;

export const D1_SLOW_GATE_WALK_FORWARD_START_TS = Date.UTC(2017, 8, 1);
export const D1_SLOW_GATE_WALK_FORWARD_END_TS = Date.UTC(2026, 6, 16);
export const D1_SLOW_GATE_WALK_FORWARD_SYMBOLS = ['BTCUSD', 'ETHUSD'] as const;
export type D1SlowGateWalkForwardSymbol = (typeof D1_SLOW_GATE_WALK_FORWARD_SYMBOLS)[number];

export const D1_SLOW_GATE_EXPECTED_SOURCE_SHA256: Record<D1SlowGateWalkForwardSymbol, string> = {
  BTCUSD: 'e8ffc544670131dccb0a0717e45ac6504c2666d5e060755ebc546a711c669a91',
  ETHUSD: 'eeee00aed94d5f51be5e315427c935e41519bab693726c62a0d1d1d209f91ed7',
};

export const D1_SLOW_GATE_EXPECTED_RECONCILIATION: Record<D1SlowGateWalkForwardSymbol, number> = {
  BTCUSD: 86,
  ETHUSD: 64,
};

function round(value: number, digits = 8): number {
  return Number(value.toFixed(digits));
}

function isoDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export interface D1SeriesBoundary {
  startTs: number;
  endTs: number;
}

/** Fail-closed validation for closed UTC-D1 OHLCV and the requested boundaries. */
export function validateD1Series(candles: OHLCV[], boundary: D1SeriesBoundary): void {
  if (candles.length === 0) throw new Error('D1 series is empty');
  if (candles[0].timestamp !== boundary.startTs) {
    throw new Error(`D1 start boundary is missing: expected ${isoDay(boundary.startTs)}`);
  }
  if (candles[candles.length - 1].timestamp !== boundary.endTs) {
    throw new Error(`D1 end boundary is missing: expected ${isoDay(boundary.endTs)}`);
  }

  for (let index = 0; index < candles.length; index++) {
    const candle = candles[index];
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp % DAY_MS !== 0) {
      throw new Error(`D1 bar ${index} is not a safe UTC-day timestamp`);
    }
    if (index > 0) {
      const gap = candle.timestamp - candles[index - 1].timestamp;
      if (gap <= 0) throw new Error(`D1 timestamps are not strictly increasing at bar ${index}`);
      if (gap > 2 * DAY_MS) throw new Error(`D1 gap exceeds 48 hours at bar ${index}`);
    }
    for (const [field, value] of Object.entries({
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`D1 bar ${index} ${field} must be finite and positive`);
      }
    }
    if (
      candle.high < candle.low ||
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    ) {
      throw new Error(`D1 bar ${index} has an invalid OHLC range`);
    }
    if (!Number.isFinite(candle.volume) || candle.volume < 0) {
      throw new Error(`D1 bar ${index} volume must be finite and non-negative`);
    }
  }
}

/** Original sandbox definition: changes in close>EMA200 exposure, no stops. */
export function countNoStopDirectionChanges(candles: OHLCV[]): number {
  const ema = d1SlowGateEmaSeries(candles.map((candle) => candle.close));
  let previous = false;
  let changes = 0;
  for (let index = 0; index < candles.length; index++) {
    const current = ema[index] !== null && candles[index].close > ema[index]!;
    if (current !== previous) changes += 1;
    previous = current;
  }
  return changes;
}

export interface CurveResult {
  equity: number[];
  totalCostPct: number;
}

/** Buy-and-hold enters at the first bar close and exits at the final bar close. */
export function buyAndHoldCurve(candles: OHLCV[], costs: CostModel): CurveResult {
  if (candles.length === 0) throw new Error('buy-and-hold requires candles');
  const sideCost = (costs.feePctPerSide + costs.slippagePctPerSide) / 100;
  const fundingPerDay = (costs.fundingPctPer8h * 3) / 100;
  const equity = new Array<number>(candles.length).fill(1);
  let value = 1 - sideCost;
  let totalCostPct = costs.feePctPerSide + costs.slippagePctPerSide;
  equity[0] = value;

  for (let index = 1; index < candles.length; index++) {
    value *= candles[index].close / candles[index - 1].close;
    value *= 1 - fundingPerDay;
    totalCostPct += costs.fundingPctPer8h * 3;
    equity[index] = value;
  }

  value *= 1 - sideCost;
  totalCostPct += costs.feePctPerSide + costs.slippagePctPerSide;
  equity[equity.length - 1] = value;
  return { equity, totalCostPct };
}

/**
 * Rebase a slice of a continuous curve using the immediately preceding state.
 * Every multiplicative factor belongs to exactly one fold; positions and
 * indicators are never restarted at boundaries.
 */
export function continuousFoldCurve(
  fullCurve: number[],
  start: number,
  endExclusive: number,
): number[] {
  if (
    !Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive) ||
    start < 0 || endExclusive <= start || endExclusive > fullCurve.length
  ) {
    throw new Error('continuous fold indices must define a non-empty in-range slice');
  }
  if (!fullCurve.every((point) => Number.isFinite(point) && point > 0)) {
    throw new Error('continuous fold curve must be finite and positive');
  }
  const base = start === 0 ? 1 : fullCurve[start - 1];
  return [1, ...fullCurve.slice(start, endExclusive).map((point) => point / base)];
}

export function combineFixedSleeves(first: number[], second: number[]): number[] {
  if (first.length !== second.length || first.length === 0) {
    throw new Error('fixed sleeves must align and be non-empty');
  }
  return first.map((value, index) => 0.5 * value + 0.5 * second[index]);
}

export interface StableMetrics {
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  calmar: number | null;
  years: number;
}

interface RawMetrics extends StableMetrics {}

function rawMetrics(curve: number[], performanceDays: number): RawMetrics {
  if (curve.length < 2 || performanceDays <= 0) {
    throw new Error('metric curve requires at least one performance factor');
  }
  const terminal = curve[curve.length - 1];
  if (!curve.every((point) => Number.isFinite(point) && point > 0)) {
    throw new Error('metric curve must be finite and positive');
  }
  const years = performanceDays / 365;
  const totalReturn = terminal - 1;
  const cagr = Math.pow(terminal, 1 / years) - 1;
  let peak = curve[0];
  let maxDrawdown = 0;
  for (const point of curve) {
    peak = Math.max(peak, point);
    maxDrawdown = Math.max(maxDrawdown, 1 - point / peak);
  }
  return {
    totalReturn,
    cagr,
    maxDrawdown,
    calmar: maxDrawdown > 0 ? cagr / maxDrawdown : null,
    years,
  };
}

function stableMetrics(metrics: RawMetrics): StableMetrics {
  return {
    totalReturn: round(metrics.totalReturn),
    cagr: round(metrics.cagr),
    maxDrawdown: round(metrics.maxDrawdown),
    calmar: metrics.calmar === null ? null : round(metrics.calmar),
    years: round(metrics.years),
  };
}

interface FoldRange {
  label: string;
  start: number;
  endExclusive: number;
}

function foldRanges(length: number): FoldRange[] {
  const foldSize = Math.floor(length / FOLD_COUNT);
  if (foldSize < 2) throw new Error(`need at least ${FOLD_COUNT * 2} bars for four folds`);
  return Array.from({ length: FOLD_COUNT }, (_, index) => ({
    label: `fold${index + 1}`,
    start: index * foldSize,
    endExclusive: index === FOLD_COUNT - 1 ? length : (index + 1) * foldSize,
  }));
}

export interface PrefixCheckpoint {
  bars: number;
  through: string;
  transitions: number;
  transitionSha256: string;
  equitySha256: string;
  passed: boolean;
}

export interface PrefixInvariantEvidence {
  passed: boolean;
  checkpoints: PrefixCheckpoint[];
}

/** Fixed quartile checkpoints plus the penultimate bar; no future data may rewrite them. */
export function checkPrefixInvariance(
  candles: OHLCV[],
  symbol: D1SlowGateWalkForwardSymbol,
): PrefixInvariantEvidence {
  if (candles.length <= D1_SLOW_GATE_EMA_PERIOD + 2) {
    throw new Error('prefix QA requires EMA warmup plus validation bars');
  }
  const full = runD1SlowGate(candles, { symbol, timeframe: 'D1' });
  const minimum = D1_SLOW_GATE_EMA_PERIOD + 1;
  const requested = [0.25, 0.5, 0.75, 1]
    .map((fraction, index) => (
      index === 3
        ? candles.length - 1
        : Math.max(minimum, Math.floor(candles.length * fraction))
    ));
  const lengths = [...new Set(requested)].filter((length) => length >= minimum && length < candles.length);
  const checkpoints = lengths.map((bars) => {
    const prefix = runD1SlowGate(candles.slice(0, bars), { symbol, timeframe: 'D1' });
    const fullTransitions = full.transitions.filter((transition) => transition.barIndex < bars);
    const fullEquity = full.equity.slice(0, bars);
    const fullExposure = full.exposure.slice(0, bars);
    const transitionMatch = JSON.stringify(prefix.transitions) === JSON.stringify(fullTransitions);
    const equityMatch = JSON.stringify(prefix.equity) === JSON.stringify(fullEquity);
    const exposureMatch = JSON.stringify(prefix.exposure) === JSON.stringify(fullExposure);
    return {
      bars,
      through: isoDay(candles[bars - 1].timestamp),
      transitions: prefix.transitions.length,
      transitionSha256: digest(prefix.transitions),
      equitySha256: digest(prefix.equity),
      passed: transitionMatch && equityMatch && exposureMatch,
    };
  });
  return { passed: checkpoints.length === 4 && checkpoints.every((item) => item.passed), checkpoints };
}

export interface DecisionInputs {
  qaPassed: boolean;
  portfolioTotalReturn: number;
  calmarFoldPasses: number;
  frequencyPassed: boolean;
}

export interface WalkForwardDecision {
  conditions: {
    qaPassed: boolean;
    positivePortfolioNetReturn: boolean;
    calmarAtLeastBenchmarkInThreeOfFourFolds: boolean;
    frequencyCeilingPassed: boolean;
  };
  calmarFoldPasses: number;
  verdict: 'PASS' | 'KILL';
  reasons: string[];
  activationApproved: false;
  lane: 'simulated';
}

export function decideD1SlowGateWalkForward(input: DecisionInputs): WalkForwardDecision {
  const conditions = {
    qaPassed: input.qaPassed,
    positivePortfolioNetReturn: input.portfolioTotalReturn > 0,
    calmarAtLeastBenchmarkInThreeOfFourFolds: input.calmarFoldPasses >= CALMAR_REQUIRED_FOLDS,
    frequencyCeilingPassed: input.frequencyPassed,
  };
  const reasons: string[] = [];
  if (!conditions.qaPassed) reasons.push('standing QA gate failed');
  if (!conditions.positivePortfolioNetReturn) reasons.push('50/50 full-window net return is not positive');
  if (!conditions.calmarAtLeastBenchmarkInThreeOfFourFolds) {
    reasons.push(`strategy Calmar met/exceeded buy-and-hold in ${input.calmarFoldPasses}/4 folds (need 3/4)`);
  }
  if (!conditions.frequencyCeilingPassed) reasons.push('rolling direction-change ceiling breached');
  const verdict = Object.values(conditions).every(Boolean) ? 'PASS' : 'KILL';
  return {
    conditions,
    calmarFoldPasses: input.calmarFoldPasses,
    verdict,
    reasons,
    activationApproved: false,
    lane: 'simulated',
  };
}

export interface WalkForwardInput {
  symbol: D1SlowGateWalkForwardSymbol;
  sourceSha256: string;
  candles: OHLCV[];
}

interface FoldMetricsInternal {
  label: string;
  from: string;
  to: string;
  performanceDays: number;
  strategy: StableMetrics;
  benchmark: StableMetrics;
  strategyRaw: RawMetrics;
  benchmarkRaw: RawMetrics;
}

interface SymbolInternal {
  publicResult: {
    bars: number;
    from: string;
    to: string;
    full: { strategy: StableMetrics; benchmark: StableMetrics };
    folds: Array<Omit<FoldMetricsInternal, 'strategyRaw' | 'benchmarkRaw'>>;
    directionChanges: {
      originalNoStop: number;
      withStops: number;
      maxRolling365d: number;
      ceiling: number;
      passed: boolean;
    };
    transitionActions: { ENTER_LONG: number; EXIT_GATE: number; EXIT_STOP: number };
    stopAudit: { entries: number; maxCostR: number | null; allAtOrBelowPointOneR: boolean };
    totalCostPct: { strategy: number; benchmark: number };
  };
  strategyCurve: number[];
  benchmarkCurve: number[];
  folds: FoldMetricsInternal[];
  run: D1SlowGateRun;
}

function terminalStrategyCurve(run: D1SlowGateRun): number[] {
  const curve = [...run.equity];
  if (curve.length === 0) throw new Error('strategy produced an empty equity curve');
  curve[curve.length - 1] = run.terminalEquity;
  return curve;
}

function calmarAtLeast(strategy: RawMetrics, benchmark: RawMetrics): boolean {
  if (strategy.calmar !== null && benchmark.calmar !== null) {
    return strategy.calmar >= benchmark.calmar;
  }
  if (strategy.calmar === null && strategy.maxDrawdown === 0 && strategy.cagr >= 0) {
    return !(benchmark.calmar === null && benchmark.maxDrawdown === 0 && benchmark.cagr > strategy.cagr);
  }
  return false;
}

function evaluateSymbol(input: WalkForwardInput): SymbolInternal {
  const candles = input.candles;
  const run = runD1SlowGate(candles, { symbol: input.symbol, timeframe: 'D1' });
  const strategyCurve = terminalStrategyCurve(run);
  const benchmark = buyAndHoldCurve(candles, CRYPTO_PERP_COSTS);
  const ranges = foldRanges(candles.length);
  const fullStrategyRaw = rawMetrics(continuousFoldCurve(strategyCurve, 0, candles.length), candles.length);
  const fullBenchmarkRaw = rawMetrics(continuousFoldCurve(benchmark.equity, 0, candles.length), candles.length);
  const folds = ranges.map((range) => {
    const performanceDays = range.endExclusive - range.start;
    const strategyRaw = rawMetrics(
      continuousFoldCurve(strategyCurve, range.start, range.endExclusive),
      performanceDays,
    );
    const benchmarkRaw = rawMetrics(
      continuousFoldCurve(benchmark.equity, range.start, range.endExclusive),
      performanceDays,
    );
    return {
      label: range.label,
      from: isoDay(candles[range.start].timestamp),
      to: isoDay(candles[range.endExclusive - 1].timestamp),
      performanceDays,
      strategy: stableMetrics(strategyRaw),
      benchmark: stableMetrics(benchmarkRaw),
      strategyRaw,
      benchmarkRaw,
    };
  });

  const actionCounts = { ENTER_LONG: 0, EXIT_GATE: 0, EXIT_STOP: 0 };
  for (const transition of run.transitions) actionCounts[transition.action] += 1;
  const entryCostR = run.transitions
    .filter((transition) => transition.action === 'ENTER_LONG')
    .map((transition) => transition.costR)
    .filter((value): value is number => value !== undefined);

  return {
    publicResult: {
      bars: candles.length,
      from: isoDay(candles[0].timestamp),
      to: isoDay(candles[candles.length - 1].timestamp),
      full: {
        strategy: stableMetrics(fullStrategyRaw),
        benchmark: stableMetrics(fullBenchmarkRaw),
      },
      folds: folds.map(({ strategyRaw: _strategyRaw, benchmarkRaw: _benchmarkRaw, ...fold }) => fold),
      directionChanges: {
        originalNoStop: countNoStopDirectionChanges(candles),
        withStops: run.transitions.length,
        maxRolling365d: run.maxRollingDirectionChanges,
        ceiling: D1_SLOW_GATE_MAX_DIRECTION_CHANGES,
        passed: run.frequencyCapPassed,
      },
      transitionActions: actionCounts,
      stopAudit: {
        entries: entryCostR.length,
        maxCostR: entryCostR.length > 0 ? round(Math.max(...entryCostR)) : null,
        allAtOrBelowPointOneR: entryCostR.every((value) => value <= D1_SLOW_GATE_MAX_COST_R + 1e-12),
      },
      totalCostPct: {
        strategy: round(run.totalCostPct),
        benchmark: round(benchmark.totalCostPct),
      },
    },
    strategyCurve,
    benchmarkCurve: benchmark.equity,
    folds,
    run,
  };
}

export interface D1SlowGateWalkForwardArtifact {
  meta: {
    schemaVersion: 1;
    studyDate: '2026-08-08';
    preregistrationCommit: 'c8785b25';
  };
  spec: Record<string, unknown>;
  sources: Record<D1SlowGateWalkForwardSymbol, {
    sha256: string;
    bars: number;
    from: string;
    to: string;
  }>;
  qa: {
    reconciliation: Record<D1SlowGateWalkForwardSymbol, { expected: number; actual: number; passed: boolean }>;
    lookahead: Record<D1SlowGateWalkForwardSymbol, PrefixInvariantEvidence>;
    cadence: Record<D1SlowGateWalkForwardSymbol, { passed: true; maxGapHours: number; utcAligned: true; endBoundaryPresent: true }>;
    passed: boolean;
  };
  results: {
    symbols: Record<D1SlowGateWalkForwardSymbol, SymbolInternal['publicResult']>;
    portfolio: {
      weights: { BTCUSD: 0.5; ETHUSD: 0.5 };
      full: { strategy: StableMetrics; benchmark: StableMetrics };
      folds: Array<{
        label: string;
        from: string;
        to: string;
        performanceDays: number;
        strategy: StableMetrics;
        benchmark: StableMetrics;
        calmarAtLeastBenchmark: boolean;
      }>;
    };
  };
  decision: WalkForwardDecision;
}

export function assembleD1SlowGateWalkForward(
  inputs: ReadonlyArray<WalkForwardInput>,
): D1SlowGateWalkForwardArtifact {
  const bySymbol = new Map(inputs.map((input) => [input.symbol, input]));
  if (inputs.length !== D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.length || bySymbol.size !== inputs.length) {
    throw new Error('walk-forward requires exactly one BTCUSD and one ETHUSD input');
  }

  const ordered = D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => {
    const input = bySymbol.get(symbol);
    if (!input) throw new Error(`walk-forward input missing ${symbol}`);
    if (!/^[a-f0-9]{64}$/.test(input.sourceSha256)) {
      throw new Error(`${symbol} source SHA-256 must be 64 lowercase hex characters`);
    }
    validateD1Series(input.candles, {
      startTs: D1_SLOW_GATE_WALK_FORWARD_START_TS,
      endTs: D1_SLOW_GATE_WALK_FORWARD_END_TS,
    });
    if (input.candles.length < D1_SLOW_GATE_EMA_PERIOD + 100) {
      throw new Error(`${symbol} has insufficient EMA warmup/evaluation bars`);
    }
    return input;
  });

  const timestamps = ordered[0].candles.map((candle) => candle.timestamp);
  if (JSON.stringify(timestamps) !== JSON.stringify(ordered[1].candles.map((candle) => candle.timestamp))) {
    throw new Error('BTCUSD and ETHUSD D1 timestamps must align for fixed sleeves');
  }

  const evaluated = Object.fromEntries(
    ordered.map((input) => [input.symbol, evaluateSymbol(input)]),
  ) as Record<D1SlowGateWalkForwardSymbol, SymbolInternal>;

  const portfolioStrategy = combineFixedSleeves(
    evaluated.BTCUSD.strategyCurve,
    evaluated.ETHUSD.strategyCurve,
  );
  const portfolioBenchmark = combineFixedSleeves(
    evaluated.BTCUSD.benchmarkCurve,
    evaluated.ETHUSD.benchmarkCurve,
  );
  const ranges = foldRanges(timestamps.length);
  const portfolioStrategyFullRaw = rawMetrics(
    continuousFoldCurve(portfolioStrategy, 0, portfolioStrategy.length),
    portfolioStrategy.length,
  );
  const portfolioBenchmarkFullRaw = rawMetrics(
    continuousFoldCurve(portfolioBenchmark, 0, portfolioBenchmark.length),
    portfolioBenchmark.length,
  );
  const portfolioFolds = ranges.map((range) => {
    const performanceDays = range.endExclusive - range.start;
    const strategyRaw = rawMetrics(
      continuousFoldCurve(portfolioStrategy, range.start, range.endExclusive),
      performanceDays,
    );
    const benchmarkRaw = rawMetrics(
      continuousFoldCurve(portfolioBenchmark, range.start, range.endExclusive),
      performanceDays,
    );
    return {
      label: range.label,
      from: isoDay(timestamps[range.start]),
      to: isoDay(timestamps[range.endExclusive - 1]),
      performanceDays,
      strategy: stableMetrics(strategyRaw),
      benchmark: stableMetrics(benchmarkRaw),
      calmarAtLeastBenchmark: calmarAtLeast(strategyRaw, benchmarkRaw),
    };
  });

  const reconciliation = Object.fromEntries(D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => {
    const actual = evaluated[symbol].publicResult.directionChanges.originalNoStop;
    const expected = D1_SLOW_GATE_EXPECTED_RECONCILIATION[symbol];
    return [symbol, { expected, actual, passed: actual === expected }];
  })) as D1SlowGateWalkForwardArtifact['qa']['reconciliation'];

  const lookahead = Object.fromEntries(D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => [
    symbol,
    checkPrefixInvariance(bySymbol.get(symbol)!.candles, symbol),
  ])) as D1SlowGateWalkForwardArtifact['qa']['lookahead'];

  const cadence = Object.fromEntries(D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => {
    const candles = bySymbol.get(symbol)!.candles;
    let maxGapMs = 0;
    for (let index = 1; index < candles.length; index++) {
      maxGapMs = Math.max(maxGapMs, candles[index].timestamp - candles[index - 1].timestamp);
    }
    return [symbol, {
      passed: true as const,
      maxGapHours: maxGapMs / 3_600_000,
      utcAligned: true as const,
      endBoundaryPresent: true as const,
    }];
  })) as D1SlowGateWalkForwardArtifact['qa']['cadence'];

  const qaPassed = D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.every((symbol) => (
    reconciliation[symbol].passed && lookahead[symbol].passed && cadence[symbol].passed
  ));
  const calmarFoldPasses = portfolioFolds.filter((fold) => fold.calmarAtLeastBenchmark).length;
  const frequencyPassed = D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.every(
    (symbol) => evaluated[symbol].run.frequencyCapPassed,
  );
  const decision = decideD1SlowGateWalkForward({
    qaPassed,
    portfolioTotalReturn: portfolioStrategyFullRaw.totalReturn,
    calmarFoldPasses,
    frequencyPassed,
  });

  const sources = Object.fromEntries(ordered.map((input) => [input.symbol, {
    sha256: input.sourceSha256,
    bars: input.candles.length,
    from: isoDay(input.candles[0].timestamp),
    to: isoDay(input.candles[input.candles.length - 1].timestamp),
  }])) as D1SlowGateWalkForwardArtifact['sources'];

  const symbols = Object.fromEntries(D1_SLOW_GATE_WALK_FORWARD_SYMBOLS.map((symbol) => [
    symbol,
    evaluated[symbol].publicResult,
  ])) as D1SlowGateWalkForwardArtifact['results']['symbols'];

  return {
    meta: {
      schemaVersion: 1,
      studyDate: '2026-08-08',
      preregistrationCommit: 'c8785b25',
    },
    spec: {
      universe: [...D1_SLOW_GATE_WALK_FORWARD_SYMBOLS],
      timeframe: 'D1',
      from: isoDay(D1_SLOW_GATE_WALK_FORWARD_START_TS),
      to: isoDay(D1_SLOW_GATE_WALK_FORWARD_END_TS),
      gate: { rule: 'close > EMA200', emaPeriod: D1_SLOW_GATE_EMA_PERIOD, direction: 'long-flat' },
      sizing: { kind: 'fixed-independent-sleeves', weights: { BTCUSD: 0.5, ETHUSD: 0.5 }, crossRebalancing: false },
      stop: {
        atrPeriod: D1_SLOW_GATE_ATR_PERIOD,
        baseAtrMultiplier: D1_SLOW_GATE_BASE_ATR_MULTIPLIER,
        minimumDistancePct: round(D1_SLOW_GATE_STOP_FLOOR_PCT * 100),
        maximumModeledCostR: D1_SLOW_GATE_MAX_COST_R,
        gapFill: 'min(stop, bar open)',
        reentry: 'flat close then new long cross',
      },
      takeProfit: null,
      costs: { ...CRYPTO_PERP_COSTS },
      folds: FOLD_COUNT,
      foldMethod: 'continuous-state factors assigned once, rebased to 1; no boundary restart or forced exit',
      benchmark: 'buy-and-hold with identical entry/exit/funding costs',
      frequencyCeiling: { directionChanges: D1_SLOW_GATE_MAX_DIRECTION_CHANGES, rollingDays: 365 },
      decisionRule: 'PASS iff QA passes, full 50/50 net return > 0, strategy Calmar >= benchmark in >=3/4 folds, and frequency ceilings pass',
    },
    sources,
    qa: { reconciliation, lookahead, cadence, passed: qaPassed },
    results: {
      symbols,
      portfolio: {
        weights: { BTCUSD: 0.5, ETHUSD: 0.5 },
        full: {
          strategy: stableMetrics(portfolioStrategyFullRaw),
          benchmark: stableMetrics(portfolioBenchmarkFullRaw),
        },
        folds: portfolioFolds,
      },
    },
    decision,
  };
}

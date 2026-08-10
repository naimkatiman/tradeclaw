import { createHash } from 'node:crypto';
import type { D1SlowGateAction } from '@tradeclaw/strategies';

export const D1_ALPHA_DAY_MS = 86_400_000;
export const D1_ALPHA_STRATEGY_VERSION = 'd1-slow-gate-v1-2026-08-09' as const;
export const D1_ALPHA_RULE_SHA256 =
  'a9c222a33f3e1e0c70e8fb5f0bfa930dc6433297d9dcb27ef2b825f08da3b171' as const;
export const D1_ALPHA_ARTIFACT_SHA256 =
  '1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90' as const;
export const D1_ALPHA_DATA_SOURCE = 'binance' as const;

export const D1_ALPHA_MIN_CALENDAR_DAYS = 365;
export const D1_ALPHA_MIN_SNAPSHOTS = 365;
export const D1_ALPHA_MIN_CLOSED_TRADES = 12;

export const D1_ALPHA_FEE_PCT_PER_SIDE = 0.05;
export const D1_ALPHA_SLIPPAGE_PCT_PER_SIDE = 0.15;
export const D1_ALPHA_FUNDING_PCT_PER_8H = 0.01;
export const D1_ALPHA_MAX_DIRECTION_CHANGES = 30;
export const D1_ALPHA_FREQUENCY_WINDOW_MS = 365 * D1_ALPHA_DAY_MS;
export const D1_ALPHA_COST_MODEL = Object.freeze({
  feePctPerSide: D1_ALPHA_FEE_PCT_PER_SIDE,
  slippagePctPerSide: D1_ALPHA_SLIPPAGE_PCT_PER_SIDE,
  fundingPctPer8h: D1_ALPHA_FUNDING_PCT_PER_8H,
});

/** Frozen crypto-perpetual assumptions: 0.05% fee + 0.15% slippage per side. */
export const D1_ALPHA_SIDE_COST_FRACTION =
  (D1_ALPHA_FEE_PCT_PER_SIDE + D1_ALPHA_SLIPPAGE_PCT_PER_SIDE) / 100;
/** Frozen funding assumption: 0.01% every eight hours, three times per day. */
export const D1_ALPHA_DAILY_FUNDING_FRACTION =
  (D1_ALPHA_FUNDING_PCT_PER_8H * 3) / 100;

export type D1AlphaSymbol = 'BTCUSD' | 'ETHUSD';
export type D1AlphaPosition = 'FLAT' | 'LONG';
export type D1AlphaStatus = 'collecting-evidence' | 'eligible-for-review' | 'failed-gate';

export interface D1AlphaTransitionObservation {
  action: D1SlowGateAction;
  price: number;
}

export interface D1AlphaSymbolObservation {
  symbol: D1AlphaSymbol;
  source: string;
  close: number;
  engineExposure: 0 | 1;
  transition: D1AlphaTransitionObservation | null;
}

export interface D1AlphaObservation {
  barTimestamp: number;
  symbols: Record<D1AlphaSymbol, D1AlphaSymbolObservation>;
}

export interface D1AlphaSleeveSnapshot {
  source: string;
  close: number;
  engineExposure: 0 | 1;
  transition: D1AlphaTransitionObservation | null;
  prospectivePosition: D1AlphaPosition;
  synchronized: boolean;
  strategyNav: number;
  benchmarkNav: number;
}

export interface D1AlphaSnapshotPayload {
  schemaVersion: 1;
  strategyVersion: typeof D1_ALPHA_STRATEGY_VERSION;
  ruleSha256: typeof D1_ALPHA_RULE_SHA256;
  artifactSha256: typeof D1_ALPHA_ARTIFACT_SHA256;
  barTimestamp: number;
  btc: D1AlphaSleeveSnapshot;
  eth: D1AlphaSleeveSnapshot;
  strategyPortfolioNav: number;
  benchmarkPortfolioNav: number;
  strategyLiquidationNav: number;
  benchmarkLiquidationNav: number;
  strategyCostIncrement: number;
  strategyFundingIncrement: number;
  benchmarkCostIncrement: number;
  benchmarkFundingIncrement: number;
  closedTradesIncrement: number;
}

export interface D1AlphaHashedSnapshot {
  payload: D1AlphaSnapshotPayload;
  previousHash: string | null;
  rowHash: string;
}

export interface D1AlphaMetrics {
  strategyNetReturn: number;
  benchmarkNetReturn: number;
  activeReturn: number;
  strategyMaxDrawdown: number;
  benchmarkMaxDrawdown: number;
  strategyCalmar: number | null;
  benchmarkCalmar: number | null;
  calendarDays: number;
  snapshots: number;
  closedTrades: number;
}

export interface D1AlphaGateEvaluation {
  status: D1AlphaStatus;
  observationMinimumMet: boolean;
  performanceGateEvaluated: boolean;
  observationChecks: {
    calendarDays: boolean;
    snapshots: boolean;
    closedTrades: boolean;
    cadence: boolean;
    integrity: boolean;
  };
  performanceChecks: {
    positiveStrategyReturn: boolean | null;
    positiveActiveReturn: boolean | null;
    drawdownNoWorse: boolean | null;
    calmarNoWorse: boolean | null;
  };
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and positive`);
  }
}

function roundLedgerNumber(value: number): number {
  if (!Number.isFinite(value)) throw new Error('ledger value must be finite');
  return Math.round(value * 1e12) / 1e12;
}

function validateTransition(
  transition: D1AlphaTransitionObservation | null,
  label: string,
): void {
  if (transition === null) return;
  if (!['ENTER_LONG', 'EXIT_GATE', 'EXIT_STOP'].includes(transition.action)) {
    throw new Error(`${label} transition action is invalid`);
  }
  assertFinitePositive(transition.price, `${label} transition price`);
}

export function validateD1AlphaObservation(observation: D1AlphaObservation): void {
  if (
    !Number.isSafeInteger(observation.barTimestamp)
    || observation.barTimestamp <= 0
    || observation.barTimestamp % D1_ALPHA_DAY_MS !== 0
  ) {
    throw new Error('D1 alpha bar timestamp must be a positive UTC-day safe integer');
  }

  for (const symbol of ['BTCUSD', 'ETHUSD'] as const) {
    const sleeve = observation.symbols[symbol];
    if (!sleeve || sleeve.symbol !== symbol) {
      throw new Error(`D1 alpha observation is missing ${symbol}`);
    }
    if (sleeve.source !== D1_ALPHA_DATA_SOURCE) {
      throw new Error(`${symbol} source must remain ${D1_ALPHA_DATA_SOURCE}`);
    }
    assertFinitePositive(sleeve.close, `${symbol} close`);
    if (sleeve.engineExposure !== 0 && sleeve.engineExposure !== 1) {
      throw new Error(`${symbol} engine exposure must be 0 or 1`);
    }
    validateTransition(sleeve.transition, symbol);
    if (sleeve.transition?.action === 'ENTER_LONG' && sleeve.engineExposure !== 1) {
      throw new Error(`${symbol} ENTER_LONG did not produce engine exposure`);
    }
    if (
      (sleeve.transition?.action === 'EXIT_GATE' || sleeve.transition?.action === 'EXIT_STOP')
      && sleeve.engineExposure !== 0
    ) {
      throw new Error(`${symbol} exit did not produce flat engine exposure`);
    }
  }
}

function canonicalise(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalise);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalise((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function canonicalD1AlphaPayload(payload: D1AlphaSnapshotPayload): string {
  return JSON.stringify(canonicalise(payload));
}

export function hashD1AlphaSnapshot(
  payload: D1AlphaSnapshotPayload,
  previousHash: string | null,
): string {
  return createHash('sha256')
    .update(`${previousHash ?? 'GENESIS'}\n${canonicalD1AlphaPayload(payload)}`)
    .digest('hex');
}

function initialSleeve(
  observation: D1AlphaSymbolObservation,
): D1AlphaSleeveSnapshot {
  const benchmarkBeforeCost = 0.5;
  return {
    source: observation.source,
    close: roundLedgerNumber(observation.close),
    engineExposure: observation.engineExposure,
    transition: observation.transition
      ? { ...observation.transition, price: roundLedgerNumber(observation.transition.price) }
      : null,
    // The epoch is deliberately flat. A transition on this boundary is audit-only.
    prospectivePosition: 'FLAT',
    // If the historical engine is also flat, state alignment is already known.
    // If it is long, wait for an observed exit and later entry; never inherit it.
    synchronized: observation.engineExposure === 0,
    strategyNav: 0.5,
    benchmarkNav: roundLedgerNumber(benchmarkBeforeCost * (1 - D1_ALPHA_SIDE_COST_FRACTION)),
  };
}

function advanceStrategySleeve(
  previous: D1AlphaSleeveSnapshot,
  observation: D1AlphaSymbolObservation,
): {
  snapshot: D1AlphaSleeveSnapshot;
  cost: number;
  funding: number;
  closedTrades: number;
} {
  const transition = observation.transition;
  let nav = previous.strategyNav;
  let position = previous.prospectivePosition;
  let synchronized = previous.synchronized;
  let cost = 0;
  let funding = 0;
  let closedTrades = 0;

  if (position === 'LONG') {
    if (transition?.action === 'ENTER_LONG') {
      throw new Error(`${observation.symbol} emitted ENTER_LONG while prospectively long`);
    }
    const exitPrice = transition?.action === 'EXIT_STOP'
      ? transition.price
      : observation.close;
    const gross = nav * (exitPrice / previous.close);
    funding = gross * D1_ALPHA_DAILY_FUNDING_FRACTION;
    nav = gross - funding;

    if (transition?.action === 'EXIT_GATE' || transition?.action === 'EXIT_STOP') {
      cost = nav * D1_ALPHA_SIDE_COST_FRACTION;
      nav -= cost;
      position = 'FLAT';
      closedTrades = 1;
    } else if (observation.engineExposure !== 1) {
      throw new Error(`${observation.symbol} prospective/engine exposure diverged while long`);
    }
  } else if (transition?.action === 'ENTER_LONG') {
    if (observation.engineExposure !== 1) {
      throw new Error(`${observation.symbol} ENTER_LONG did not produce engine exposure`);
    }
    cost = nav * D1_ALPHA_SIDE_COST_FRACTION;
    nav -= cost;
    position = 'LONG';
    synchronized = true;
  } else if (synchronized) {
    if (transition?.action === 'EXIT_GATE' || transition?.action === 'EXIT_STOP') {
      throw new Error(`${observation.symbol} emitted a second exit while prospectively flat`);
    }
    if (observation.engineExposure !== 0) {
      throw new Error(`${observation.symbol} prospective/engine exposure diverged while flat`);
    }
  } else if (transition?.action === 'EXIT_GATE' || transition?.action === 'EXIT_STOP') {
    // The inherited historical position has now closed without creating a
    // prospective trade. Both state machines are provably flat from here.
    synchronized = true;
  } else if (observation.engineExposure === 0) {
    throw new Error(`${observation.symbol} historical engine exposure changed without an exit`);
  }

  return {
    snapshot: {
      source: observation.source,
      close: roundLedgerNumber(observation.close),
      engineExposure: observation.engineExposure,
      transition: transition
        ? { ...transition, price: roundLedgerNumber(transition.price) }
        : null,
      prospectivePosition: position,
      synchronized,
      strategyNav: roundLedgerNumber(nav),
      benchmarkNav: 0, // Filled by advanceBenchmarkSleeve below.
    },
    cost: roundLedgerNumber(cost),
    funding: roundLedgerNumber(funding),
    closedTrades,
  };
}

function advanceBenchmarkSleeve(
  previous: D1AlphaSleeveSnapshot,
  observation: D1AlphaSymbolObservation,
): { nav: number; funding: number } {
  const gross = previous.benchmarkNav * (observation.close / previous.close);
  const funding = gross * D1_ALPHA_DAILY_FUNDING_FRACTION;
  return {
    nav: roundLedgerNumber(gross - funding),
    funding: roundLedgerNumber(funding),
  };
}

function completePayload(
  barTimestamp: number,
  btc: D1AlphaSleeveSnapshot,
  eth: D1AlphaSleeveSnapshot,
  increments: Pick<
    D1AlphaSnapshotPayload,
    | 'strategyCostIncrement'
    | 'strategyFundingIncrement'
    | 'benchmarkCostIncrement'
    | 'benchmarkFundingIncrement'
    | 'closedTradesIncrement'
  >,
): D1AlphaSnapshotPayload {
  const strategyPortfolioNav = roundLedgerNumber(btc.strategyNav + eth.strategyNav);
  const benchmarkPortfolioNav = roundLedgerNumber(btc.benchmarkNav + eth.benchmarkNav);
  const strategyLiquidationNav = roundLedgerNumber(
    btc.strategyNav * (btc.prospectivePosition === 'LONG' ? 1 - D1_ALPHA_SIDE_COST_FRACTION : 1)
    + eth.strategyNav * (eth.prospectivePosition === 'LONG' ? 1 - D1_ALPHA_SIDE_COST_FRACTION : 1),
  );
  const benchmarkLiquidationNav = roundLedgerNumber(
    benchmarkPortfolioNav * (1 - D1_ALPHA_SIDE_COST_FRACTION),
  );
  return {
    schemaVersion: 1,
    strategyVersion: D1_ALPHA_STRATEGY_VERSION,
    ruleSha256: D1_ALPHA_RULE_SHA256,
    artifactSha256: D1_ALPHA_ARTIFACT_SHA256,
    barTimestamp,
    btc,
    eth,
    strategyPortfolioNav,
    benchmarkPortfolioNav,
    strategyLiquidationNav,
    benchmarkLiquidationNav,
    ...increments,
  };
}

export function createInitialD1AlphaSnapshot(
  observation: D1AlphaObservation,
): D1AlphaSnapshotPayload {
  validateD1AlphaObservation(observation);
  const btc = initialSleeve(observation.symbols.BTCUSD);
  const eth = initialSleeve(observation.symbols.ETHUSD);
  return completePayload(observation.barTimestamp, btc, eth, {
    strategyCostIncrement: 0,
    strategyFundingIncrement: 0,
    benchmarkCostIncrement: roundLedgerNumber(D1_ALPHA_SIDE_COST_FRACTION),
    benchmarkFundingIncrement: 0,
    closedTradesIncrement: 0,
  });
}

export function advanceD1AlphaSnapshot(
  previous: D1AlphaSnapshotPayload,
  observation: D1AlphaObservation,
): D1AlphaSnapshotPayload {
  validateD1AlphaObservation(observation);
  if (observation.barTimestamp !== previous.barTimestamp + D1_ALPHA_DAY_MS) {
    throw new Error('D1 alpha ledger refuses gaps and historical backfill');
  }
  const btcStrategy = advanceStrategySleeve(previous.btc, observation.symbols.BTCUSD);
  const ethStrategy = advanceStrategySleeve(previous.eth, observation.symbols.ETHUSD);
  const btcBenchmark = advanceBenchmarkSleeve(previous.btc, observation.symbols.BTCUSD);
  const ethBenchmark = advanceBenchmarkSleeve(previous.eth, observation.symbols.ETHUSD);
  btcStrategy.snapshot.benchmarkNav = btcBenchmark.nav;
  ethStrategy.snapshot.benchmarkNav = ethBenchmark.nav;

  return completePayload(observation.barTimestamp, btcStrategy.snapshot, ethStrategy.snapshot, {
    strategyCostIncrement: roundLedgerNumber(btcStrategy.cost + ethStrategy.cost),
    strategyFundingIncrement: roundLedgerNumber(btcStrategy.funding + ethStrategy.funding),
    benchmarkCostIncrement: 0,
    benchmarkFundingIncrement: roundLedgerNumber(btcBenchmark.funding + ethBenchmark.funding),
    closedTradesIncrement: btcStrategy.closedTrades + ethStrategy.closedTrades,
  });
}

function maxDrawdown(values: number[]): number {
  let peak = values[0] ?? 1;
  let maximum = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    maximum = Math.max(maximum, peak > 0 ? (peak - value) / peak : 0);
  }
  return maximum;
}

function calmar(netReturn: number, maxDrawdownValue: number, calendarDays: number): number | null {
  if (calendarDays <= 0 || netReturn <= -1) return null;
  const annualizedReturn = Math.pow(1 + netReturn, 365 / calendarDays) - 1;
  if (maxDrawdownValue === 0) {
    return annualizedReturn > 0 ? Number.POSITIVE_INFINITY : null;
  }
  return annualizedReturn / maxDrawdownValue;
}

export function calculateD1AlphaMetrics(
  snapshots: D1AlphaSnapshotPayload[],
): D1AlphaMetrics | null {
  if (snapshots.length === 0) return null;
  const first = snapshots[0];
  const latest = snapshots[snapshots.length - 1];
  // Include the common 1.0 pre-entry baseline so first-snapshot entry and
  // liquidation costs contribute to drawdown for both portfolios.
  const strategyValues = [1, ...snapshots.map((snapshot) => snapshot.strategyLiquidationNav)];
  const benchmarkValues = [1, ...snapshots.map((snapshot) => snapshot.benchmarkLiquidationNav)];
  const strategyNetReturn = latest.strategyLiquidationNav - 1;
  const benchmarkNetReturn = latest.benchmarkLiquidationNav - 1;
  const strategyMaxDrawdown = maxDrawdown(strategyValues);
  const benchmarkMaxDrawdown = maxDrawdown(benchmarkValues);
  const calendarDays = Math.floor((latest.barTimestamp - first.barTimestamp) / D1_ALPHA_DAY_MS);
  return {
    strategyNetReturn,
    benchmarkNetReturn,
    activeReturn: strategyNetReturn - benchmarkNetReturn,
    strategyMaxDrawdown,
    benchmarkMaxDrawdown,
    strategyCalmar: calmar(strategyNetReturn, strategyMaxDrawdown, calendarDays),
    benchmarkCalmar: calmar(benchmarkNetReturn, benchmarkMaxDrawdown, calendarDays),
    calendarDays,
    snapshots: snapshots.length,
    closedTrades: snapshots.reduce((sum, snapshot) => sum + snapshot.closedTradesIncrement, 0),
  };
}

function calmarAtLeast(strategy: number | null, benchmark: number | null): boolean {
  if (strategy === null || benchmark === null) return false;
  return strategy >= benchmark;
}

export function evaluateD1AlphaGate(
  metrics: D1AlphaMetrics | null,
  options: { cadencePassed: boolean; integrityPassed: boolean },
): D1AlphaGateEvaluation {
  const observationChecks = {
    calendarDays: (metrics?.calendarDays ?? 0) >= D1_ALPHA_MIN_CALENDAR_DAYS,
    snapshots: (metrics?.snapshots ?? 0) >= D1_ALPHA_MIN_SNAPSHOTS,
    closedTrades: (metrics?.closedTrades ?? 0) >= D1_ALPHA_MIN_CLOSED_TRADES,
    cadence: options.cadencePassed,
    integrity: options.integrityPassed,
  };
  const observationMinimumMet = Object.values(observationChecks).every(Boolean);
  if (!observationMinimumMet || metrics === null) {
    return {
      status: 'collecting-evidence',
      observationMinimumMet: false,
      performanceGateEvaluated: false,
      observationChecks,
      performanceChecks: {
        positiveStrategyReturn: null,
        positiveActiveReturn: null,
        drawdownNoWorse: null,
        calmarNoWorse: null,
      },
    };
  }

  const performanceChecks = {
    positiveStrategyReturn: metrics.strategyNetReturn > 0,
    positiveActiveReturn: metrics.activeReturn > 0,
    drawdownNoWorse: metrics.strategyMaxDrawdown <= metrics.benchmarkMaxDrawdown,
    calmarNoWorse: calmarAtLeast(metrics.strategyCalmar, metrics.benchmarkCalmar),
  };
  const passed = Object.values(performanceChecks).every(Boolean);
  return {
    status: passed ? 'eligible-for-review' : 'failed-gate',
    observationMinimumMet: true,
    performanceGateEvaluated: true,
    observationChecks,
    performanceChecks,
  };
}

export function buildD1AlphaHashedSnapshot(
  payload: D1AlphaSnapshotPayload,
  previousHash: string | null,
): D1AlphaHashedSnapshot {
  return { payload, previousHash, rowHash: hashD1AlphaSnapshot(payload, previousHash) };
}

export const _d1AlphaInternal = { canonicalise, roundLedgerNumber, maxDrawdown, calmar };

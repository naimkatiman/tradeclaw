export * from './types';
export { dailyMomentumEntry } from './entry/daily-momentum';
export { PRESETS, getPreset, listPresets } from './presets';
export { selectStrategyForRegime, passesTrendFilter } from './router';
export type { TrendFilterOptions } from './router';
export { runBacktest } from './run-backtest';
export type { BacktestResult, BacktestTrade } from './run-backtest';
export {
  conditionEntryOnRegime,
  perRegimeMetrics,
  REGIME_CONDITION_WINDOW,
  REGIMES,
} from './regime-backtest';
export type {
  ClassifyFn,
  ConditionEntryOptions,
  RegimeMetrics,
  PerRegimeMetricsResult,
  PerRegimeMetricsOptions,
} from './regime-backtest';
export {
  ZERO_COSTS,
  CRYPTO_PERP_COSTS,
  FX_COSTS,
  METALS_COSTS,
  FIXED_LEGACY_GEOMETRY,
  LIVE_GEOMETRY,
  costModelFor,
} from './backtest-options';
export type { BacktestOptions, CostModel, Geometry } from './backtest-options';
export {
  D1_SLOW_GATE_ID,
  D1_SLOW_GATE_PAPER_STRATEGY_ID,
  D1_SLOW_GATE_TIMEFRAME,
  D1_SLOW_GATE_SYMBOLS,
  D1_SLOW_GATE_EMA_PERIOD,
  D1_SLOW_GATE_ATR_PERIOD,
  D1_SLOW_GATE_BASE_ATR_MULTIPLIER,
  D1_SLOW_GATE_MAX_COST_R,
  D1_SLOW_GATE_STOP_FLOOR_PCT,
  D1_SLOW_GATE_MAX_DIRECTION_CHANGES,
  D1_SLOW_GATE_FREQUENCY_WINDOW_MS,
  d1SlowGateEmaSeries,
  d1SlowGateAtrSeries,
  maxRollingDirectionChanges,
  runD1SlowGate,
} from './d1-slow-gate';
export type {
  D1SlowGateAction,
  D1SlowGateTransition,
  D1SlowGateRun,
  D1SlowGateOptions,
} from './d1-slow-gate';

// ─── Types (canonical definitions in types.ts) ──────
export type {
  Direction,
  Timeframe,
  SignalStatus,
  TradingSignal,
  IndicatorSummary,
  SymbolConfig,
  GatewayConfig,
  ChannelConfig,
  SymbolCategory,
  NormalizedTick,
  SubscriptionMessage,
  WsClientMessage,
  WsServerMessage,
} from './types';

// ─── Utilities ─────────────────────────────────────────

export { generateSignalId, clamp, formatNumber, formatDiff, emaTrendText } from './utils';

// ─── Indicators ───────────────────────────────────────
// Canonical indicator implementations live in apps/web/app/lib/ta-engine.ts
// Re-export from packages/signals/src/indicators.ts for backward compat with tests.
export {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  detectBollingerSqueeze,
  DEFAULT_SQUEEZE_THRESHOLD,
  calculateStochastic,
  findSupportLevels,
  findResistanceLevels,
} from './indicators';

// ADX is only in ta-engine.ts — re-export the local scalar version for tests
export { calculateADX } from './indicators-adx';

// ─── ATR Calibration ──────────────────────────────────
export {
  calibrateAtrMultiplier,
  DEFAULT_ATR_MULTIPLIER,
  MIN_CALIBRATION_SAMPLES,
  ATR_MULTIPLIER_GRID,
} from './atr-calibration';
export type {
  OutcomeSample,
  CalibrationOptions,
  CalibrationResult,
  CalibrationConfidence,
  SampleOutcome,
} from './atr-calibration';

// ─── Regime Classifier ───────────────────────────────
export {
  classifyRegime,
  computeFeatures,
  loadModel,
  getDefaultModel,
  setModel,
  computeGaussianLogPdf,
  forwardAlgorithm,
  viterbiDecode,
} from './regime/index';
export type {
  MarketRegime,
  RegimeClassification,
  RegimeFeatures,
  HMMModelParams,
  PriceBar,
} from './regime/index';

// ─── Dynamic Allocation ─────────────────────────────
export {
  computeAllocation,
  computeVolatilityScaler,
  SYMBOL_TIER,
  getSymbolTier,
  getTierWeight,
  REGIME_ALLOCATION_RULES,
  getAllocationRules,
} from './allocation/index';
export type {
  AllocationRules,
  AllocationResult,
  PortfolioState,
  PositionSummary,
  SignalInput,
} from './allocation/index';

// ─── Circuit Breakers & Risk Veto ───────────────────────
export {
  CircuitBreakerEngine,
  DrawdownTracker,
  vetoCheck,
  DEFAULT_BREAKERS,
  getBreakersForRegime,
} from './risk/index';
export type {
  BreakerType,
  BreakerAction,
  BreakerConfig,
  BreakerState,
  RiskState,
  EquityPoint,
  VetoResult,
  TradeOutcome,
  RiskMetrics,
  VetoSignalInput,
} from './risk/index';

// ─── Symbols ──────────────────────────────────────────

export {
  SYMBOLS,
  getSymbolConfig,
  getAllSymbols,
  getSymbolCategory,
  updateBasePrice,
  getBasePrice,
} from './symbols';

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
} from './types.js';

export { getStrategyName } from './types.js';

// ─── Utilities ─────────────────────────────────────────

export { generateSignalId, clamp, formatNumber, formatDiff, emaTrendText } from './utils.js';
export type { StrategyName } from './types.js';

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
} from './indicators.js';

// ADX is only in ta-engine.ts — re-export the local scalar version for tests
export { calculateADX } from './indicators-adx.js';

// ─── ATR Calibration ──────────────────────────────────
export {
  calibrateAtrMultiplier,
  DEFAULT_ATR_MULTIPLIER,
  MIN_CALIBRATION_SAMPLES,
  ATR_MULTIPLIER_GRID,
} from './atr-calibration.js';
export type {
  OutcomeSample,
  CalibrationOptions,
  CalibrationResult,
  CalibrationConfidence,
  SampleOutcome,
} from './atr-calibration.js';

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
} from './regime/index.js';
export type {
  MarketRegime,
  RegimeClassification,
  RegimeFeatures,
  HMMModelParams,
  PriceBar,
} from './regime/index.js';

// ─── Dynamic Allocation ─────────────────────────────
export {
  computeAllocation,
  computeVolatilityScaler,
  SYMBOL_TIER,
  getSymbolTier,
  getTierWeight,
  REGIME_ALLOCATION_RULES,
  getAllocationRules,
} from './allocation/index.js';
export type {
  AllocationRules,
  AllocationResult,
  PortfolioState,
  PositionSummary,
  SignalInput,
} from './allocation/index.js';

// ─── Circuit Breakers & Risk Veto ───────────────────────
export {
  CircuitBreakerEngine,
  DrawdownTracker,
  vetoCheck,
  DEFAULT_BREAKERS,
  getBreakersForRegime,
} from './risk/index.js';
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
} from './risk/index.js';

// ─── Symbols ──────────────────────────────────────────

export {
  SYMBOLS,
  getSymbolConfig,
  getAllSymbols,
  getSymbolCategory,
  updateBasePrice,
  getBasePrice,
} from './symbols.js';

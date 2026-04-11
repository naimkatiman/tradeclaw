/**
 * Circuit Breakers & Risk Veto Layer — Public API
 */

// Types
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
} from './types.js';

// Default config
export { DEFAULT_BREAKERS } from './breaker-config.js';

// Circuit breaker engine
export { CircuitBreakerEngine } from './circuit-breaker.js';

// Risk veto
export { vetoCheck } from './risk-veto.js';
export type { VetoSignalInput } from './risk-veto.js';

// Drawdown tracker
export { DrawdownTracker } from './drawdown-tracker.js';

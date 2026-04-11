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
} from './types';

// Default config + regime-adaptive factory
export { DEFAULT_BREAKERS, getBreakersForRegime } from './breaker-config';

// Circuit breaker engine
export { CircuitBreakerEngine } from './circuit-breaker';

// Risk veto
export { vetoCheck } from './risk-veto';
export type { VetoSignalInput } from './risk-veto';

// Drawdown tracker
export { DrawdownTracker } from './drawdown-tracker';

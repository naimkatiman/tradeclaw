/**
 * Broker abstraction layer.
 *
 * Re-exports the public API: types, broker implementations, and execution engine.
 */

export type {
  AccountInfo,
  Position,
  OrderRequest,
  OrderResult,
  IBroker,
} from './types.js';

export { AlpacaBroker } from './alpaca-broker.js';
export { PaperBroker } from './paper-broker.js';

export {
  ExecutionEngine,
  type ExecutionSignal,
  type ExecutionContext,
  type ExecutionResult,
  type ExecutionStage,
  type RiskCheckResult,
  type AllocationCheckResult,
} from './execution-engine.js';

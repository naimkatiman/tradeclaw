/**
 * Dynamic Allocation Strategy — Public API
 */

// Types
export type {
  AllocationRules,
  AllocationResult,
  PortfolioState,
  PositionSummary,
} from './types';

// Regime rules
export {
  REGIME_ALLOCATION_RULES,
  getAllocationRules,
} from './regime-rules';

// Allocator
export {
  computeAllocation,
  computeVolatilityScaler,
  SYMBOL_TIER,
  getSymbolTier,
  getTierWeight,
} from './allocator';
export type { SignalInput } from './allocator';

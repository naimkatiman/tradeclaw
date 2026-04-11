/**
 * Dynamic Allocation Strategy — Public API
 */

// Types
export type {
  AllocationRules,
  AllocationResult,
  PortfolioState,
  PositionSummary,
} from './types.js';

// Regime rules
export {
  REGIME_ALLOCATION_RULES,
  getAllocationRules,
} from './regime-rules.js';

// Allocator
export {
  computeAllocation,
  SYMBOL_TIER,
  getSymbolTier,
  getTierWeight,
} from './allocator.js';
export type { SignalInput } from './allocator.js';

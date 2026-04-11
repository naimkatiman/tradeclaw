/**
 * Regime-Based Allocation Rules
 *
 * Maps each market regime to its allocation constraints.
 *
 * Key design: biggest wins come in TRENDING markets (bull/euphoria).
 * - Bull: max exposure + leverage, no tight stops → trades run to TP3
 * - Euphoria: slightly cautious vs bull but still trend-following
 * - Neutral: balanced, moderate sizing
 * - Bear: defensive, shorts only, smaller positions
 * - Crash: minimal exposure, shorts only, capital preservation
 */

import type { MarketRegime } from '../regime/types';
import type { AllocationRules } from './types';

export const REGIME_ALLOCATION_RULES: Record<MarketRegime, AllocationRules> = {
  crash: {
    maxExposurePct: 10,
    maxLeverage: 1,
    allowedDirections: ['SELL'],
    maxSinglePositionPct: 3,
    tightenStops: true,
  },
  bear: {
    maxExposurePct: 30,
    maxLeverage: 1,
    allowedDirections: ['SELL'],
    maxSinglePositionPct: 8,
    tightenStops: true,
  },
  neutral: {
    maxExposurePct: 60,
    maxLeverage: 1.5,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 12,
    tightenStops: false,
  },
  bull: {
    maxExposurePct: 85,
    maxLeverage: 2,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 20,
    tightenStops: false,
  },
  euphoria: {
    maxExposurePct: 70,
    maxLeverage: 1.5,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 15,
    tightenStops: false,
  },
};

export function getAllocationRules(regime: MarketRegime): AllocationRules {
  const rules = REGIME_ALLOCATION_RULES[regime];
  if (!rules) {
    return REGIME_ALLOCATION_RULES['crash'];
  }
  return rules;
}

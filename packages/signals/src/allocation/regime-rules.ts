/**
 * Regime-Based Allocation Rules
 *
 * Maps each market regime to its allocation constraints.
 * Crash blocks all new positions. Bear allows only shorts.
 * Bull allows larger positions with leverage. Euphoria tightens
 * from bull levels as a caution against reversals.
 */

import type { MarketRegime } from '../regime/types';
import type { AllocationRules } from './types';

export const REGIME_ALLOCATION_RULES: Record<MarketRegime, AllocationRules> = {
  crash: {
    maxExposurePct: 0,
    maxLeverage: 1,
    allowedDirections: [],
    maxSinglePositionPct: 0,
    tightenStops: true,
  },
  bear: {
    maxExposurePct: 25,
    maxLeverage: 1,
    allowedDirections: ['SELL'],
    maxSinglePositionPct: 5,
    tightenStops: true,
  },
  neutral: {
    maxExposurePct: 50,
    maxLeverage: 1,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 10,
    tightenStops: false,
  },
  bull: {
    maxExposurePct: 75,
    maxLeverage: 2,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 15,
    tightenStops: false,
  },
  euphoria: {
    maxExposurePct: 50,
    maxLeverage: 1.5,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 10,
    tightenStops: true,
  },
};

export function getAllocationRules(regime: MarketRegime): AllocationRules {
  return REGIME_ALLOCATION_RULES[regime];
}

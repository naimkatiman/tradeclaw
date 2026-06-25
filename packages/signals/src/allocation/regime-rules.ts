/**
 * Regime-Based Allocation Rules (structural vocabulary, plan D2/D3)
 *
 * Maps each structural market regime to its allocation constraints.
 *
 * Key design: size into structure, not drift direction.
 * - trend: widest exposure and leverage → winners run to TP3
 * - volatile: defensive sizing, tightened stops
 * - range: smallest weight of the three (owner spec) — chop pays the least
 *
 * Initial constants per plan D3; recalibrated in Phase 4 against measured
 * per-regime outcomes.
 */

import type { MarketRegime } from '../regime/types.js';
import type { AllocationRules } from './types.js';

// All three regimes allow both directions intentionally: direction is no
// longer a regime concern under the structural vocabulary. Direction-
// conditional dispatch is Phase 4's strategy router (plan D2). The
// allowedDirections field stays for type stability of AllocationRules.
export const REGIME_ALLOCATION_RULES: Record<MarketRegime, AllocationRules> = {
  trend: {
    maxExposurePct: 80,
    maxLeverage: 2,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 15,
    tightenStops: false,
  },
  volatile: {
    maxExposurePct: 40,
    maxLeverage: 1,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 8,
    tightenStops: true,
  },
  range: {
    maxExposurePct: 30,
    maxLeverage: 1,
    allowedDirections: ['BUY', 'SELL'],
    maxSinglePositionPct: 6,
    tightenStops: false,
  },
};

export function getAllocationRules(regime: MarketRegime): AllocationRules {
  const rules = REGIME_ALLOCATION_RULES[regime];
  if (!rules) {
    // Unified conservative fallback (plan D1): unknown labels resolve to
    // range semantics everywhere — never throw, never silently drop.
    return REGIME_ALLOCATION_RULES['range'];
  }
  return rules;
}

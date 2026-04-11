/**
 * Dynamic Allocation Engine
 *
 * Computes regime-aware position sizing by combining:
 * - Regime-based allocation rules (direction, exposure, leverage caps)
 * - Signal confidence (higher confidence = larger size within limits)
 * - Symbol tier weighting (Tier 1 full, Tier 2 80%, Tier 3 60%)
 * - Current portfolio exposure checks
 */

import type { MarketRegime } from '../regime/types.js';
import type { AllocationResult, PortfolioState } from './types.js';
import { getAllocationRules } from './regime-rules.js';

// ─── Symbol Tier Map ────────────────────────────────────────────────────────

export const SYMBOL_TIER: Record<string, number> = {
  XAUUSD: 1,
  USDCAD: 1,
  XAGUSD: 1,
  EURUSD: 1,
  AUDUSD: 2,
  BTCUSD: 2,
  ETHUSD: 2,
  USDJPY: 2,
  GBPUSD: 3,
  XRPUSD: 3,
};

const DEFAULT_TIER = 2;

/** Tier multiplier: Tier 1 = 1.0, Tier 2 = 0.8, Tier 3 = 0.6 */
const TIER_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.6,
};

export function getSymbolTier(symbol: string): number {
  return SYMBOL_TIER[symbol.toUpperCase()] ?? DEFAULT_TIER;
}

export function getTierWeight(tier: number): number {
  return TIER_WEIGHTS[tier] ?? TIER_WEIGHTS[DEFAULT_TIER];
}

// ─── Signal Input ───────────────────────────────────────────────────────────

export interface SignalInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  /** Confidence score 0-100. */
  confidence: number;
}

// ─── Allocation Engine ──────────────────────────────────────────────────────

/**
 * Compute the recommended allocation for a signal given the current
 * market regime and portfolio state.
 */
export function computeAllocation(
  signal: SignalInput,
  regime: MarketRegime,
  portfolio: PortfolioState,
): AllocationResult {
  const rules = getAllocationRules(regime);

  // Check 1: Is any exposure allowed?
  if (rules.maxExposurePct === 0) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: `Regime "${regime}" blocks all new positions`,
      regime,
      rules,
    };
  }

  // Check 2: Is the direction allowed?
  if (!rules.allowedDirections.includes(signal.direction)) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: `Direction "${signal.direction}" not allowed in "${regime}" regime (allowed: ${rules.allowedDirections.join(', ') || 'none'})`,
      regime,
      rules,
    };
  }

  // Check 3: Would this exceed max portfolio exposure?
  const currentExposurePct =
    portfolio.totalEquity > 0
      ? (portfolio.positionsValue / portfolio.totalEquity) * 100
      : 0;

  if (currentExposurePct >= rules.maxExposurePct) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: `Current exposure ${currentExposurePct.toFixed(1)}% already at or above max ${rules.maxExposurePct}%`,
      regime,
      rules,
    };
  }

  // Calculate position size based on confidence and tier
  const tier = getSymbolTier(signal.symbol);
  const tierWeight = getTierWeight(tier);

  // Confidence drives size: scale linearly from 0% to maxSinglePositionPct
  const confidenceRatio = Math.min(Math.max(signal.confidence, 0), 100) / 100;
  const rawSizePct = rules.maxSinglePositionPct * confidenceRatio * tierWeight;

  // Cap by remaining exposure headroom
  const remainingExposurePct = rules.maxExposurePct - currentExposurePct;
  const positionSizePct = Math.min(rawSizePct, remainingExposurePct, rules.maxSinglePositionPct);

  // Check 4: Final size must be positive
  if (positionSizePct <= 0) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: 'Computed position size is zero or negative',
      regime,
      rules,
    };
  }

  return {
    positionSizePct: Math.round(positionSizePct * 100) / 100,
    leverageMultiplier: rules.maxLeverage,
    approved: true,
    regime,
    rules,
  };
}

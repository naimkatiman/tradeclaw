/**
 * Dynamic Allocation Engine
 *
 * Computes regime-aware position sizing by combining:
 * - Regime-based allocation rules (direction, exposure, leverage caps)
 * - Signal confidence (higher confidence = larger size within limits)
 * - Symbol tier weighting (Tier 1 full, Tier 2 80%, Tier 3 60%)
 * - Current portfolio exposure checks
 */

import type { MarketRegime } from '../regime/types';
import type { AllocationResult, PortfolioState } from './types';
import { getAllocationRules } from './regime-rules';

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

// ─── Volatility Scaler ──────────────────────────────────────────────────────

/**
 * Baseline volatility per regime. When current vol exceeds baseline,
 * position size is scaled down proportionally to keep risk constant.
 * Values are approximate 20-day rolling vol (std of log returns).
 */
const REGIME_BASELINE_VOL: Record<MarketRegime, number> = {
  crash: 0.06,
  bear: 0.03,
  neutral: 0.015,
  bull: 0.025,
  euphoria: 0.05,
};

/**
 * Compute a volatility scaler (0, 1]. When current vol is at or below
 * the regime baseline, returns 1.0. When vol is elevated, returns a
 * value < 1 to shrink position size proportionally.
 *
 * Floor of 0.25 prevents positions from becoming too small to be useful.
 */
export function computeVolatilityScaler(
  currentVol: number,
  regime: MarketRegime,
): number {
  const baseline = REGIME_BASELINE_VOL[regime];
  if (currentVol <= 0 || currentVol <= baseline) return 1.0;
  const scaler = baseline / currentVol;
  return Math.max(scaler, 0.25); // floor at 25% of normal size
}

// ─── Allocation Engine ──────────────────────────────────────────────────────

/**
 * Compute the recommended allocation for a signal given the current
 * market regime and portfolio state.
 *
 * @param currentVol - Optional 20-day rolling volatility from the regime
 *   classifier. When provided, position size is scaled inversely with
 *   volatility to keep risk constant across market conditions.
 */
export function computeAllocation(
  signal: SignalInput,
  regime: MarketRegime,
  portfolio: PortfolioState,
  currentVol?: number,
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

  // Check 3: Portfolio equity must be positive
  if (portfolio.totalEquity <= 0) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: 'Portfolio equity is zero or negative',
      regime,
      rules,
    };
  }

  // Check 4: Positions value must not be negative
  if (portfolio.positionsValue < 0) {
    return {
      positionSizePct: 0,
      leverageMultiplier: 1,
      approved: false,
      reason: 'Invalid negative positions value',
      regime,
      rules,
    };
  }

  // Check 5: Would this exceed max portfolio exposure?
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
  const volScaler = currentVol != null ? computeVolatilityScaler(currentVol, regime) : 1.0;
  const rawSizePct = rules.maxSinglePositionPct * confidenceRatio * tierWeight * volScaler;

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
    reason: `${regime} regime: ${positionSizePct.toFixed(1)}% position, tier ${tier}${volScaler < 1 ? `, vol-scaled ${(volScaler * 100).toFixed(0)}%` : ''}`,
    regime,
    rules,
  };
}

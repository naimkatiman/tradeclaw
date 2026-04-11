/**
 * Default & Regime-Adaptive Circuit Breaker Configurations
 *
 * DEFAULT_BREAKERS are conservative defaults (used when no regime is known).
 * getBreakersForRegime() returns widened thresholds in trending markets so
 * trades have room to reach TP3, and tighter limits in adverse conditions.
 */

import type { MarketRegime } from '../regime/types';
import type { BreakerConfig, BreakerType } from './types';

export const DEFAULT_BREAKERS: BreakerConfig[] = [
  {
    type: 'daily_drawdown',
    threshold: 3,
    action: 'halt_new',
    cooldownMinutes: 1440, // 24 hours
    description: 'Halt new positions when daily loss reaches or exceeds threshold',
  },
  {
    type: 'weekly_drawdown',
    threshold: 7,
    action: 'reduce_allocation',
    cooldownMinutes: 10080, // 7 days
    description: 'Reduce allocation when weekly loss reaches or exceeds threshold',
  },
  {
    type: 'max_drawdown',
    threshold: 15,
    action: 'close_all',
    cooldownMinutes: 43200, // 30 days
    description: 'Close all positions when drawdown reaches or exceeds threshold',
  },
  {
    type: 'consecutive_losses',
    threshold: 5,
    action: 'halt_new',
    cooldownMinutes: 240, // 4 hours
    description: 'Pause trading after consecutive losses reach or exceed threshold',
  },
  {
    type: 'correlation_limit',
    threshold: 3,
    action: 'halt_new',
    cooldownMinutes: 0, // resolves when positions close
    description: 'Block new entries when correlated positions reach or exceed threshold',
  },
];

// ─── Regime-Adaptive Thresholds ──────────────────────────────────────────
// Bull/euphoria: wide thresholds → trades breathe → TP3 reachable
// Bear/crash: tight thresholds → capital preservation

const REGIME_BREAKER_THRESHOLDS: Record<MarketRegime, Record<BreakerType, number>> = {
  bull: {
    daily_drawdown: 6,
    weekly_drawdown: 12,
    max_drawdown: 25,
    consecutive_losses: 7,
    correlation_limit: 5,
  },
  euphoria: {
    daily_drawdown: 5,
    weekly_drawdown: 10,
    max_drawdown: 20,
    consecutive_losses: 6,
    correlation_limit: 4,
  },
  neutral: {
    daily_drawdown: 4,
    weekly_drawdown: 9,
    max_drawdown: 18,
    consecutive_losses: 6,
    correlation_limit: 4,
  },
  bear: {
    daily_drawdown: 3,
    weekly_drawdown: 7,
    max_drawdown: 15,
    consecutive_losses: 5,
    correlation_limit: 3,
  },
  crash: {
    daily_drawdown: 2,
    weekly_drawdown: 5,
    max_drawdown: 10,
    consecutive_losses: 4,
    correlation_limit: 2,
  },
};

/**
 * Return breaker configs with thresholds adapted to the current market regime.
 * In bull markets, thresholds are 2x the bear defaults so trades can run to TP3.
 */
export function getBreakersForRegime(regime: MarketRegime): BreakerConfig[] {
  const thresholds = REGIME_BREAKER_THRESHOLDS[regime];
  return DEFAULT_BREAKERS.map((b) => ({
    ...b,
    threshold: thresholds[b.type] ?? b.threshold,
  }));
}

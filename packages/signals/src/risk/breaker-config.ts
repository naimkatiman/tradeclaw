/**
 * Default Circuit Breaker Configurations
 *
 * These thresholds are conservative defaults suitable for a typical
 * retail trading account. Override via constructor injection.
 */

import type { BreakerConfig } from './types';

export const DEFAULT_BREAKERS: BreakerConfig[] = [
  {
    type: 'daily_drawdown',
    threshold: 3,
    action: 'halt_new',
    cooldownMinutes: 1440, // 24 hours
    description: 'Halt new positions when daily loss exceeds 3%',
  },
  {
    type: 'weekly_drawdown',
    threshold: 7,
    action: 'reduce_allocation',
    cooldownMinutes: 10080, // 7 days
    description: 'Reduce allocation to 25% when weekly loss exceeds 7%',
  },
  {
    type: 'max_drawdown',
    threshold: 15,
    action: 'close_all',
    cooldownMinutes: 43200, // 30 days
    description: 'Close all positions and halt trading when drawdown exceeds 15%',
  },
  {
    type: 'consecutive_losses',
    threshold: 5,
    action: 'halt_new',
    cooldownMinutes: 240, // 4 hours
    description: 'Pause trading for 4 hours after 5 consecutive losses',
  },
  {
    type: 'correlation_limit',
    threshold: 3,
    action: 'halt_new',
    cooldownMinutes: 0, // resolves when positions close
    description: 'Block new entries when 3+ correlated positions are open in same direction',
  },
];

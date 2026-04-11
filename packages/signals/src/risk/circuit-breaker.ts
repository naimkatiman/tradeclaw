/**
 * Circuit Breaker Engine
 *
 * Evaluates risk metrics against configurable thresholds and trips
 * breakers that halt, reduce, or close trading activity.
 */

import { getSymbolCategory } from '../index';
import { DEFAULT_BREAKERS } from './breaker-config';
import type {
  BreakerConfig,
  BreakerState,
  BreakerType,
  RiskMetrics,
  RiskState,
} from './types';

export class CircuitBreakerEngine {
  private readonly configs: Map<BreakerType, BreakerConfig>;
  private readonly state: Map<BreakerType, BreakerState>;

  constructor(breakers: BreakerConfig[] = DEFAULT_BREAKERS) {
    this.configs = new Map(breakers.map((b) => [b.type, b]));
    this.state = new Map();

    for (const b of breakers) {
      this.state.set(b.type, {
        type: b.type,
        active: false,
        action: b.action,
      });
    }
  }

  // ─── Individual Checks ──────────────────────────────────────────

  checkDailyDrawdown(dailyPnlPct: number): BreakerState {
    return this.checkThreshold('daily_drawdown', Math.abs(dailyPnlPct));
  }

  checkWeeklyDrawdown(weeklyPnlPct: number): BreakerState {
    return this.checkThreshold('weekly_drawdown', Math.abs(weeklyPnlPct));
  }

  checkMaxDrawdown(drawdownFromPeakPct: number): BreakerState {
    return this.checkThreshold('max_drawdown', Math.abs(drawdownFromPeakPct));
  }

  checkConsecutiveLosses(consecutiveLosses: number): BreakerState {
    return this.checkThreshold('consecutive_losses', consecutiveLosses);
  }

  checkCorrelationLimit(
    openPositions: { symbol: string; direction: string }[],
  ): BreakerState {
    const config = this.configs.get('correlation_limit');
    const current = this.getOrCreateState('correlation_limit');

    if (!config) return current;

    // Group positions by (category, direction)
    const groups = new Map<string, number>();
    for (const pos of openPositions) {
      const cat = getSymbolCategory(pos.symbol);
      const key = `${cat}:${pos.direction}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    const maxCorrelated = Math.max(0, ...groups.values());

    if (maxCorrelated >= config.threshold) {
      return this.tripBreaker('correlation_limit', maxCorrelated);
    }

    // Correlation breaker resolves immediately when condition clears
    if (current.active) {
      return this.resolveBreaker('correlation_limit');
    }

    return current;
  }

  // ─── Aggregate Evaluation ────────────────────────────────────────

  evaluate(metrics: RiskMetrics): RiskState {
    // Auto-resolve expired cooldowns before evaluating
    this.autoResolveExpiredBreakers();

    this.checkDailyDrawdown(metrics.dailyPnlPct);
    this.checkWeeklyDrawdown(metrics.weeklyPnlPct);
    this.checkMaxDrawdown(metrics.drawdownFromPeakPct);
    this.checkConsecutiveLosses(metrics.consecutiveLosses);
    this.checkCorrelationLimit(metrics.openPositions);

    return this.buildRiskState(metrics);
  }

  // ─── Accessors ────────────────────────────────────────────────────

  getActiveBreakers(): BreakerState[] {
    return [...this.state.values()].filter((s) => s.active);
  }

  getState(type: BreakerType): BreakerState | undefined {
    return this.state.get(type);
  }

  // ─── Manual Resolution ────────────────────────────────────────────

  resolveBreaker(type: BreakerType): BreakerState {
    const current = this.state.get(type);
    if (!current) {
      return { type, active: false, action: 'halt_new' };
    }

    const resolved: BreakerState = {
      ...current,
      active: false,
      resolvedAt: new Date().toISOString(),
    };
    this.state.set(type, resolved);
    return resolved;
  }

  // ─── Internals ────────────────────────────────────────────────────

  private checkThreshold(type: BreakerType, value: number): BreakerState {
    const config = this.configs.get(type);
    const current = this.getOrCreateState(type);

    if (!config) return current;

    if (value >= config.threshold && !current.active) {
      return this.tripBreaker(type, value);
    }

    return current;
  }

  private tripBreaker(type: BreakerType, value: number): BreakerState {
    const config = this.configs.get(type)!;
    const tripped: BreakerState = {
      type,
      active: true,
      triggeredAt: new Date().toISOString(),
      reason: `${config.description} (current: ${value})`,
      action: config.action,
    };
    this.state.set(type, tripped);
    return tripped;
  }

  private getOrCreateState(type: BreakerType): BreakerState {
    const existing = this.state.get(type);
    if (existing) return existing;

    const config = this.configs.get(type);
    const fresh: BreakerState = {
      type,
      active: false,
      action: config?.action ?? 'halt_new',
    };
    this.state.set(type, fresh);
    return fresh;
  }

  private autoResolveExpiredBreakers(): void {
    const now = Date.now();

    for (const [type, s] of this.state) {
      if (!s.active || !s.triggeredAt) continue;

      const config = this.configs.get(type);
      if (!config || config.cooldownMinutes <= 0) continue;

      const triggeredMs = new Date(s.triggeredAt).getTime();
      const cooldownMs = config.cooldownMinutes * 60_000;

      if (now - triggeredMs >= cooldownMs) {
        this.resolveBreaker(type);
      }
    }
  }

  private buildRiskState(metrics: RiskMetrics): RiskState {
    const activeBreakers = this.getActiveBreakers();
    const activeTypes = activeBreakers.map((b) => b.type);

    const hasCloseAll = activeBreakers.some((b) => b.action === 'close_all');
    const hasHaltNew = activeBreakers.some((b) => b.action === 'halt_new');
    const hasReduceAllocation = activeBreakers.some(
      (b) => b.action === 'reduce_allocation',
    );

    const canTrade = !hasCloseAll && !hasHaltNew;

    return {
      breakers: [...this.state.values()],
      activeBreakers: activeTypes,
      canTrade,
      maxAllocationOverride: hasReduceAllocation ? 25 : undefined,
      equityCurve: [],
      currentDrawdownPct: Math.abs(metrics.drawdownFromPeakPct),
      highWaterMark: 0, // caller supplies via DrawdownTracker
      consecutiveLosses: metrics.consecutiveLosses,
    };
  }
}

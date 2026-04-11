/**
 * Circuit Breaker Engine — Unit Tests
 */

import { CircuitBreakerEngine } from '../circuit-breaker.js';
import { DEFAULT_BREAKERS } from '../breaker-config.js';
import type { BreakerConfig, RiskMetrics } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeMetrics(overrides: Partial<RiskMetrics> = {}): RiskMetrics {
  return {
    dailyPnlPct: 0,
    weeklyPnlPct: 0,
    drawdownFromPeakPct: 0,
    consecutiveLosses: 0,
    openPositions: [],
    ...overrides,
  };
}

// ─── Individual Breaker Triggers ──────────────────────────────────────────

describe('CircuitBreakerEngine', () => {
  describe('daily drawdown breaker', () => {
    it('trips when daily loss exceeds 3%', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkDailyDrawdown(-3.5);

      expect(state.active).toBe(true);
      expect(state.type).toBe('daily_drawdown');
      expect(state.action).toBe('halt_new');
      expect(state.triggeredAt).toBeDefined();
    });

    it('does not trip below threshold', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkDailyDrawdown(-2.5);

      expect(state.active).toBe(false);
    });

    it('trips at exactly 3%', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkDailyDrawdown(-3);

      expect(state.active).toBe(true);
    });
  });

  describe('weekly drawdown breaker', () => {
    it('trips when weekly loss exceeds 7%', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkWeeklyDrawdown(-8);

      expect(state.active).toBe(true);
      expect(state.type).toBe('weekly_drawdown');
      expect(state.action).toBe('reduce_allocation');
    });

    it('does not trip below threshold', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkWeeklyDrawdown(-5);

      expect(state.active).toBe(false);
    });
  });

  describe('max drawdown breaker', () => {
    it('trips when drawdown from peak exceeds 15%', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkMaxDrawdown(-16);

      expect(state.active).toBe(true);
      expect(state.type).toBe('max_drawdown');
      expect(state.action).toBe('close_all');
    });

    it('does not trip below threshold', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkMaxDrawdown(-10);

      expect(state.active).toBe(false);
    });
  });

  describe('consecutive losses breaker', () => {
    it('trips after 5 consecutive losses', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkConsecutiveLosses(5);

      expect(state.active).toBe(true);
      expect(state.type).toBe('consecutive_losses');
      expect(state.action).toBe('halt_new');
    });

    it('does not trip below threshold', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkConsecutiveLosses(3);

      expect(state.active).toBe(false);
    });
  });

  describe('correlation limit breaker', () => {
    it('trips when 3+ correlated positions open in same direction', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkCorrelationLimit([
        { symbol: 'BTCUSD', direction: 'BUY' },
        { symbol: 'ETHUSD', direction: 'BUY' },
        { symbol: 'SOLUSD', direction: 'BUY' },
      ]);

      expect(state.active).toBe(true);
      expect(state.type).toBe('correlation_limit');
    });

    it('does not trip for different directions', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkCorrelationLimit([
        { symbol: 'BTCUSD', direction: 'BUY' },
        { symbol: 'ETHUSD', direction: 'SELL' },
        { symbol: 'SOLUSD', direction: 'BUY' },
      ]);

      expect(state.active).toBe(false);
    });

    it('does not trip for different asset classes', () => {
      const engine = new CircuitBreakerEngine();
      const state = engine.checkCorrelationLimit([
        { symbol: 'BTCUSD', direction: 'BUY' },
        { symbol: 'XAUUSD', direction: 'BUY' },
        { symbol: 'EURUSD', direction: 'BUY' },
      ]);

      expect(state.active).toBe(false);
    });

    it('auto-resolves when correlated positions close', () => {
      const engine = new CircuitBreakerEngine();

      // Trip it
      engine.checkCorrelationLimit([
        { symbol: 'BTCUSD', direction: 'BUY' },
        { symbol: 'ETHUSD', direction: 'BUY' },
        { symbol: 'SOLUSD', direction: 'BUY' },
      ]);

      // Condition clears
      const state = engine.checkCorrelationLimit([
        { symbol: 'BTCUSD', direction: 'BUY' },
      ]);

      expect(state.active).toBe(false);
      expect(state.resolvedAt).toBeDefined();
    });
  });

  // ─── Cooldown Auto-Resolution ────────────────────────────────────

  describe('auto-resolve after cooldown', () => {
    it('resolves a breaker after cooldown expires', () => {
      const shortCooldown: BreakerConfig[] = [
        {
          type: 'consecutive_losses',
          threshold: 3,
          action: 'halt_new',
          cooldownMinutes: 0.001, // ~60ms
          description: 'Test breaker',
        },
      ];

      const engine = new CircuitBreakerEngine(shortCooldown);

      // Trip it
      engine.checkConsecutiveLosses(5);
      expect(engine.getActiveBreakers()).toHaveLength(1);

      // Fake the triggeredAt to the past
      const state = engine.getState('consecutive_losses')!;
      (state as { triggeredAt: string }).triggeredAt = new Date(
        Date.now() - 120_000,
      ).toISOString();

      // Evaluate should auto-resolve
      const risk = engine.evaluate(makeMetrics({ consecutiveLosses: 0 }));
      const resolved = risk.breakers.find(
        (b) => b.type === 'consecutive_losses',
      );
      expect(resolved?.active).toBe(false);
    });
  });

  // ─── Multiple Active Breakers ────────────────────────────────────

  describe('multiple breakers', () => {
    it('can have multiple breakers active simultaneously', () => {
      const engine = new CircuitBreakerEngine();

      engine.checkDailyDrawdown(-4);
      engine.checkConsecutiveLosses(6);

      const active = engine.getActiveBreakers();
      expect(active).toHaveLength(2);
      expect(active.map((b) => b.type)).toContain('daily_drawdown');
      expect(active.map((b) => b.type)).toContain('consecutive_losses');
    });
  });

  // ─── Evaluate Combined State ──────────────────────────────────────

  describe('evaluate()', () => {
    it('returns canTrade=true when no breakers active', () => {
      const engine = new CircuitBreakerEngine();
      const risk = engine.evaluate(makeMetrics());

      expect(risk.canTrade).toBe(true);
      expect(risk.activeBreakers).toHaveLength(0);
    });

    it('returns canTrade=false when halt_new breaker active', () => {
      const engine = new CircuitBreakerEngine();
      const risk = engine.evaluate(
        makeMetrics({ dailyPnlPct: -4 }),
      );

      expect(risk.canTrade).toBe(false);
      expect(risk.activeBreakers).toContain('daily_drawdown');
    });

    it('returns canTrade=false when close_all breaker active', () => {
      const engine = new CircuitBreakerEngine();
      const risk = engine.evaluate(
        makeMetrics({ drawdownFromPeakPct: -20 }),
      );

      expect(risk.canTrade).toBe(false);
      expect(risk.activeBreakers).toContain('max_drawdown');
    });

    it('returns maxAllocationOverride when reduce_allocation active', () => {
      const engine = new CircuitBreakerEngine();
      const risk = engine.evaluate(
        makeMetrics({ weeklyPnlPct: -8 }),
      );

      expect(risk.canTrade).toBe(true);
      expect(risk.maxAllocationOverride).toBe(25);
      expect(risk.activeBreakers).toContain('weekly_drawdown');
    });

    it('tracks current drawdown and consecutive losses', () => {
      const engine = new CircuitBreakerEngine();
      const risk = engine.evaluate(
        makeMetrics({ drawdownFromPeakPct: -5, consecutiveLosses: 2 }),
      );

      expect(risk.currentDrawdownPct).toBe(5);
      expect(risk.consecutiveLosses).toBe(2);
    });
  });

  // ─── Manual Resolution ────────────────────────────────────────────

  describe('resolveBreaker()', () => {
    it('manually resolves an active breaker', () => {
      const engine = new CircuitBreakerEngine();
      engine.checkDailyDrawdown(-4);

      expect(engine.getActiveBreakers()).toHaveLength(1);

      const resolved = engine.resolveBreaker('daily_drawdown');
      expect(resolved.active).toBe(false);
      expect(resolved.resolvedAt).toBeDefined();
      expect(engine.getActiveBreakers()).toHaveLength(0);
    });
  });

  // ─── Custom Config ────────────────────────────────────────────────

  describe('custom breaker config', () => {
    it('uses custom thresholds', () => {
      const custom: BreakerConfig[] = [
        {
          type: 'daily_drawdown',
          threshold: 5,
          action: 'halt_new',
          cooldownMinutes: 60,
          description: 'Custom daily',
        },
      ];

      const engine = new CircuitBreakerEngine(custom);

      // 4% should not trip with 5% threshold
      const safe = engine.checkDailyDrawdown(-4);
      expect(safe.active).toBe(false);

      // 5% should trip
      const tripped = engine.checkDailyDrawdown(-5);
      expect(tripped.active).toBe(true);
    });
  });
});

/**
 * Risk Veto Layer — Unit Tests
 */

import { vetoCheck } from '../risk-veto';
import type { BreakerState, RiskState, BreakerType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRiskState(
  overrides: Partial<RiskState> = {},
  activeBreakers: BreakerState[] = [],
): RiskState {
  return {
    breakers: activeBreakers,
    activeBreakers: activeBreakers.filter((b) => b.active).map((b) => b.type),
    canTrade: true,
    equityCurve: [],
    currentDrawdownPct: 0,
    highWaterMark: 100_000,
    consecutiveLosses: 0,
    ...overrides,
  };
}

function makeBreaker(
  type: BreakerType,
  action: BreakerState['action'],
  active = true,
): BreakerState {
  return {
    type,
    active,
    action,
    triggeredAt: active ? new Date().toISOString() : undefined,
  };
}

const signal = { symbol: 'BTCUSD', direction: 'BUY' as const, confidence: 80 };

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('vetoCheck', () => {
  it('rejects when close_all breaker is active', () => {
    const breaker = makeBreaker('max_drawdown', 'close_all');
    const state = makeRiskState({}, [breaker]);

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Max drawdown breaker active');
    expect(result.vetoedBy).toBe('max_drawdown');
  });

  it('rejects when halt_new breaker is active', () => {
    const breaker = makeBreaker('daily_drawdown', 'halt_new');
    const state = makeRiskState({}, [breaker]);

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain('daily drawdown');
    expect(result.reason).toContain('no new positions');
    expect(result.vetoedBy).toBe('daily_drawdown');
  });

  it('approves with allocation override when reduce_allocation is active', () => {
    const breaker = makeBreaker('weekly_drawdown', 'reduce_allocation');
    const state = makeRiskState({ maxAllocationOverride: 25 }, [breaker]);

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(true);
    expect(result.reason).toContain('25%');
    expect(result.riskState.maxAllocationOverride).toBe(25);
  });

  it('rejects when allocation is denied by regime rules', () => {
    const state = makeRiskState();

    const result = vetoCheck(signal, state, false);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Allocation denied by regime rules');
  });

  it('approves in normal conditions', () => {
    const state = makeRiskState();

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.vetoedBy).toBeUndefined();
  });

  it('close_all takes priority over halt_new', () => {
    const closeAll = makeBreaker('max_drawdown', 'close_all');
    const haltNew = makeBreaker('daily_drawdown', 'halt_new');
    const state = makeRiskState({}, [closeAll, haltNew]);

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Max drawdown breaker active');
    expect(result.vetoedBy).toBe('max_drawdown');
  });

  it('halt_new takes priority over reduce_allocation', () => {
    const haltNew = makeBreaker('consecutive_losses', 'halt_new');
    const reduce = makeBreaker('weekly_drawdown', 'reduce_allocation');
    const state = makeRiskState({}, [haltNew, reduce]);

    const result = vetoCheck(signal, state, true);

    expect(result.approved).toBe(false);
    expect(result.vetoedBy).toBe('consecutive_losses');
  });

  it('attaches full riskState to result', () => {
    const state = makeRiskState({
      currentDrawdownPct: 5,
      consecutiveLosses: 2,
    });

    const result = vetoCheck(signal, state, true);

    expect(result.riskState.currentDrawdownPct).toBe(5);
    expect(result.riskState.consecutiveLosses).toBe(2);
  });

  // ─── Regime-Aware Veto ──────────────────────────────────────────────

  describe('regime-aware bypass', () => {
    it('bypasses halt_new in bull regime with high confidence', () => {
      const breaker = makeBreaker('daily_drawdown', 'halt_new');
      const state = makeRiskState({}, [breaker]);
      const highConfSignal = { symbol: 'BTCUSD', direction: 'BUY' as const, confidence: 85 };

      const result = vetoCheck(highConfSignal, state, true, 'bull');

      expect(result.approved).toBe(true);
      expect(result.reason).toContain('bypassed');
      expect(result.reason).toContain('bull');
      expect(result.riskState.maxAllocationOverride).toBe(50);
    });

    it('bypasses halt_new in euphoria regime with high confidence', () => {
      const breaker = makeBreaker('consecutive_losses', 'halt_new');
      const state = makeRiskState({}, [breaker]);
      const highConfSignal = { symbol: 'XAUUSD', direction: 'BUY' as const, confidence: 90 };

      const result = vetoCheck(highConfSignal, state, true, 'euphoria');

      expect(result.approved).toBe(true);
      expect(result.reason).toContain('bypassed');
    });

    it('does NOT bypass halt_new in bull with low confidence', () => {
      const breaker = makeBreaker('daily_drawdown', 'halt_new');
      const state = makeRiskState({}, [breaker]);
      const lowConfSignal = { symbol: 'BTCUSD', direction: 'BUY' as const, confidence: 60 };

      const result = vetoCheck(lowConfSignal, state, true, 'bull');

      expect(result.approved).toBe(false);
      expect(result.vetoedBy).toBe('daily_drawdown');
    });

    it('does NOT bypass halt_new in bear regime even with high confidence', () => {
      const breaker = makeBreaker('daily_drawdown', 'halt_new');
      const state = makeRiskState({}, [breaker]);
      const highConfSignal = { symbol: 'BTCUSD', direction: 'SELL' as const, confidence: 95 };

      const result = vetoCheck(highConfSignal, state, true, 'bear');

      expect(result.approved).toBe(false);
      expect(result.vetoedBy).toBe('daily_drawdown');
    });

    it('never bypasses close_all regardless of regime', () => {
      const breaker = makeBreaker('max_drawdown', 'close_all');
      const state = makeRiskState({}, [breaker]);
      const highConfSignal = { symbol: 'BTCUSD', direction: 'BUY' as const, confidence: 99 };

      const result = vetoCheck(highConfSignal, state, true, 'bull');

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Max drawdown breaker active');
    });

    it('works without regime parameter (backward compatible)', () => {
      const breaker = makeBreaker('daily_drawdown', 'halt_new');
      const state = makeRiskState({}, [breaker]);

      const result = vetoCheck(signal, state, true);

      expect(result.approved).toBe(false);
      expect(result.vetoedBy).toBe('daily_drawdown');
    });
  });
});

import candles from '../fixtures/candles-100.json';
import { regimeAwareEntry } from '../../entry/regime-aware';
import { classicEntry } from '../../entry/classic';

describe('regime-aware entry module', () => {
  it('has id "regime-aware"', () => {
    expect(regimeAwareEntry.id).toBe('regime-aware');
  });

  it('produces a subset of classic signals (filters, never adds)', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const classic = classicEntry.generateSignals(candles as any, ctx);
    const regime = regimeAwareEntry.generateSignals(candles as any, ctx);
    expect(regime.length).toBeLessThanOrEqual(classic.length);
    for (const sig of regime) {
      const match = classic.find(
        (c) => c.barIndex === sig.barIndex && c.direction === sig.direction,
      );
      expect(match).toBeDefined();
    }
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const a = regimeAwareEntry.generateSignals(candles as any, ctx);
    const b = regimeAwareEntry.generateSignals(candles as any, ctx);
    expect(a).toEqual(b);
  });
});

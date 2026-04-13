import candles from '../fixtures/candles-100.json';
import { hmmTop3Entry } from '../../entry/hmm-top3';

describe('hmm-top3 entry module', () => {
  it('has id "hmm-top3"', () => {
    expect(hmmTop3Entry.id).toBe('hmm-top3');
  });

  it('returns at most 3 signals on the fixture (top-3 cap)', () => {
    const sigs = hmmTop3Entry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    expect(sigs.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    expect(hmmTop3Entry.generateSignals(candles as any, ctx))
      .toEqual(hmmTop3Entry.generateSignals(candles as any, ctx));
  });

  it('all returned signals exist in regime-aware output (proper subset)', () => {
    const { regimeAwareEntry } = require('../../entry/regime-aware');
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const regime = regimeAwareEntry.generateSignals(candles as any, ctx);
    const top3 = hmmTop3Entry.generateSignals(candles as any, ctx);
    for (const s of top3) {
      const match = regime.find((r: any) => r.barIndex === s.barIndex && r.direction === s.direction);
      expect(match).toBeDefined();
    }
  });

  it('returns signals sorted by confidence descending', () => {
    const sigs = hmmTop3Entry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    for (let i = 1; i < sigs.length; i++) {
      expect(sigs[i - 1].confidence).toBeGreaterThanOrEqual(sigs[i].confidence);
    }
  });
});

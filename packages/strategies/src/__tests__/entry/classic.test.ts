import candles from '../fixtures/candles-100.json';
import { classicEntry } from '../../entry/classic';

describe('classic entry module', () => {
  it('has id "classic"', () => {
    expect(classicEntry.id).toBe('classic');
  });

  it('produces signals deterministically on fixture candles', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    const sigs1 = classicEntry.generateSignals(candles as any, ctx);
    const sigs2 = classicEntry.generateSignals(candles as any, ctx);
    expect(sigs1).toEqual(sigs2);
  });

  it('signal shape is valid', () => {
    const sigs = classicEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    for (const s of sigs) {
      expect(['BUY', 'SELL']).toContain(s.direction);
      expect(s.price).toBeGreaterThan(0);
      expect(s.barIndex).toBeGreaterThanOrEqual(0);
      expect(s.barIndex).toBeLessThan(candles.length);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });
});

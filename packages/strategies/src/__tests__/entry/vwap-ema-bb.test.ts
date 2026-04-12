import candles from '../fixtures/candles-100.json';
import { vwapEmaBbEntry } from '../../entry/vwap-ema-bb';

describe('vwap-ema-bb entry module', () => {
  it('has id "vwap-ema-bb"', () => {
    expect(vwapEmaBbEntry.id).toBe('vwap-ema-bb');
  });

  it('is deterministic', () => {
    const ctx = { symbol: 'BTCUSD', timeframe: 'H1' };
    expect(vwapEmaBbEntry.generateSignals(candles as any, ctx))
      .toEqual(vwapEmaBbEntry.generateSignals(candles as any, ctx));
  });

  it('all signals have valid shape', () => {
    const sigs = vwapEmaBbEntry.generateSignals(candles as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    for (const s of sigs) {
      expect(['BUY', 'SELL']).toContain(s.direction);
      expect(s.price).toBeGreaterThan(0);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
      expect(s.barIndex).toBeGreaterThanOrEqual(0);
      expect(s.barIndex).toBeLessThan(candles.length);
    }
  });

  it('handles too-few candles', () => {
    const sigs = vwapEmaBbEntry.generateSignals([] as any, { symbol: 'BTCUSD', timeframe: 'H1' });
    expect(sigs).toEqual([]);
  });
});

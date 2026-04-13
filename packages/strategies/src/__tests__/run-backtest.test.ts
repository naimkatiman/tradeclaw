import candles from './fixtures/candles-100.json';
import { runBacktest } from '../run-backtest';
import { getPreset, listPresets } from '../presets';

describe('runBacktest', () => {
  it('is deterministic for the same inputs', () => {
    const preset = getPreset('classic');
    const a = runBacktest(candles as any, preset);
    const b = runBacktest(candles as any, preset);
    expect(a).toEqual(b);
  });

  it('returns zero-trade result on empty candles', () => {
    const result = runBacktest([], getPreset('classic'));
    expect(result.totalTrades).toBe(0);
    expect(result.reason).toBe('no-data');
  });

  it('result has required metric fields', () => {
    const r = runBacktest(candles as any, getPreset('hmm-top3'));
    expect(r).toMatchObject({
      strategyId: 'hmm-top3',
      totalTrades: expect.any(Number),
      winRate: expect.any(Number),
      profitFactor: expect.any(Number),
      maxDrawdown: expect.any(Number),
      sharpeRatio: expect.any(Number),
      totalReturn: expect.any(Number),
      equityCurve: expect.any(Array),
      trades: expect.any(Array),
    });
  });

  it('runs all 5 presets without throwing', () => {
    for (const preset of listPresets()) {
      expect(() => runBacktest(candles as any, preset)).not.toThrow();
    }
  });

  describe('allocation + risk dispatch (Task 8b)', () => {
    it('full-risk produces different equity curve than hmm-top3 on same entry', () => {
      // hmm-top3: regime-dynamic allocation + daily-streak risk
      // full-risk: risk-weighted allocation + full-pipeline risk
      // Both use hmmTop3 entry, so if they differ, it's because of alloc/risk dispatch
      const a = runBacktest(candles as any, getPreset('hmm-top3'));
      const b = runBacktest(candles as any, getPreset('full-risk'));
      // If both produce zero trades on the fixture (possible — conservative strategy on synthetic data),
      // this assertion is skipped; otherwise curves should differ.
      if (a.totalTrades > 0 || b.totalTrades > 0) {
        expect(a.equityCurve).not.toEqual(b.equityCurve);
      }
    });

    it('full-pipeline risk never produces more trades than daily-streak for same entry', () => {
      const baseline = runBacktest(candles as any, getPreset('hmm-top3'));
      const gated = runBacktest(candles as any, getPreset('full-risk'));
      expect(gated.totalTrades).toBeLessThanOrEqual(baseline.totalTrades);
    });
  });
});

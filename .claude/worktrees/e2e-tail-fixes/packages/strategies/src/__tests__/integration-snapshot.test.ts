import candles from './fixtures/candles-100.json';
import { runBacktest } from '../run-backtest';
import { listPresets } from '../presets';

describe('preset comparison snapshot', () => {
  it('produces stable metrics across all 5 presets', () => {
    const results = listPresets().map((p) => {
      const r = runBacktest(candles as any, p);
      return {
        id: p.id,
        totalTrades: r.totalTrades,
        winRate: Number(r.winRate.toFixed(4)),
        profitFactor: Number.isFinite(r.profitFactor) ? Number(r.profitFactor.toFixed(4)) : 'inf',
        maxDrawdown: Number(r.maxDrawdown.toFixed(4)),
        totalReturn: Number(r.totalReturn.toFixed(4)),
      };
    });
    expect(results).toMatchSnapshot();
  });
});

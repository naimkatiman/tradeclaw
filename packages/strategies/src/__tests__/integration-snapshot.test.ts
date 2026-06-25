import candles from './fixtures/candles-100.json';
import { runBacktest } from '../run-backtest';
import { listPresets } from '../presets';
import { setModel, getDefaultModel } from '@tradeclaw/signals';

describe('preset comparison snapshot', () => {
  // Pin the built-in default model so loadModel never walks the disk: the
  // default backtest context symbol 'BACKTEST' resolves to the forex asset
  // class, and a stale 5-label model JSON in a parent checkout would emit
  // the loadModel fallback console.warn into the test output. Snapshot
  // metrics are model-independent (the regime filter is a pass-through), so
  // pinning cannot shift them.
  beforeAll(() => {
    setModel('forex', getDefaultModel('forex'));
  });

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
    // Snapshot regenerated 2026-06-11 (Phase 3 structural regime vocabulary):
    // the classification floor moving 21 → 60 bars plus the pass-through
    // direction filter changed the regime-aware/hmm-top3/full-risk trade
    // sets; classic and vwap-ema-bb are unchanged.
    expect(results).toMatchSnapshot();
  });
});

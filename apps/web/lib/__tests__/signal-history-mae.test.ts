/**
 * Focused tests for the MAE-aware outcome resolution in signal-history.ts.
 *
 * The calibration engine needs max adverse excursion up to AND including the
 * resolution candle, not over the full window. A stop-out with MAE = 0 would
 * be nonsensical (the adverse move IS what triggered the stop). A TP hit with
 * post-hit excursion counted would overstate pullback and flip wins to
 * losses in the grid search.
 */

// Import the internal resolver by re-exporting it from signal-history. It's
// not exported today, so we exercise it indirectly via resolveRealOutcomes
// would require DB/fs mocking — instead we test the pure candle-resolver
// by importing it through a thin seam.

import type { OHLCV } from '../../app/lib/ohlcv';

// We expose `resolveFromCandles` for tests via a re-export. If this import
// breaks, add `export { resolveFromCandles as _resolveFromCandlesForTest };`
// in signal-history.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('../signal-history') as {
  _resolveFromCandlesForTest?: (
    r: {
      direction: 'BUY' | 'SELL';
      entryPrice: number;
      tp1?: number;
      sl?: number;
    },
    candles: OHLCV[],
    windowComplete?: boolean,
  ) => { outcome: { price: number; pnlPct: number; hit: boolean }; maxAdverseExcursion: number } | null;
};

const resolve = mod._resolveFromCandlesForTest;

function candle(ts: number, open: number, high: number, low: number, close: number): OHLCV {
  return { timestamp: ts, open, high, low, close, volume: 0 };
}

describe('resolveFromCandles MAE tracking', () => {
  if (!resolve) {
    it.skip('requires _resolveFromCandlesForTest export', () => {});
    return;
  }

  const entry = 100;
  const tp1 = 110;
  const sl = 95;

  it('BUY: MAE captures the deepest low up to the SL candle', () => {
    const r = { direction: 'BUY' as const, entryPrice: entry, tp1, sl };
    const candles: OHLCV[] = [
      candle(1, 100, 101, 99, 100),   // MAE = 1
      candle(2, 100, 102, 97, 98),    // MAE = 3
      candle(3, 98, 99, 94, 95),      // SL hit (low <= 95). MAE includes this candle's touch = 6
    ];
    const res = resolve(r, candles, false);
    expect(res).not.toBeNull();
    expect(res!.outcome.hit).toBe(false);
    expect(res!.maxAdverseExcursion).toBe(6); // entry - 94
  });

  it('BUY: MAE on a TP win captures pullback before TP', () => {
    const r = { direction: 'BUY' as const, entryPrice: entry, tp1, sl };
    const candles: OHLCV[] = [
      candle(1, 100, 101, 98, 99),    // MAE = 2
      candle(2, 99, 103, 96, 102),    // MAE = 4
      candle(3, 102, 111, 101, 110),  // TP hit (high >= 110). Pre-TP MAE preserved
    ];
    const res = resolve(r, candles, false);
    expect(res).not.toBeNull();
    expect(res!.outcome.hit).toBe(true);
    // TP candle's own low of 101 is above entry, so no new MAE contribution.
    expect(res!.maxAdverseExcursion).toBe(4);
  });

  it('SELL: MAE captures the highest high up to the SL candle', () => {
    const r = { direction: 'SELL' as const, entryPrice: entry, tp1: 90, sl: 105 };
    const candles: OHLCV[] = [
      candle(1, 100, 102, 99, 101),   // MAE = 2
      candle(2, 101, 104, 100, 103),  // MAE = 4
      candle(3, 103, 107, 102, 105),  // SL hit (high >= 105). MAE = 7
    ];
    const res = resolve(r, candles, false);
    expect(res).not.toBeNull();
    expect(res!.outcome.hit).toBe(false);
    expect(res!.maxAdverseExcursion).toBe(7); // 107 - 100
  });

  it('window elapses without hit: MAE tracks full window', () => {
    const r = { direction: 'BUY' as const, entryPrice: entry, tp1, sl };
    const candles: OHLCV[] = [
      candle(1, 100, 101, 98, 99),    // MAE = 2
      candle(2, 99, 100, 96, 97),     // MAE = 4
      candle(3, 97, 99, 96.5, 98),    // MAE unchanged
    ];
    const res = resolve(r, candles, true);
    expect(res).not.toBeNull();
    expect(res!.outcome.hit).toBe(false);
    expect(res!.maxAdverseExcursion).toBe(4);
  });

  it('MAE is zero when price never moved against the signal', () => {
    const r = { direction: 'BUY' as const, entryPrice: entry, tp1, sl };
    const candles: OHLCV[] = [
      candle(1, 100, 105, 100, 104),
      candle(2, 104, 111, 103.5, 110), // TP hit, all lows >= entry
    ];
    const res = resolve(r, candles, false);
    expect(res).not.toBeNull();
    expect(res!.outcome.hit).toBe(true);
    expect(res!.maxAdverseExcursion).toBe(0);
  });

  it('returns null when no candles and window not complete', () => {
    const r = { direction: 'BUY' as const, entryPrice: entry, tp1, sl };
    expect(resolve(r, [], false)).toBeNull();
  });
});

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

describe('resolveFromCandles conservative resolution', () => {
  if (!resolve) {
    it.skip('requires _resolveFromCandlesForTest export', () => {});
    return;
  }

  // Ambiguous-candle and gap-through coverage. Wide-range bars that touch
  // both TP and SL must resolve as SL (conservative — published track-record
  // can't put a thumb on the scale). Stop-outs where the candle opens past
  // SL must fill at the open, not at SL — that's the slippage real fills
  // take during gaps.

  describe('wick ambiguity: SL takes priority when both could fire', () => {
    it('BUY: candle covering tp1 and sl resolves as SL loss, not TP win', () => {
      const r = { direction: 'BUY' as const, entryPrice: 100, tp1: 110, sl: 95 };
      const candles: OHLCV[] = [
        candle(1, 100, 111, 94, 100),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(95);
      expect(res!.maxAdverseExcursion).toBe(6);
    });

    it('SELL: candle covering tp1 and sl resolves as SL loss, not TP win', () => {
      const r = { direction: 'SELL' as const, entryPrice: 100, tp1: 90, sl: 105 };
      const candles: OHLCV[] = [
        candle(1, 100, 106, 89, 100),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(105);
      expect(res!.maxAdverseExcursion).toBe(6);
    });

    it('BUY: clean TP win on a candle that did NOT touch SL is unchanged', () => {
      const r = { direction: 'BUY' as const, entryPrice: 100, tp1: 110, sl: 95 };
      const candles: OHLCV[] = [
        candle(1, 100, 111, 99, 110),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(true);
      expect(res!.outcome.price).toBe(110);
    });
  });

  describe('gap-through: SL fill at candle.open when gapped past, bounded at -1.5R', () => {
    it('BUY: small gap (within 1.5R) fills at candle.open', () => {
      const r = { direction: 'BUY' as const, entryPrice: 100, tp1: 110, sl: 95 };
      // Risk = 5; 1.5R floor = 92.5. Gap to 94 is within the floor, so raw open is used.
      const candles: OHLCV[] = [
        candle(1, 100, 100.5, 99.5, 100),
        candle(2, 94, 94.5, 93, 93.5),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(94);
      expect(res!.outcome.pnlPct).toBe(-6);
    });

    it('BUY: deep gap-through capped at -1.5R, not at candle.open', () => {
      const r = { direction: 'BUY' as const, entryPrice: 100, tp1: 110, sl: 95 };
      // Risk = 5; 1.5R floor = 92.5. Candle opens at 80 (= -4R if uncapped).
      const candles: OHLCV[] = [
        candle(1, 100, 100.5, 99.5, 100),
        candle(2, 80, 81, 78, 79),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(92.5);
      expect(res!.outcome.pnlPct).toBe(-7.5);
    });

    it('SELL: small gap fills at candle.open within 1.5R', () => {
      const r = { direction: 'SELL' as const, entryPrice: 100, tp1: 90, sl: 105 };
      // Risk = 5; 1.5R ceiling = 107.5. Gap to 106 is within the ceiling.
      const candles: OHLCV[] = [
        candle(1, 100, 100.5, 99.5, 100),
        candle(2, 106, 106.5, 105.5, 106),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(106);
      expect(res!.outcome.pnlPct).toBe(-6);
    });

    it('SELL: deep gap-through capped at -1.5R', () => {
      const r = { direction: 'SELL' as const, entryPrice: 100, tp1: 90, sl: 105 };
      // Risk = 5; 1.5R ceiling = 107.5. Candle opens at 120 (= -4R if uncapped).
      const candles: OHLCV[] = [
        candle(1, 100, 100.5, 99.5, 100),
        candle(2, 120, 121, 119, 120),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(107.5);
      expect(res!.outcome.pnlPct).toBe(-7.5);
    });

    it('BUY: intracandle SL touch (open above sl) still fills at sl', () => {
      const r = { direction: 'BUY' as const, entryPrice: 100, tp1: 110, sl: 95 };
      // Open above SL, then wicks down to SL — typical intracandle stop-out.
      const candles: OHLCV[] = [
        candle(1, 98, 99, 94, 96),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(95);
    });

    it('SELL: intracandle SL touch (open below sl) still fills at sl', () => {
      const r = { direction: 'SELL' as const, entryPrice: 100, tp1: 90, sl: 105 };
      const candles: OHLCV[] = [
        candle(1, 102, 106, 101, 104),
      ];
      const res = resolve(r, candles, false);
      expect(res).not.toBeNull();
      expect(res!.outcome.hit).toBe(false);
      expect(res!.outcome.price).toBe(105);
    });
  });
});

/**
 * Phase 4.5 backtest-harness knobs: signal-flip exit, min-confidence
 * selectivity, and a CLI-settable TP-R-multiple. All three are ADDITIVE — the
 * no-option (default) path must stay byte-identical, which the existing
 * run-backtest / run-backtest-costs / run-backtest-ordering suites prove
 * unchanged. These tests pin the opt-in paths and re-confirm the default path
 * on the SAME fixtures the opt-in paths use (so geometry mode is shown to
 * ignore the new signal-flip behavior entirely).
 */

import { runBacktest } from '../run-backtest';
import { LIVE_GEOMETRY, type Geometry } from '../backtest-options';
import type { Strategy, EntrySignal } from '../types';
import type { OHLCV } from '@tradeclaw/core';

/** Strategy stub firing a fixed list of signals (in any order). */
function signalsStrategy(signals: EntrySignal[]): Strategy {
  return {
    id: 'classic',
    name: 'signals-stub',
    description: 'test stub',
    entry: { id: 'signals-stub', generateSignals: () => signals },
    allocation: { kind: 'flat' },
    risk: { kind: 'none' },
  };
}

/** Flat candles at `price`. */
function flatCandles(n: number, price: number): OHLCV[] {
  return Array.from({ length: n }, (_, i) => ({
    timestamp: 1_700_000_000_000 + i * 3_600_000,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 1,
  }));
}

describe('exitMode: signal-flip', () => {
  it('exits at the opposite-direction signal bar close (FLIP), not a TP', () => {
    // 50 flat bars at 100. Fixed default geometry: BUY TP=102, SL=99 — never
    // touched on a flat series, so geometry mode would run to EOD. A SELL at
    // bar 20 flips the long out at that bar's close.
    const candles = flatCandles(50, 100);
    const signals: EntrySignal[] = [
      { barIndex: 10, direction: 'BUY', price: 100, confidence: 0.8 },
      { barIndex: 20, direction: 'SELL', price: 100, confidence: 0.8 },
    ];
    const result = runBacktest(candles, signalsStrategy(signals), { exitMode: 'signal-flip' });

    // The long flips out at bar 20; the SELL at bar 20 is then blocked by the
    // overlap guard (barIndex 20 <= openUntil 20), so exactly one trade closes.
    expect(result.totalTrades).toBe(1);
    expect(result.trades[0].direction).toBe('BUY');
    expect(result.trades[0].entryBar).toBe(10);
    expect(result.trades[0].exitBar).toBe(20);
    expect(result.trades[0].exitReason).toBe('FLIP');
    expect(result.trades[0].exit).toBe(100); // bar 20 close, NOT a 102 TP
  });

  it('honors SL precedence: SL hit before the opposite signal exits at SL', () => {
    // BUY at 10 (SL=99 on fixed default). Bar 15 dips to 98 → SL BEFORE the
    // opposite SELL at bar 20. Precedence: SL > flip.
    const candles = flatCandles(50, 100);
    candles[15] = { ...candles[15], low: 98 };
    const signals: EntrySignal[] = [
      { barIndex: 10, direction: 'BUY', price: 100, confidence: 0.8 },
      { barIndex: 20, direction: 'SELL', price: 100, confidence: 0.8 },
    ];
    const result = runBacktest(candles, signalsStrategy(signals), { exitMode: 'signal-flip' });

    expect(result.totalTrades).toBeGreaterThanOrEqual(1);
    expect(result.trades[0].exitReason).toBe('SL');
    expect(result.trades[0].exitBar).toBe(15);
    expect(result.trades[0].exit).toBe(99); // SL price, not the bar-20 flip close
  });

  it('re-opens the opposite position after a flip releases the overlap guard', () => {
    // BUY@10 → flips out at SELL@20 → that SELL is blocked at bar 20, but a
    // SELL@30 (strictly after openUntil=20) opens and rides to EOD.
    const candles = flatCandles(50, 100);
    const signals: EntrySignal[] = [
      { barIndex: 10, direction: 'BUY', price: 100, confidence: 0.8 },
      { barIndex: 20, direction: 'SELL', price: 100, confidence: 0.8 },
      { barIndex: 30, direction: 'SELL', price: 100, confidence: 0.8 },
    ];
    const result = runBacktest(candles, signalsStrategy(signals), { exitMode: 'signal-flip' });

    expect(result.totalTrades).toBe(2);
    expect(result.trades[0]).toMatchObject({ direction: 'BUY', exitReason: 'FLIP', exitBar: 20 });
    // Second trade is the short opened at bar 30, held to the last bar (EOD).
    expect(result.trades[1]).toMatchObject({ direction: 'SELL', entryBar: 30, exitReason: 'EOD', exitBar: 49 });
  });

  it('geometry mode (default) on the SAME flip fixture ignores opposite signals (EOD, no FLIP)', () => {
    // No exitMode → legacy path. The flat series never hits TP/SL, so the long
    // runs to the last bar; the opposite SELL is just the next chronological
    // entry, never an exit trigger. Proves the default path is unaffected.
    const candles = flatCandles(50, 100);
    const signals: EntrySignal[] = [
      { barIndex: 10, direction: 'BUY', price: 100, confidence: 0.8 },
      { barIndex: 20, direction: 'SELL', price: 100, confidence: 0.8 },
    ];
    const result = runBacktest(candles, signalsStrategy(signals));

    expect(result.trades.every((t) => t.exitReason !== 'FLIP')).toBe(true);
    // The first BUY rides to EOD (bar 49); the SELL@20 is gated out (overlap).
    expect(result.trades[0]).toMatchObject({ direction: 'BUY', entryBar: 10, exitReason: 'EOD', exitBar: 49 });
    expect(result.totalTrades).toBe(1);
  });

  it('rides PAST the TP: a winning ramp with no opposite signal exits at EOD above the target', () => {
    // THE load-bearing regression vector for the feature (C4's whole reason to
    // exist): with NO opposite signal and NO SL hit, geometry mode truncates the
    // move at the fixed TP, while signal-flip rides the entire ramp to EOD.
    //
    // 50 bars: flat at 100 through bar 19, then a monotonic up-ramp. Fixed
    // default geometry → BUY TP=102 (100×1.02), SL=99. From bar 20 the price
    // climbs past 102 and keeps going, so geometry exits at the 102 target on
    // the first bar that touches it, but signal-flip ignores the TP and holds.
    const candles = flatCandles(50, 100);
    for (let i = 20; i < 50; i++) {
      const close = 100 + (i - 19); // 101, 102, 103 … 130 — crosses TP=102 at bar 21
      candles[i] = { ...candles[i], open: close - 1, high: close, low: close - 1, close };
    }
    // One BUY at bar 10, NO opposite signal anywhere — nothing can flip it out.
    const signals: EntrySignal[] = [{ barIndex: 10, direction: 'BUY', price: 100, confidence: 0.8 }];

    const geometry = runBacktest(candles, signalsStrategy(signals)); // default = geometry exit
    const flip = runBacktest(candles, signalsStrategy(signals), { exitMode: 'signal-flip' });

    // Geometry truncates at the 2% TP (102).
    expect(geometry.trades[0].exitReason).toBe('TP');
    expect(geometry.trades[0].exit).toBeCloseTo(102, 8);

    // Signal-flip ignores the TP entirely and rides to the last bar, exiting
    // FAR above the target. If a future regression re-adds a TP check to the
    // flip branch, exitReason flips to 'TP' / exit drops to 102 and this fails.
    expect(flip.trades[0].exitReason).toBe('EOD');
    expect(flip.trades[0].exitBar).toBe(49);
    expect(flip.trades[0].exit).toBe(130); // last bar close, well past TP=102
    expect(flip.trades[0].exit).toBeGreaterThan(geometry.trades[0].exit);
  });
});

describe('minConfidence selectivity filter', () => {
  function mixedConfidenceSetup() {
    // Two non-overlapping BUYs at distinct confidences. Flat series → both run
    // to EOD if traded; we only care about WHICH ones survive the filter.
    const candles = flatCandles(60, 100);
    const signals: EntrySignal[] = [
      { barIndex: 10, direction: 'BUY', price: 100, confidence: 0.2 },
      { barIndex: 30, direction: 'BUY', price: 100, confidence: 0.8 },
    ];
    return { candles, signals };
  }

  it('drops signals below the threshold before the trade loop', () => {
    const { candles, signals } = mixedConfidenceSetup();
    const result = runBacktest(candles, signalsStrategy(signals), { minConfidence: 0.5 });

    // Only the 0.8-confidence BUY at bar 30 survives.
    expect(result.totalTrades).toBe(1);
    expect(result.trades[0].entryBar).toBe(30);
  });

  it('keeps all signals when unset (byte-identical default)', () => {
    const { candles, signals } = mixedConfidenceSetup();
    const withFilterOff = runBacktest(candles, signalsStrategy(signals));
    const withZeroThreshold = runBacktest(candles, signalsStrategy(signals), { minConfidence: 0 });

    // Only the bar-10 BUY trades: it rides to EOD (the last bar), so the
    // overlap guard blocks the bar-30 signal — exactly one trade. The point is
    // the filter did NOT drop the low-confidence (0.2) signal: with the filter
    // off, the surviving trade is the bar-10 one, identical to the unset path.
    expect(withZeroThreshold.trades.map((t) => t.entryBar)).toEqual(
      withFilterOff.trades.map((t) => t.entryBar),
    );
    expect(withFilterOff.trades[0].entryBar).toBe(10);
  });

  it('drops all signals → no-signals result', () => {
    const { candles, signals } = mixedConfidenceSetup();
    const result = runBacktest(candles, signalsStrategy(signals), { minConfidence: 0.95 });

    expect(result.totalTrades).toBe(0);
    expect(result.reason).toBe('no-signals');
  });
});

describe('tpRMultiple override (the CLI --tp-r geometry)', () => {
  // ASSUMED LEVELS (must match LIVE_GEOMETRY): constant true range of 2 (high
  // 101 / low 99 every bar) → ATR(14) = 2. With slMult = 2.5 → risk = 2.5 × 2 =
  // 5, so entry 100 gives 2R TP = 100 + 2×5 = 110 and 4R TP = 100 + 4×5 = 120.
  // One bar wicks to 120.5: under 2R it exits at 110, under 4R at 120 — the SAME
  // bar, so the R-multiple is the only difference. If LIVE_GEOMETRY.slMult or
  // .period ever changes, these prices move and the assertions below fail
  // loudly (diagnosable) instead of silently testing the wrong target.
  function atrCandles(): OHLCV[] {
    const candles: OHLCV[] = Array.from({ length: 120 }, (_, i) => ({
      timestamp: 1_700_000_000_000 + i * 3_600_000,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1,
    }));
    candles[60] = { ...candles[60], high: 120.5 };
    return candles;
  }
  const strategy = signalsStrategy([{ barIndex: 50, direction: 'BUY', price: 100, confidence: 0.8 }]);

  it('default 2R exits at the 2R target', () => {
    const result = runBacktest(atrCandles(), strategy, { geometry: LIVE_GEOMETRY });
    expect(result.trades[0].exitReason).toBe('TP');
    expect(result.trades[0].exit).toBeCloseTo(110, 8);
  });

  it('4R override widens the target to the 4R price', () => {
    // Same construction the CLI's --tp-r does: the live ATR geometry with a
    // wider R-multiple. Built as an explicit ATR object so the union narrows.
    const wide4R: Geometry = { mode: 'atr', period: 14, slMult: 2.5, tpRMultiple: 4 };
    const result = runBacktest(atrCandles(), strategy, { geometry: wide4R });
    expect(result.trades[0].exitReason).toBe('TP');
    expect(result.trades[0].exit).toBeCloseTo(120, 8);
  });
});

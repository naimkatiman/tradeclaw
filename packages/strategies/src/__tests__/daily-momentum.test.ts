/**
 * Tests for the daily time-series momentum entry module (Phase 4.5, D2).
 * Written first (TDD), then the implementation is filled in.
 *
 * Signal: trailing N-day return relative to the N-day SMA.
 *   momentum(i) = close[i] - SMA_N(close, i)   (price vs trailing N-day MA)
 *   long bias when momentum > 0, short when momentum < 0.
 * Entry timing: emit ONLY on a fresh momentum cross (sign flip of momentum),
 *   so a sustained trend produces a single entry, not one per bar.
 * Confidence: normalized |distance of price from the N-day MA|, clamped [0,1].
 */
import type { OHLCV } from '@tradeclaw/core';
import { dailyMomentumEntry } from '../entry/daily-momentum';

const BASE_TS = 1700000000000;
const DAY_MS = 86_400_000;

const CTX = { symbol: 'BTCUSDT', timeframe: '1d' } as const;

/** Build candles from an explicit close series. Wicks are tight & symmetric. */
function candlesFromCloses(closes: number[]): OHLCV[] {
  return closes.map((close, i) => ({
    timestamp: BASE_TS + i * DAY_MS,
    open: close,
    high: close + Math.abs(close) * 0.001,
    low: close - Math.abs(close) * 0.001,
    close,
    volume: 100,
  }));
}

/** Monotonically rising close series. */
function risingCloses(n: number, start = 100, step = 1): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/** Monotonically falling close series. */
function fallingCloses(n: number, start = 300, step = 1): number[] {
  return Array.from({ length: n }, (_, i) => start - i * step);
}

/** Flat (constant) close series. */
function flatCloses(n: number, value = 100): number[] {
  return Array.from({ length: n }, () => value);
}

/**
 * A genuine LONG onset: `down` bars falling (price drops below its trailing MA,
 * establishing a real NEGATIVE momentum sign), then `up` bars rising back
 * through the MA. The cross detector fires on the genuine negative→positive
 * flip. This is what a real trend onset looks like — and, unlike a flat→up
 * series, it establishes a real prior sign so the warmup-boundary phantom guard
 * does not suppress it. A strictly monotonic-from-bar-0 series, by contrast, is
 * above its own trailing MA from the first computable bar and never crosses;
 * that degenerate case is intentionally a no-signal case.
 */
function dipThenRising(down: number, up: number, start = 200, downStep = 1, upStep = 1): number[] {
  const trough = start - down * downStep;
  return [...fallingCloses(down, start, downStep), ...risingCloses(up, trough, upStep)];
}

/** A genuine SHORT onset: rise (establishes positive sign), then fall through the MA. */
function peakThenFalling(up: number, down: number, start = 100, upStep = 1, downStep = 1): number[] {
  const peak = start + up * upStep;
  return [...risingCloses(up, start, upStep), ...fallingCloses(down, peak, downStep)];
}

describe('dailyMomentumEntry', () => {
  it('exposes the expected module id', () => {
    expect(dailyMomentumEntry.id).toBe('daily-momentum');
  });

  describe('momentum signal correctness', () => {
    it('emits LONG on a clearly rising series (after an onset)', () => {
      // A real onset: a dip that establishes a negative sign, then a sustained
      // rise that crosses up through the MA → one LONG entry, no SHORT in the
      // up-leg.
      const candles = candlesFromCloses(dipThenRising(40, 100));
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every((s) => s.direction === 'BUY')).toBe(true);
    });

    it('emits SHORT on a clearly falling series (after an onset)', () => {
      const candles = candlesFromCloses(peakThenFalling(40, 100));
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every((s) => s.direction === 'SELL')).toBe(true);
    });

    it('emits NOTHING on a strictly monotonic series with no onset', () => {
      // Documented edge case: a series above its own trailing MA from the first
      // computable bar never crosses, so the cross detector stays silent. This
      // is correct, not a miss — there is no trend ONSET to capture.
      const rising = dailyMomentumEntry.generateSignals(candlesFromCloses(risingCloses(120)), CTX);
      const falling = dailyMomentumEntry.generateSignals(candlesFromCloses(fallingCloses(120)), CTX);
      expect(rising.length).toBe(0);
      expect(falling.length).toBe(0);
    });

    it('emits little/nothing on a flat series', () => {
      const candles = candlesFromCloses(flatCloses(120));
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      // Flat price never crosses its own MA → no momentum cross.
      expect(signals.length).toBe(0);
    });
  });

  describe('entry-timing — low-frequency property', () => {
    it('does NOT emit a signal on every bar of a sustained uptrend', () => {
      // A dip onset, then 200 rising bars. ~200 bars sit above the MA, but only
      // the single up-cross fires — proving the low-frequency property. (The
      // pre-dip down-leg is monotonic from bar 0, so it never flips → no SHORT.)
      const candles = candlesFromCloses(dipThenRising(40, 200));
      const aboveMaBars = 200; // bars where momentum is positive
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(signals.length).toBe(1);
      expect(signals[0].direction).toBe('BUY');
      expect(signals.length).toBeLessThan(aboveMaBars / 10);
    });

    it('emits one entry per regime change, not per bar (down→up→down)', () => {
      // 60 falling, then 60 rising, then 60 falling. Each leg is long enough
      // for the trailing-MA momentum to flip sign exactly once per turn.
      const closes = [
        ...fallingCloses(60, 300, 2),
        ...risingCloses(60, 180, 2),
        ...fallingCloses(60, 300, 2),
      ];
      const candles = candlesFromCloses(closes);
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      // At most a handful of crosses across three legs — tens-per-year scale,
      // not hundreds. Concretely: well under 10 over 180 bars.
      expect(signals.length).toBeLessThan(10);
      expect(signals.length).toBeGreaterThanOrEqual(1);
      // There must be at least one BUY (the up-leg onset).
      expect(signals.some((s) => s.direction === 'BUY')).toBe(true);
    });
  });

  describe('no lookahead', () => {
    it('a signal at bar i is identical when the series is truncated at i+1', () => {
      const closes = [
        ...fallingCloses(50, 300, 2),
        ...risingCloses(80, 200, 2),
      ];
      const candles = candlesFromCloses(closes);
      const full = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(full.length).toBeGreaterThan(0);

      for (const sig of full) {
        const truncated = candles.slice(0, sig.barIndex + 1);
        const reRun = dailyMomentumEntry.generateSignals(truncated, CTX);
        const last = reRun[reRun.length - 1];
        // The signal at bar i must be reproducible from candles[0..i] alone.
        expect(last).toBeDefined();
        expect(last.barIndex).toBe(sig.barIndex);
        expect(last.direction).toBe(sig.direction);
        expect(last.price).toBe(sig.price);
        expect(last.confidence).toBeCloseTo(sig.confidence, 10);
      }
    });
  });

  describe('no phantom cross at the warmup boundary', () => {
    it('does not emit at the first computable bar when the seed bar is exactly on its MA', () => {
      // 28 flat bars → at the seed bar (i = N-1 = 27) close == its trailing mean,
      // so momentum === 0 and prevSign stays 0 (unknown). The next bar drops
      // hard: its momentum is negative. A naive `prevSign >= 0` guard would fire
      // a phantom SELL there, manufacturing an entry from the unknown initial
      // state. The fixed `prevSign > 0` guard must stay silent at that boundary.
      const closes = [
        ...flatCloses(28, 100), // seed bar (i=27) sits exactly on its MA
        ...fallingCloses(40, 96, 2), // first computable momentum is negative
      ];
      const candles = candlesFromCloses(closes);
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      // No signal at the warmup-edge bar (the first computable bar, i = 28).
      expect(signals.some((s) => s.barIndex === 28)).toBe(false);
      // A pure down-leg after the seed never flips sign → no phantom entry at all.
      expect(signals.length).toBe(0);
    });

    it('still fires at the first GENUINE sign flip after an on-MA seed', () => {
      // Same on-MA seed, but now the series falls (establishes a real negative
      // sign) and then rises back through the MA — that genuine negative→positive
      // flip is a real cross and MUST emit a LONG.
      const closes = [
        ...flatCloses(28, 100), // on-MA seed (prevSign 0)
        ...fallingCloses(20, 96, 2), // real negative sign established
        ...risingCloses(60, 58, 3), // climbs back through the MA → genuine flip
      ];
      const candles = candlesFromCloses(closes);
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      // Nothing at the warmup edge; the first entry is a real LONG cross later.
      expect(signals.some((s) => s.barIndex === 28)).toBe(false);
      expect(signals.length).toBeGreaterThan(0);
      expect(signals[0].direction).toBe('BUY');
      expect(signals[0].barIndex).toBeGreaterThan(28);
    });
  });

  describe('warmup', () => {
    it('emits nothing when there are fewer than N bars', () => {
      // Default N = 28; fewer than that → no signals at all.
      const candles = candlesFromCloses(risingCloses(20));
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(signals).toEqual([]);
    });

    it('emits nothing for an empty series', () => {
      expect(dailyMomentumEntry.generateSignals([], CTX)).toEqual([]);
    });
  });

  describe('determinism', () => {
    it('produces identical signals for identical input', () => {
      const candles = candlesFromCloses([
        ...risingCloses(70, 100, 1.5),
        ...fallingCloses(70, 205, 1.5),
      ]);
      const a = dailyMomentumEntry.generateSignals(candles, CTX);
      const b = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(a).toEqual(b);
    });
  });

  describe('confidence convention', () => {
    it('is always within [0, 1]', () => {
      const candles = candlesFromCloses([
        ...fallingCloses(60, 300, 2),
        ...risingCloses(60, 180, 2),
        ...fallingCloses(60, 300, 2),
      ]);
      const signals = dailyMomentumEntry.generateSignals(candles, CTX);
      expect(signals.length).toBeGreaterThan(0);
      for (const s of signals) {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('increases with momentum strength (bigger gap to MA → higher confidence)', () => {
      // Isolate slope cleanly: identical down-leg and identical flat run, so both
      // fixtures cross up at the SAME bar (the gap-to-MA timing artifact is held
      // constant). Only the magnitude of the crossing step differs — a bigger
      // step puts price further above its trailing MA at that bar, so confidence
      // must be strictly higher by a meaningful margin (not a bare `>` that goes
      // vacuous if CONFIDENCE_FULL_SCALE drifts up and both clamp to 0).
      const downLeg = fallingCloses(40, 200, 1); // establishes a negative sign
      const trough = 200 - 40; // last close of the down-leg = 160
      // A flat run just below where the MA will sit, then ONE decisive up-step
      // at the same index in both fixtures.
      const flatRun = flatCloses(30, trough); // 160, 160, ... keeps both identical
      const gentle = candlesFromCloses([...downLeg, ...flatRun, trough + 3]);
      const steep = candlesFromCloses([...downLeg, ...flatRun, trough + 30]);
      const gentleSig = dailyMomentumEntry.generateSignals(gentle, CTX).find((s) => s.direction === 'BUY');
      const steepSig = dailyMomentumEntry.generateSignals(steep, CTX).find((s) => s.direction === 'BUY');
      expect(gentleSig).toBeDefined();
      expect(steepSig).toBeDefined();
      // Same cross bar in both → strength difference is purely the step size.
      expect(steepSig!.barIndex).toBe(gentleSig!.barIndex);
      expect(steepSig!.confidence).toBeGreaterThan(gentleSig!.confidence + 0.05);
    });
  });
});

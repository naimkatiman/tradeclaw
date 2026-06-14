import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';

/**
 * Daily time-series momentum entry (Phase 4.5, design decision D2).
 *
 * The research's #1 cost-surviving timing edge: daily time-series momentum
 * (~28-day lookback, ~5-day hold, Sharpe ~1.5 at 15bps; Han/Kang/Ryu 2023).
 * The empirical edge-map never actually tested this — it ran the `classic`
 * scorer on D1 bars. This module IS that untested candidate, properly specified
 * for DAILY bars.
 *
 * ── Signal ────────────────────────────────────────────────────────────────
 * Trailing-MA time-series momentum:
 *   momentum(i) = close[i] - SMA_N(close[i-N+1 .. i])
 * Positive momentum (price above its trailing N-day mean) = long bias;
 * negative momentum = short bias. N defaults to 28 (the documented lookback).
 *
 * We use a SIMPLE trailing moving average, not an EMA. The signal is the
 * classic time-series momentum baseline — "is price above where it has been
 * over the lookback?" — for which the equal-weight trailing mean is the
 * canonical reference. `calculateEMA` from @tradeclaw/signals is a different
 * (exponentially-weighted) construct, so reusing it would change the signal
 * definition. The trailing SMA is computed with a rolling sum (single pass,
 * O(n)), so this is not a hand-rolled re-implementation of an existing helper
 * with different semantics.
 *
 * ── Entry timing — the key design choice (option (a): fresh momentum cross) ─
 * The harness (`runBacktest`) exits trades via ATR geometry (TP/SL), NOT on
 * signal flip. So this module emits ENTRY signals only; the harness handles
 * exits (a natural multi-day hold under daily geometry).
 *
 * To suit the cost arithmetic (FEWER trades, larger moves), we do NOT emit on
 * every bar momentum is positive — that would over-trade massively. We emit
 * ONLY on a fresh momentum CROSS: the bar where momentum flips
 *   - negative → positive  ⇒  fresh LONG  (trend onset)
 *   - positive → negative  ⇒  fresh SHORT (trend onset)
 * One entry per trend onset captures the start of a sustained daily trend with
 * very low turnover. Expected frequency: roughly the number of trend reversals
 * a daily series makes. Measured over ~6 years of live daily majors this is on
 * the order of ~28–40 entries per symbol per year (tens, not hundreds — far
 * below per-bar over-trading); the exact rate varies with symbol volatility and
 * the lookback N.
 *
 * ── No lookahead ──────────────────────────────────────────────────────────
 * At bar i the signal uses only close[0..i]: the trailing N-bar mean ends at i,
 * and the cross is detected against the PREVIOUS bar's momentum sign (i-1).
 * Bars with fewer than N closes available (warmup) emit nothing.
 *
 * Pure & deterministic: no I/O, no Date, no Math.random.
 */

/** Default time-series momentum lookback, in daily bars. */
const DEFAULT_LOOKBACK = 28;

/**
 * Confidence sensitivity: a momentum strength of this fraction (price this far
 * from its N-day MA, e.g. 0.10 = 10%) maps to confidence ~1.0. Distances below
 * saturate proportionally. Picked so that typical cross-bar gaps on daily crypto
 * (a few percent) land in a useful mid-range, and only large dislocations clamp.
 */
const CONFIDENCE_FULL_SCALE = 0.1;

export const dailyMomentumEntry: EntryModule = {
  id: 'daily-momentum',

  generateSignals(candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
    const n = DEFAULT_LOOKBACK;
    // Warmup: need at least N bars to form the first trailing mean, plus one
    // earlier bar to define the previous momentum sign for cross detection.
    if (candles.length <= n) return [];

    const closes = candles.map((c) => c.close);

    const signals: EntrySignal[] = [];

    // Rolling sum of the trailing N closes ending at bar i.
    // Initialise the window over closes[0..n-1] so the first computable bar is
    // i = n-1.
    let windowSum = 0;
    for (let i = 0; i < n; i++) windowSum += closes[i];

    // momentum sign at the previous bar (0 = unknown/flat). Seeded at i = n-1.
    let prevSign = 0;
    {
      const ma = windowSum / n;
      const m = closes[n - 1] - ma;
      prevSign = Math.sign(m);
    }

    for (let i = n; i < candles.length; i++) {
      // Advance the rolling window to end at bar i: add close[i], drop close[i-n].
      windowSum += closes[i] - closes[i - n];
      const ma = windowSum / n;
      const momentum = closes[i] - ma;
      const sign = Math.sign(momentum);

      // Fresh cross: sign FLIPPED from a genuine opposite prior sign. We require
      // an explicit opposite sign (< 0 / > 0), NOT just "non-positive/non-negative".
      // prevSign starts at 0 (unknown) and only updates on non-flat bars, so a
      // first-computable bar with non-zero momentum after a flat/on-MA seed must
      // NOT fire a phantom cross from the unknown initial state — a real cross
      // needs a real prior sign to flip from.
      const crossedUp = sign > 0 && prevSign < 0;
      const crossedDown = sign < 0 && prevSign > 0;

      if (crossedUp || crossedDown) {
        const price = closes[i];
        // Momentum strength = relative distance of price from its N-day MA.
        const strength = ma !== 0 ? Math.abs(momentum) / Math.abs(ma) : 0;
        const confidence = Math.min(1, Math.max(0, strength / CONFIDENCE_FULL_SCALE));

        signals.push({
          barIndex: i,
          direction: crossedUp ? 'BUY' : 'SELL',
          price,
          confidence,
          reason: crossedUp ? 'daily-momentum-long-cross' : 'daily-momentum-short-cross',
        });
      }

      // Only update the tracked sign when momentum is non-flat, so a run of
      // exactly-flat bars between two same-direction legs does not manufacture
      // a spurious cross.
      if (sign !== 0) prevSign = sign;
    }

    return signals;
  },
};

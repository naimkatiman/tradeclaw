/**
 * Tests for selectStrategyForRegime (D1) and passesTrendFilter (D2).
 * Written first (TDD), then the implementation is filled in.
 */
import type { OHLCV } from '@tradeclaw/core';
import type { MarketRegime } from '@tradeclaw/signals';
import { calculateADX } from '@tradeclaw/signals';
import { selectStrategyForRegime, passesTrendFilter } from '../router';

// ---------------------------------------------------------------------------
// Helpers for building deterministic OHLCV fixtures
// ---------------------------------------------------------------------------

/**
 * Build a monotonically rising close series.
 * open = close - 1, high = close + 1, low = close - 2, volume = 100.
 * `n` bars, starting at price `startPrice`, incrementing by `step` each bar.
 */
/** Base timestamp (ms) for fixture candles — arbitrary, just needs to be a number. */
const BASE_TS = 1700000000000;
/** 1 hour in ms — candles are H1 in the pilot plan context. */
const HOUR_MS = 3_600_000;

function risingCandles(n: number, startPrice = 100, step = 0.5): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = startPrice + i * step;
    return { timestamp: BASE_TS + i * HOUR_MS, open: close - 1, high: close + 1, low: close - 2, close, volume: 100 };
  });
}

/**
 * Build a monotonically falling close series.
 * `n` bars, starting at price `startPrice`, decrementing by `step` each bar.
 */
function fallingCandles(n: number, startPrice = 200, step = 0.5): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = startPrice - i * step;
    return { timestamp: BASE_TS + i * HOUR_MS, open: close + 1, high: close + 2, low: close - 1, close, volume: 100 };
  });
}

/**
 * Build an oscillating (choppy) close series with small amplitude.
 * close alternates ±0.05 around `base`. Very low-momentum → ADX < 20.
 */
function choppyCandles(n: number, base = 100): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = base + (i % 2 === 0 ? 0.05 : -0.05);
    return { timestamp: BASE_TS + i * HOUR_MS, open: close, high: close + 0.02, low: close - 0.02, close, volume: 100 };
  });
}

/**
 * Build a series whose CLOSE drifts slowly upward (so EMA-50 slope rises) but
 * whose bar-to-bar highs/lows oscillate symmetrically — keeping directional
 * movement (+DM vs -DM) near-balanced so ADX stays well below 20.
 *
 * Close drifts +drift each bar; high/low add a large alternating wick so the
 * true-range is dominated by the symmetric wick swing, not the tiny drift.
 * This isolates the ADX gate: slope agrees with BUY, but ADX < adxMin.
 */
function gentleRiseLowAdxCandles(n: number, startPrice = 100, drift = 0.01, wick = 3): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = startPrice + i * drift;
    const up = i % 2 === 0;
    return {
      timestamp: BASE_TS + i * HOUR_MS,
      open: close,
      high: close + (up ? wick : wick * 0.4),
      low: close - (up ? wick * 0.4 : wick),
      close,
      volume: 100,
    };
  });
}

// ---------------------------------------------------------------------------
// D1 — selectStrategyForRegime
// ---------------------------------------------------------------------------

describe('selectStrategyForRegime', () => {
  it('trend regime → hmm-top3', () => {
    expect(selectStrategyForRegime('trend', 'BUY')).toBe('hmm-top3');
    expect(selectStrategyForRegime('trend', 'SELL')).toBe('hmm-top3');
  });

  it('volatile regime → vwap-ema-bb', () => {
    expect(selectStrategyForRegime('volatile', 'BUY')).toBe('vwap-ema-bb');
    expect(selectStrategyForRegime('volatile', 'SELL')).toBe('vwap-ema-bb');
  });

  it('range regime → vwap-ema-bb', () => {
    expect(selectStrategyForRegime('range', 'BUY')).toBe('vwap-ema-bb');
    expect(selectStrategyForRegime('range', 'SELL')).toBe('vwap-ema-bb');
  });

  it('unknown / invalid regime → vwap-ema-bb (range fallback)', () => {
    // Cast an invalid string to MarketRegime to exercise the fallback branch.
    const unknown = 'neutral' as MarketRegime;
    expect(selectStrategyForRegime(unknown, 'BUY')).toBe('vwap-ema-bb');
    expect(selectStrategyForRegime(unknown, 'SELL')).toBe('vwap-ema-bb');

    const empty = '' as MarketRegime;
    expect(selectStrategyForRegime(empty, 'BUY')).toBe('vwap-ema-bb');

    const arbitrary = 'sideways' as MarketRegime;
    expect(selectStrategyForRegime(arbitrary, 'SELL')).toBe('vwap-ema-bb');
  });

  it('direction does not change the returned strategy (v1 is direction-invariant)', () => {
    const regimes: MarketRegime[] = ['trend', 'volatile', 'range'];
    for (const r of regimes) {
      expect(selectStrategyForRegime(r, 'BUY')).toBe(selectStrategyForRegime(r, 'SELL'));
    }
  });
});

// ---------------------------------------------------------------------------
// D2 — passesTrendFilter
// ---------------------------------------------------------------------------

/**
 * For a reliable rising-EMA slope we need well above 50 bars.
 * 100 bars rising at step=1 guarantees EMA-50 at bar 99 >> EMA-50 at bar 99-N,
 * and the large bar moves guarantee ADX >> 20.
 */
describe('passesTrendFilter', () => {
  const RISING = risingCandles(100, 100, 1);   // very strong uptrend
  const FALLING = fallingCandles(100, 200, 1);  // very strong downtrend
  const CHOPPY = choppyCandles(100);            // tiny oscillation, ADX << 20

  // ── Rising series ──────────────────────────────────────────────────────

  it('rising series passes BUY', () => {
    expect(passesTrendFilter(RISING, 'BUY')).toBe(true);
  });

  it('rising series fails SELL (EMA slope disagrees with SELL direction)', () => {
    expect(passesTrendFilter(RISING, 'SELL')).toBe(false);
  });

  // ── Falling series ─────────────────────────────────────────────────────

  it('falling series passes SELL', () => {
    expect(passesTrendFilter(FALLING, 'SELL')).toBe(true);
  });

  it('falling series fails BUY (EMA slope disagrees with BUY direction)', () => {
    expect(passesTrendFilter(FALLING, 'BUY')).toBe(false);
  });

  // ── Choppy series (low ADX) ────────────────────────────────────────────

  it('choppy fixture actually has ADX < 20 (guards against vacuous "fails" tests)', () => {
    const highs = CHOPPY.map((c) => c.high);
    const lows = CHOPPY.map((c) => c.low);
    const closes = CHOPPY.map((c) => c.close);
    const { value } = calculateADX(highs, lows, closes, 14);
    expect(value).toBeLessThan(20);
  });

  it('choppy low-ADX series fails BUY', () => {
    expect(passesTrendFilter(CHOPPY, 'BUY')).toBe(false);
  });

  it('choppy low-ADX series fails SELL', () => {
    expect(passesTrendFilter(CHOPPY, 'SELL')).toBe(false);
  });

  // ── ADX gate is load-bearing: rising slope alone is not enough ──────────

  it('rising-slope-but-low-ADX series fails BUY (ADX gate rejects despite slope agreement)', () => {
    const series = gentleRiseLowAdxCandles(100);
    const highs = series.map((c) => c.high);
    const lows = series.map((c) => c.low);
    const closes = series.map((c) => c.close);
    const { value: adx } = calculateADX(highs, lows, closes, 14);

    // Precondition: ADX is genuinely below the 20 gate...
    expect(adx).toBeLessThan(20);
    // ...yet the close drifts up so the EMA-50 slope agrees with BUY. If the
    // ADX gate were not load-bearing this would pass — it must NOT.
    expect(passesTrendFilter(series, 'BUY')).toBe(false);
    // Drop adxMin below the measured value and it passes — proving the slope
    // condition was satisfied all along and ADX was the sole blocker.
    expect(passesTrendFilter(series, 'BUY', { adxMin: 0 })).toBe(true);
  });

  // ── Insufficient bars ─────────────────────────────────────────────────

  it('empty candles returns false', () => {
    expect(passesTrendFilter([], 'BUY')).toBe(false);
  });

  it('fewer than 50 candles returns false (EMA-50 warmup not met)', () => {
    expect(passesTrendFilter(risingCandles(49), 'BUY')).toBe(false);
  });

  it('exactly 50 candles returns false (need >50 for slope lookback)', () => {
    // With exactly emaPeriod bars we cannot compute a slope (need at least
    // emaPeriod + slopeLookback bars).
    expect(passesTrendFilter(risingCandles(50), 'BUY')).toBe(false);
  });

  // ── Default opts respected (no opts param) ────────────────────────────

  it('accepts custom emaPeriod / adxPeriod / adxMin', () => {
    // Use a shorter emaPeriod to verify opts are wired in.
    // Rising series with emaPeriod=10 should still pass BUY.
    expect(passesTrendFilter(RISING, 'BUY', { emaPeriod: 10, adxPeriod: 14, adxMin: 20 })).toBe(true);
    // Raise adxMin above any possible value → should fail.
    expect(passesTrendFilter(RISING, 'BUY', { adxMin: 101 })).toBe(false);
  });
});

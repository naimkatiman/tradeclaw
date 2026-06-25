/**
 * Unit tests for the structural regime feature extractors (Phase 3, plan D5).
 *
 * Verifies the four-feature math against the repo's existing scalar
 * implementations (calculateADX, calculateBollingerBands), against
 * hand-computed fixtures, and pins down warmup/null semantics, bounds,
 * feature ordering, and determinism.
 */

import {
  computeRegimeFeatureSeries,
  featureVectorToArray,
  computeAtrSeries,
  REGIME_FEATURE_NAMES,
  MIN_ATR_PERCENTILE_SAMPLES,
} from '../features.js';
import type { RegimeBar, RegimeFeatureVector } from '../features.js';
import { calculateBollingerBands } from '../../indicators.js';
import { calculateADX } from '../../indicators-adx.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOUR_MS = 3_600_000;
const T0 = 1_700_000_000_000;

/** Build bars from closes with a fixed absolute high/low spread around close. */
function barsFromCloses(closes: number[], spread = 0.5): RegimeBar[] {
  return closes.map((close, i) => ({
    timestamp: T0 + i * HOUR_MS,
    open: i === 0 ? close : closes[i - 1],
    high: close + spread,
    low: close - spread,
    close,
    volume: 1_000,
  }));
}

/** Deterministic varied closes (sin-based, no RNG) around 100. */
function syntheticCloses(count: number): number[] {
  const out: number[] = [];
  let price = 100;
  for (let i = 0; i < count; i++) {
    price = price * (1 + 0.01 * Math.sin(i * 0.7 + 1.3) + 0.002 * Math.cos(i * 2.3));
    out.push(price);
  }
  return out;
}

/** Narrow a vector-or-null to a vector, failing the test on null. */
function must(v: RegimeFeatureVector | null | undefined): RegimeFeatureVector {
  if (v === null || v === undefined) throw new Error('expected non-null feature vector');
  return v;
}

// ─── Warmup / null semantics ─────────────────────────────────────────────────

describe('computeRegimeFeatureSeries — warmup', () => {
  it('returns one entry per input bar (including empty input)', () => {
    expect(computeRegimeFeatureSeries([])).toEqual([]);
    const bars = barsFromCloses(syntheticCloses(50));
    expect(computeRegimeFeatureSeries(bars)).toHaveLength(50);
  });

  it('short input → all nulls, never a numeric fallback', () => {
    const vectors = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(40)));
    expect(vectors.every((v) => v === null)).toBe(true);
  });

  it('first non-null vector lands exactly at index 43 with default options', () => {
    // max(adx 2*14-1=27, bb 20-1=19, atrPercentile 14+30-1=43, autocorr 30+1=31) = 43
    const vectors = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(60)));
    expect(vectors.findIndex((v) => v !== null)).toBe(43);
    for (let i = 43; i < vectors.length; i++) {
      expect(vectors[i]).not.toBeNull();
    }
  });

  it('custom options shift the warmup index deterministically', () => {
    // max(adx 2*3-1=5, bb 4-1=3, atrPercentile 3+30-1=32, autocorr 5+1=6) = 32
    const vectors = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(40)), {
      adxPeriod: 3,
      bbPeriod: 4,
      atrPeriod: 3,
      autocorrWindow: 5,
    });
    expect(vectors.findIndex((v) => v !== null)).toBe(3 + MIN_ATR_PERCENTILE_SAMPLES - 1);
  });
});

// ─── ADX (Wilder) ────────────────────────────────────────────────────────────

describe('adx14', () => {
  it('reads high (>25) on a monotonic ramp after warmup', () => {
    const closes = Array.from({ length: 80 }, (_, i) => 100 + i);
    const vectors = computeRegimeFeatureSeries(barsFromCloses(closes));
    expect(must(vectors[79]).adx14).toBeGreaterThan(25);
  });

  it('reads 0 on a flat constant series', () => {
    const vectors = computeRegimeFeatureSeries(barsFromCloses(new Array(60).fill(100), 0));
    expect(must(vectors[59]).adx14).toBe(0);
  });

  it('agrees with the scalar calculateADX on shared inputs', () => {
    const closes = syntheticCloses(120);
    const bars = barsFromCloses(closes);
    const vectors = computeRegimeFeatureSeries(bars);
    const scalar = calculateADX(
      bars.map((b) => b.high),
      bars.map((b) => b.low),
      closes,
      14,
    );
    expect(must(vectors[119]).adx14).toBeCloseTo(scalar.value, 10);
  });
});

// ─── Bollinger bandwidth percent ─────────────────────────────────────────────

describe('bbBandwidthPct', () => {
  it('is 0 for a constant series', () => {
    const vectors = computeRegimeFeatureSeries(barsFromCloses(new Array(60).fill(100), 0));
    expect(must(vectors[59]).bbBandwidthPct).toBe(0);
  });

  it('matches calculateBollingerBands (period 20, 2σ, percent) at multiple bars', () => {
    const closes = syntheticCloses(120);
    const vectors = computeRegimeFeatureSeries(barsFromCloses(closes));
    for (const i of [50, 80, 119]) {
      const expected = calculateBollingerBands(closes.slice(0, i + 1), 20, 2).bandwidth;
      expect(must(vectors[i]).bbBandwidthPct).toBeCloseTo(expected, 6);
    }
  });

  it('scales proportionally with bbMultiplier (3σ = 1.5x the default 2σ bandwidth)', () => {
    const bars = barsFromCloses(syntheticCloses(60));
    const defaultBands = computeRegimeFeatureSeries(bars);
    const wideBands = computeRegimeFeatureSeries(bars, { bbMultiplier: 3 });
    expect(must(wideBands[59]).bbBandwidthPct).toBeCloseTo(
      must(defaultBands[59]).bbBandwidthPct * 1.5,
      10,
    );
  });
});

// ─── ATR (SMA of true range — white-box) ─────────────────────────────────────

describe('computeAtrSeries (white-box)', () => {
  // Hand-computed true ranges (prev-close aware):
  //   TR(1) = max(10.5-9.8=0.7, |10.5-9.5|=1.0, |9.8-9.5|=0.3)    = 1.0
  //   TR(2) = max(10.8-10.0=0.8, |10.8-10.2|=0.6, |10.0-10.2|=0.2) = 0.8
  //   TR(3) = max(11.5-10.4=1.1, |11.5-10.5|=1.0, |10.4-10.5|=0.1) = 1.1
  //   TR(4) = max(11.2-10.6=0.6, |11.2-11.0|=0.2, |10.6-11.0|=0.4) = 0.6
  const fixture: RegimeBar[] = [
    { timestamp: T0 + 0 * HOUR_MS, open: 9.4, high: 10.0, low: 9.0, close: 9.5, volume: 1 },
    { timestamp: T0 + 1 * HOUR_MS, open: 9.9, high: 10.5, low: 9.8, close: 10.2, volume: 1 },
    { timestamp: T0 + 2 * HOUR_MS, open: 10.2, high: 10.8, low: 10.0, close: 10.5, volume: 1 },
    { timestamp: T0 + 3 * HOUR_MS, open: 10.5, high: 11.5, low: 10.4, close: 11.0, volume: 1 },
    { timestamp: T0 + 4 * HOUR_MS, open: 11.0, high: 11.2, low: 10.6, close: 10.9, volume: 1 },
  ];

  it('hand-computed SMA of true range, nulls (not numbers) during warmup', () => {
    const atr = computeAtrSeries(fixture, 3);
    expect(atr.slice(0, 3)).toEqual([null, null, null]);
    expect(atr[3]).toBeCloseTo((1.0 + 0.8 + 1.1) / 3, 10);
    expect(atr[4]).toBeCloseTo((0.8 + 1.1 + 0.6) / 3, 10);
  });

  it('default period 14: nulls through bar 13, first value at bar 14', () => {
    const atr = computeAtrSeries(barsFromCloses(syntheticCloses(20)), 14);
    for (let i = 0; i < 14; i++) {
      expect(atr[i]).toBeNull();
    }
    expect(atr[14]).not.toBeNull();
  });
});

// ─── ATR percentile rank ─────────────────────────────────────────────────────

describe('atrPercentile', () => {
  it('is bounded to [0,1] and hits 1 when recent volatility is the window max', () => {
    // 105 quiet bars, then a 5-bar wide-range volatility burst at the end.
    const bars: RegimeBar[] = [];
    for (let i = 0; i < 110; i++) {
      const close = 100 + Math.sin(i * 0.5);
      const spread = i >= 105 ? 8 : 0.3;
      bars.push({
        timestamp: T0 + i * HOUR_MS,
        open: close,
        high: close + spread,
        low: close - spread,
        close,
        volume: 1_000,
      });
    }
    const vectors = computeRegimeFeatureSeries(bars);
    for (const v of vectors) {
      if (v !== null) {
        expect(v.atrPercentile).toBeGreaterThanOrEqual(0);
        expect(v.atrPercentile).toBeLessThanOrEqual(1);
      }
    }
    expect(must(vectors[109]).atrPercentile).toBe(1);
  });

  it('honors the atrPercentileWindow override (small window re-ranks the current ratio)', () => {
    // High volatility for bars 0..79, then quiet bars with slowly rising
    // spreads: the final ATR ratio is the max of the recent 30 ratios but far
    // below the early high-vol ratios.
    const bars: RegimeBar[] = [];
    for (let i = 0; i < 140; i++) {
      const spread = i < 80 ? 5 : 0.3 + (i - 80) * 0.001;
      bars.push({
        timestamp: T0 + i * HOUR_MS,
        open: 100,
        high: 100 + spread,
        low: 100 - spread,
        close: 100,
        volume: 1_000,
      });
    }
    const fullWindow = computeRegimeFeatureSeries(bars);
    const smallWindow = computeRegimeFeatureSeries(bars, { atrPercentileWindow: 30 });
    expect(must(smallWindow[139]).atrPercentile).toBe(1);
    expect(must(fullWindow[139]).atrPercentile).toBeLessThan(1);
  });
});

// ─── Lag-1 return autocorrelation ────────────────────────────────────────────

describe('returnAutocorr1', () => {
  it('is strongly negative for alternating +1%/−1% closes', () => {
    const closes: number[] = [100];
    for (let i = 1; i < 60; i++) {
      closes.push(closes[i - 1] * (i % 2 === 1 ? 1.01 : 0.99));
    }
    const vectors = computeRegimeFeatureSeries(barsFromCloses(closes, 0.05));
    expect(must(vectors[59]).returnAutocorr1).toBeLessThan(-0.9);
  });

  it('is positive for a smooth monotonic ramp (slowly decaying log returns)', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const vectors = computeRegimeFeatureSeries(barsFromCloses(closes));
    expect(must(vectors[59]).returnAutocorr1).toBeGreaterThan(0.5);
  });

  it('is exactly 0 for constant closes (zero-variance convention)', () => {
    const vectors = computeRegimeFeatureSeries(barsFromCloses(new Array(60).fill(100), 0));
    expect(must(vectors[59]).returnAutocorr1).toBe(0);
  });

  it('a non-positive close nulls every vector whose return window touches it', () => {
    const clean = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(60)));
    const poisonedCloses = syntheticCloses(60);
    poisonedCloses[50] = 0;
    const poisoned = computeRegimeFeatureSeries(barsFromCloses(poisonedCloses));
    expect(clean[55]).not.toBeNull();
    expect(poisoned[55]).toBeNull();
  });
});

// ─── Feature ordering + determinism ──────────────────────────────────────────

describe('REGIME_FEATURE_NAMES / featureVectorToArray', () => {
  it('exposes the canonical feature order', () => {
    expect(REGIME_FEATURE_NAMES).toEqual([
      'adx14',
      'bbBandwidthPct',
      'atrPercentile',
      'returnAutocorr1',
    ]);
  });

  it('featureVectorToArray follows REGIME_FEATURE_NAMES order', () => {
    const v: RegimeFeatureVector = {
      adx14: 1,
      bbBandwidthPct: 2,
      atrPercentile: 3,
      returnAutocorr1: 4,
    };
    expect(featureVectorToArray(v)).toEqual([1, 2, 3, 4]);

    const vectors = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(60)));
    const last = must(vectors[59]);
    expect(featureVectorToArray(last)).toEqual(REGIME_FEATURE_NAMES.map((name) => last[name]));
  });
});

describe('determinism', () => {
  it('same input twice → deep-equal output', () => {
    const bars = barsFromCloses(syntheticCloses(80));
    expect(computeRegimeFeatureSeries(bars)).toEqual(computeRegimeFeatureSeries(bars));
  });
});

// ─── Long-series stability (capped percentile buffer, no NaN) ────────────────

describe('long-series stability', () => {
  it('600-bar deterministic walk: no NaN/Infinity, no gaps after warmup', () => {
    // 600 bars > atrPercentileWindow=252, so the capped ratio buffer's
    // shift() path is exercised; every emitted value must stay finite.
    const vectors = computeRegimeFeatureSeries(barsFromCloses(syntheticCloses(600)));
    const nonNull = vectors.filter((v): v is RegimeFeatureVector => v !== null);
    expect(nonNull).toHaveLength(600 - 43);
    for (const v of nonNull) {
      for (const name of REGIME_FEATURE_NAMES) {
        expect(Number.isFinite(v[name])).toBe(true);
      }
    }
  });
});

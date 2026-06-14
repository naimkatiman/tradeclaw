/**
 * Structural regime feature extractors — Phase 3 regime engine, decision D5
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * This module is the ONLY place the four classifier features are computed.
 * The runtime trend/volatile/range classifier, the research feature exporter,
 * and the Python trainer all consume these numbers (the trainer reads
 * exported vectors and never recomputes), which structurally prevents the
 * known train/inference feature-parity bug class.
 *
 * Conventions (deliberately mirroring the repo):
 * - ADX: Wilder accumulation smoothing, same math as the scalar
 *   `calculateADX` in ../indicators-adx.ts — the two agree on shared inputs.
 * - ATR: SMA of true range (NOT Wilder). Repo-wide live-parity convention,
 *   see `smaTrueRangeAtr` in packages/strategies/src/run-backtest.ts.
 * - BB bandwidth: SMA middle, POPULATION std dev, (upper-lower)/middle*100
 *   (percent, not ratio), matching `calculateBollingerBands` in
 *   ../indicators.ts.
 * - Warmup ALWAYS yields null — never a numeric fallback. The live engine's
 *   `price*0.01` ATR fallback is a known data-poisoning hazard for training;
 *   it must never appear here.
 */

import { clamp } from '../utils.js';

/**
 * One OHLCV bar. Structurally identical to the canonical OHLCV in
 * packages/core/src/plugins/types.ts — defined locally because
 * @tradeclaw/signals has no dependency on @tradeclaw/core.
 */
export interface RegimeBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RegimeFeatureVector {
  /** ADX, Wilder smoothing, period 14. */
  adx14: number;
  /** Bollinger bandwidth percent: (upper-lower)/middle*100, period 20, 2 sigma. */
  bbBandwidthPct: number;
  /** 0..1 percentile rank of ATR(14)/close within the trailing window. */
  atrPercentile: number;
  /** Lag-1 Pearson autocorrelation of log returns over the trailing window. */
  returnAutocorr1: number;
}

export interface RegimeFeatureOptions {
  adxPeriod?: number; // default 14
  bbPeriod?: number; // default 20
  bbMultiplier?: number; // default 2
  atrPeriod?: number; // default 14
  atrPercentileWindow?: number; // default 252
  autocorrWindow?: number; // default 30
}

/** Canonical feature order — `featureVectorToArray` follows this exactly. */
export const REGIME_FEATURE_NAMES = [
  'adx14',
  'bbBandwidthPct',
  'atrPercentile',
  'returnAutocorr1',
] as const;

/**
 * Minimum number of ATR/close samples required before a percentile rank is
 * emitted. Below this floor the rank is statistically meaningless, so the
 * feature stays null.
 *
 * @internal
 */
export const MIN_ATR_PERCENTILE_SAMPLES = 30;

/** Flatten a feature vector to a plain array in REGIME_FEATURE_NAMES order. */
export function featureVectorToArray(v: RegimeFeatureVector): number[] {
  return REGIME_FEATURE_NAMES.map((name) => v[name]);
}

/**
 * Per-bar ADX series with Wilder smoothing. Mirrors the scalar
 * `calculateADX` in ../indicators-adx.ts step for step: TR/+DM/-DM with
 * accumulation smoothing (smooth = smooth - smooth/period + value), DX from
 * +DI/-DI, ADX seeded as the SMA of the first `period` DX values and
 * Wilder-smoothed afterwards. Null until the seed completes (first value at
 * bar index 2*period-1). Single pass.
 */
function computeAdxSeries(bars: RegimeBar[], period: number): (number | null)[] {
  const n = bars.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2) return out;

  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  let trCount = 0;
  const seedDx: number[] = [];
  let adx: number | null = null;

  for (let i = 1; i < n; i++) {
    const highDiff = bars[i].high - bars[i - 1].high;
    const lowDiff = bars[i - 1].low - bars[i].low;
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close),
    );
    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;

    trCount++;
    if (trCount <= period) {
      smoothTR += tr;
      smoothPlusDM += plusDM;
      smoothMinusDM += minusDM;
      if (trCount < period) continue;
    } else {
      smoothTR = smoothTR - smoothTR / period + tr;
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
    }

    const plusDI = smoothTR !== 0 ? clamp((smoothPlusDM / smoothTR) * 100, 0, 100) : 0;
    const minusDI = smoothTR !== 0 ? clamp((smoothMinusDM / smoothTR) * 100, 0, 100) : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum !== 0 ? clamp((Math.abs(plusDI - minusDI) / diSum) * 100, 0, 100) : 0;

    if (adx === null) {
      seedDx.push(dx);
      if (seedDx.length === period) {
        adx = seedDx.reduce((a, b) => a + b, 0) / period;
        out[i] = clamp(adx, 0, 100);
      }
    } else {
      adx = (adx * (period - 1) + dx) / period;
      out[i] = clamp(adx, 0, 100);
    }
  }
  return out;
}

/**
 * Per-bar Bollinger bandwidth percent: SMA middle, POPULATION std dev
 * (divide by period), (upper-lower)/middle*100. Null before `period` bars
 * and when the middle band is ~0 (bandwidth undefined). Single pass via
 * rolling sum / sum-of-squares.
 */
function computeBbBandwidthPctSeries(
  closes: number[],
  period: number,
  multiplier: number,
): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < closes.length; i++) {
    const c = closes[i];
    sum += c;
    sumSq += c * c;
    if (i >= period) {
      const old = closes[i - period];
      sum -= old;
      sumSq -= old * old;
    }
    if (i < period - 1) continue;
    const middle = sum / period;
    if (Math.abs(middle) < 1e-12) continue; // middle ~ 0 -> bandwidth undefined
    // Rolling population variance; clamp tiny negative FP residue to 0.
    // Precision note: the sumSq/n - mean^2 form suffers catastrophic
    // cancellation only when variance is many orders of magnitude below
    // mean^2; for price-scale inputs (>= ~0.1) double precision is ample.
    // Switch to Welford's algorithm if this is ever extended to
    // near-zero-price or near-zero-variance series.
    const variance = Math.max(0, sumSq / period - middle * middle);
    const stdDev = Math.sqrt(variance);
    out[i] = ((2 * multiplier * stdDev) / middle) * 100;
  }
  return out;
}

/**
 * Per-bar ATR as the SMA of the last `period` true ranges (prev-close
 * aware). Deliberately NOT Wilder — matches `smaTrueRangeAtr` in
 * packages/strategies/src/run-backtest.ts (live parity). Null during warmup
 * (first value at bar index `period`); never a numeric fallback. Single pass
 * via rolling sum.
 *
 * Exported for white-box tests only — not part of the package public API
 * (not re-exported from src/index.ts).
 *
 * @internal
 */
export function computeAtrSeries(bars: RegimeBar[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  const trs: number[] = [];
  let sum = 0;
  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prevClose),
      Math.abs(bars[i].low - prevClose),
    );
    trs.push(tr);
    sum += tr;
    if (trs.length > period) sum -= trs[trs.length - 1 - period];
    if (trs.length >= period) out[i] = sum / period;
  }
  return out;
}

/**
 * Percentile rank of the current ATR/close ratio among the trailing
 * `min(window, available)` ratios INCLUDING the current one:
 * rank = (count of values <= current - 1) / (windowCount - 1), clamped to
 * [0,1]. Null until at least MIN_ATR_PERCENTILE_SAMPLES ratios are in the
 * window, or when ATR is null / close is non-positive.
 *
 * The `ratios` buffer is capped at `window` entries (shift() is O(window),
 * fine at the default 252) so memory stays bounded on long series.
 * The rank scan is O(window) per bar — O(n*window) overall. That is inherent
 * to a trailing percentile rank and acceptable (window is a fixed option).
 */
function computeAtrPercentileSeries(
  bars: RegimeBar[],
  atrSeries: (number | null)[],
  window: number,
): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  const ratios: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const atr = atrSeries[i];
    const close = bars[i].close;
    if (atr === null || !(close > 0)) continue;
    const ratio = atr / close;
    ratios.push(ratio);
    if (ratios.length > window) ratios.shift();
    const windowCount = ratios.length;
    if (windowCount < MIN_ATR_PERCENTILE_SAMPLES) continue;
    let countLE = 0;
    for (let j = 0; j < windowCount; j++) {
      if (ratios[j] <= ratio) countLE++;
    }
    // Guard the single-sample case at the division site: (countLE-1)/0 would
    // be NaN and clamp() passes NaN through. Not reachable while the
    // MIN_ATR_PERCENTILE_SAMPLES floor holds, but do not rely on it.
    out[i] = windowCount <= 1 ? 0 : clamp((countLE - 1) / (windowCount - 1), 0, 1);
  }
  return out;
}

/**
 * Lag-1 Pearson autocorrelation of log returns r[i] = ln(close[i]/close[i-1])
 * over the trailing `window` return pairs (r[t-1], r[t]). Null until enough
 * returns exist (first value at bar index window+1) or when any close in the
 * window is non-positive. Zero-variance (constant/degenerate) series -> 0,
 * matching the convention of `pearsonCorrelation` in
 * apps/web/lib/execution/universe.ts (re-implemented here — packages must
 * not import from apps/web).
 *
 * The Pearson recompute is O(window) per bar — O(n*window) overall, bounded
 * by the fixed `autocorrWindow` option (same cost class as the percentile
 * scan above).
 */
function computeReturnAutocorr1Series(closes: number[], window: number): (number | null)[] {
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < window + 2) return out;

  // ret[i] = log return at bar i (i >= 1); NaN when either close is non-positive.
  const ret: number[] = new Array(n).fill(NaN);
  for (let i = 1; i < n; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) ret[i] = Math.log(closes[i] / closes[i - 1]);
  }

  for (let i = window + 1; i < n; i++) {
    // Window needs returns at bars i-window .. i (window pairs).
    let valid = true;
    for (let t = i - window; t <= i; t++) {
      if (Number.isNaN(ret[t])) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    // Two-pass Pearson over pairs x=r[t-1], y=r[t] for t in [i-window+1, i].
    let sx = 0;
    let sy = 0;
    for (let t = i - window + 1; t <= i; t++) {
      sx += ret[t - 1];
      sy += ret[t];
    }
    const mx = sx / window;
    const my = sy / window;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let t = i - window + 1; t <= i; t++) {
      const xa = ret[t - 1] - mx;
      const yb = ret[t] - my;
      num += xa * yb;
      dx += xa * xa;
      dy += yb * yb;
    }
    out[i] = dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
  }
  return out;
}

/**
 * Compute the four structural regime features for every input bar.
 * One entry per bar; null until ALL four features have warmed up.
 * With default options the first non-null vector lands at bar index 43
 * (= atrPeriod + MIN_ATR_PERCENTILE_SAMPLES - 1, the slowest warmup).
 */
export function computeRegimeFeatureSeries(
  bars: RegimeBar[],
  options: RegimeFeatureOptions = {},
): (RegimeFeatureVector | null)[] {
  const adxPeriod = options.adxPeriod ?? 14;
  const bbPeriod = options.bbPeriod ?? 20;
  const bbMultiplier = options.bbMultiplier ?? 2;
  const atrPeriod = options.atrPeriod ?? 14;
  const atrPercentileWindow = options.atrPercentileWindow ?? 252;
  const autocorrWindow = options.autocorrWindow ?? 30;

  const closes = bars.map((b) => b.close);
  const adxSeries = computeAdxSeries(bars, adxPeriod);
  const bbSeries = computeBbBandwidthPctSeries(closes, bbPeriod, bbMultiplier);
  const atrSeries = computeAtrSeries(bars, atrPeriod);
  const atrPercentileSeries = computeAtrPercentileSeries(bars, atrSeries, atrPercentileWindow);
  const autocorrSeries = computeReturnAutocorr1Series(closes, autocorrWindow);

  return bars.map((_, i) => {
    const adx14 = adxSeries[i];
    const bbBandwidthPct = bbSeries[i];
    const atrPercentile = atrPercentileSeries[i];
    const returnAutocorr1 = autocorrSeries[i];
    if (
      adx14 === null ||
      bbBandwidthPct === null ||
      atrPercentile === null ||
      returnAutocorr1 === null
    ) {
      return null;
    }
    return { adx14, bbBandwidthPct, atrPercentile, returnAutocorr1 };
  });
}

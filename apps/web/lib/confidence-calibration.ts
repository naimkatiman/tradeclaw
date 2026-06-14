/**
 * Phase 4 D7 — offline confidence calibrator (pure, reporting-only).
 *
 * Fits a calibration map of raw published confidence → realized
 * P(TP1-before-SL) over resolved signal history, using two standard methods:
 *
 *   1. Isotonic regression (Pool-Adjacent-Violators) — non-parametric,
 *      deterministic, monotone non-decreasing. The default reliability-curve
 *      method: it makes no functional-form assumption, only that a higher
 *      raw confidence should not map to a LOWER calibrated probability.
 *   2. Logistic / Platt scaling — a 1-D `sigmoid(a*conf + b)` fit via a fixed
 *      number of Newton-Raphson iterations. Parametric baseline for comparison.
 *
 * Reliability is measured with Brier score and Expected Calibration Error
 * (ECE) on a TIME-ORDERED holdout: the fit trains on the OLDER rows and is
 * evaluated on the NEWER held-out slice (no peeking — this prevents in-sample
 * over-optimism). The caller surfaces the result through /api/calibration as a
 * REPORTED comparison against raw confidence. Published confidence on signals
 * is NOT changed by anything in this module.
 *
 * Purity contract: no I/O, no Date, no Math.random. The logistic fit uses a
 * fixed iteration count, so the same input yields a byte-identical fit on every
 * run. Small/empty populations return null (insufficient) rather than NaN,
 * Infinity, or a throw.
 *
 * ── Single-feature only (v1), by design ──────────────────────────────────
 * The umbrella plan ultimately wants a MULTI-FEATURE calibrator
 * (features → P(win)) plus a confluence-bonus shrink toward its measured
 * incremental value. Both are DATA-GATED on the migration-051 / Phase 4 D4
 * columns (`pre_boost_confidence`, `mtf_agreement`, `confluence_bonus`,
 * `cost_estimate_pct`), which accrue only FORWARD and are NULL on every
 * historical row. Fitting on mostly-NULL columns would be dishonest, so v1
 * calibrates the single feature available across all history: final
 * `confidence` → P(win). Multi-feature calibration + the confluence shrink are
 * DEFERRED until those columns have ≥4wk of resolved rows. Do NOT add
 * multi-feature fitting here against NULL columns — see plan D7 / D4.
 */

// ── Types ────────────────────────────────────────────────────────

/** One training observation: raw confidence (0-1) and its realized win bit. */
export interface CalibrationPair {
  /** Raw published confidence normalized to [0,1]. */
  conf: number;
  /** 1 = TP1 hit before SL (win), 0 = otherwise. */
  win: number;
}

/** A point fed to the reliability metrics: a probability and its outcome. */
export interface ProbOutcome {
  prob: number;
  win: number;
}

/** One (time, confidence, outcome) row — the input to the orchestrator. */
export interface TimedPair {
  /** Monotone time key (ms epoch or any comparable number). Older = smaller. */
  ts: number;
  conf: number;
  win: number;
}

/**
 * Isotonic calibration map: sorted, deduplicated breakpoints with monotone
 * non-decreasing `y`. `applyIsotonic` does a piecewise-linear interpolation
 * between breakpoints and clamps to the endpoints outside the fitted range.
 */
export interface IsotonicMap {
  /** Breakpoint raw confidences, strictly increasing. */
  x: number[];
  /** Calibrated probabilities at each breakpoint, non-decreasing in [0,1]. */
  y: number[];
}

/** Logistic (Platt) parameters for `sigmoid(a*conf + b)`. */
export interface LogisticFit {
  a: number;
  b: number;
}

export interface HoldoutReliability {
  /** Rows in the time-ordered validation slice. */
  validationSize: number;
  /** Rows in the training slice the maps were fit on. */
  trainSize: number;
  // Metric fields are null when validationSize < MIN_VALIDATION_ROWS — the slice
  // is too thin for a meaningful Brier/ECE estimate. The size fields above stay
  // populated so the consumer can see the slice is thin rather than missing.
  rawBrier: number | null;
  isotonicBrier: number | null;
  logisticBrier: number | null;
  rawEce: number | null;
  isotonicEce: number | null;
  logisticEce: number | null;
}

export interface CalibrationReport {
  /** Total resolved rows considered (train + validation). */
  sampleSize: number;
  /** Fraction of the (time-sorted) tail used for validation. */
  validationFraction: number;
  method: {
    /** Isotonic map fit on the TRAIN slice. Null if train was too thin. */
    isotonic: IsotonicMap | null;
    /** Logistic params fit on the TRAIN slice. Null if train was too thin. */
    logistic: LogisticFit | null;
  };
  holdout: HoldoutReliability;
}

// ── Tunables (documented) ────────────────────────────────────────

/**
 * Below this many resolved rows the fit is NOT reported. Matches the repo's
 * `min_sample_for_window: 20` convention (strategy_library.json,
 * strategy-decay-metrics.json) — below it the calibration curve is noise.
 */
export const MIN_CALIBRATION_SAMPLES = 20;

/**
 * Minimum rows in the time-ordered validation slice before its Brier/ECE
 * metrics are reported. A Brier score is a mean of per-row squared errors in
 * [0,1]; with n rows its standard error is ≈ sd/√n, and at the worst case
 * (sd ≈ 0.5) that is ≈ 0.5/√n. Below ~8 rows the per-row Brier SE exceeds
 * ~0.17 — wider than the entire difference a calibration step can plausibly
 * move it — so an isotonicBrier < rawBrier on such a slice is noise, not
 * evidence. At MIN_CALIBRATION_SAMPLES (20) × the default 0.3 validation
 * fraction the slice is ~6 rows, which trips this floor. When the slice is
 * below this, calibrateConfidence nulls the holdout metric fields (keeping the
 * size fields) so the route does not surface a falsely-rigorous number.
 */
export const MIN_VALIDATION_ROWS = 8;

/** Newton-Raphson iterations for the logistic fit. Fixed → deterministic. */
const LOGISTIC_ITERATIONS = 50;

/** Ridge term on the logistic Hessian — keeps Newton stable on separable data. */
const LOGISTIC_RIDGE = 1e-6;

/** Default ECE bin count. 10 equal-width bins over [0,1], same spirit as the route. */
const DEFAULT_ECE_BINS = 10;

/**
 * Confidence floor for the calibration population. signal_history confidences
 * below 0.5 are not published-grade and would skew the fit; /api/calibration and
 * the router shadow recorder both restrict to conf >= this value. One source of
 * truth so the populations stay identical.
 */
export const MIN_CALIBRATION_CONFIDENCE = 0.5;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * signal_history stores confidence on the 0-100 scale (e.g. 72, 85). Normalize
 * to [0,1] for bucketing, Brier, and the isotonic map. Defensive: values already
 * ≤ 1 pass through unchanged. The ONE source of truth — /api/calibration, the
 * router shadow recorder, and any other calibration-population consumer import
 * this rather than re-deriving it (no silent drift between sites).
 */
export function normalizeConfidence(raw: number): number {
  return raw > 1 ? raw / 100 : raw;
}

// ── Isotonic regression (Pool-Adjacent-Violators) ────────────────

/**
 * Fit a monotone non-decreasing calibration map via PAV.
 *
 * Algorithm: sort pairs by confidence; collapse each distinct confidence into a
 * weighted block (weight = count, value = mean win rate); then repeatedly merge
 * any adjacent block whose value is LESS than its left neighbour (a monotonicity
 * violation), averaging by weight, until the block values are non-decreasing.
 * The resulting block values, placed at the block's representative confidence,
 * are the breakpoints.
 *
 * Returns null when there are no usable pairs.
 */
export function fitIsotonic(pairs: CalibrationPair[]): IsotonicMap | null {
  const clean = pairs.filter(
    (p) => Number.isFinite(p.conf) && (p.win === 0 || p.win === 1),
  );
  if (clean.length === 0) return null;

  // Group by confidence so equal-x observations share a block (PAV requires a
  // total order on x; ties must be pooled, not treated as separate breakpoints).
  const byConf = new Map<number, { sum: number; count: number }>();
  for (const p of clean) {
    const g = byConf.get(p.conf) ?? { sum: 0, count: 0 };
    g.sum += p.win;
    g.count += 1;
    byConf.set(p.conf, g);
  }

  const sortedX = [...byConf.keys()].sort((a, b) => a - b);

  // Each block: representative x (the confidence), pooled weight, pooled value.
  interface Block {
    x: number;
    weight: number;
    value: number; // weighted mean win rate
  }
  const blocks: Block[] = sortedX.map((x) => {
    const g = byConf.get(x)!;
    return { x, weight: g.count, value: g.sum / g.count };
  });

  // PAV: merge left while a violation exists.
  const stack: Block[] = [];
  for (const block of blocks) {
    let merged = { ...block };
    while (stack.length > 0 && stack[stack.length - 1].value > merged.value) {
      const top = stack.pop()!;
      const totalWeight = top.weight + merged.weight;
      const pooledValue = (top.value * top.weight + merged.value * merged.weight) / totalWeight;
      // The pooled block keeps the LEFTMOST x so the breakpoint domain starts
      // at the lowest confidence in the pool.
      merged = { x: top.x, weight: totalWeight, value: pooledValue };
    }
    stack.push(merged);
  }

  // Emit one breakpoint per pooled block at its left x. apply() clamps and
  // linearly interpolates between consecutive block x's — the standard isotonic
  // step-then-interpolate reconstruction.
  const x: number[] = [];
  const y: number[] = [];
  for (const b of stack) {
    x.push(b.x);
    y.push(clamp01(b.value));
  }

  // Guarantee non-decreasing y (defensive; PAV already ensures it).
  for (let i = 1; i < y.length; i++) {
    if (y[i] < y[i - 1]) y[i] = y[i - 1];
  }

  return { x, y };
}

/**
 * Apply an isotonic map to a raw confidence. Piecewise-linear interpolation
 * between breakpoints; clamps to the endpoint value outside the fitted range
 * (a higher-than-seen confidence cannot be calibrated above the top block, and
 * a lower-than-seen one cannot be calibrated below the bottom block).
 */
export function applyIsotonic(map: IsotonicMap, conf: number): number {
  const { x, y } = map;
  if (x.length === 0) return 0;
  if (x.length === 1) return y[0];
  if (conf <= x[0]) return y[0];
  if (conf >= x[x.length - 1]) return y[y.length - 1];

  // Binary search for the bracketing interval [x[lo], x[hi]].
  let lo = 0;
  let hi = x.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= conf) lo = mid;
    else hi = mid;
  }
  const x0 = x[lo];
  const x1 = x[hi];
  const y0 = y[lo];
  const y1 = y[hi];
  if (x1 === x0) return y0;
  const t = (conf - x0) / (x1 - x0);
  return clamp01(y0 + t * (y1 - y0));
}

// ── Logistic / Platt scaling ─────────────────────────────────────

const sigmoid = (z: number): number => {
  // Numerically stable for large |z|.
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
};

/**
 * Fit `sigmoid(a*conf + b)` to (conf, win) by Newton-Raphson on the
 * log-likelihood, with a fixed iteration count (deterministic) and a small
 * ridge on the Hessian for stability on (near-)separable data. No randomness,
 * no convergence-based early stop — same input → identical (a,b).
 *
 * Returns null when there are no usable pairs.
 */
export function fitLogistic(pairs: CalibrationPair[]): LogisticFit | null {
  const clean = pairs.filter(
    (p) => Number.isFinite(p.conf) && (p.win === 0 || p.win === 1),
  );
  if (clean.length === 0) return null;

  let a = 0;
  let b = 0;

  for (let iter = 0; iter < LOGISTIC_ITERATIONS; iter++) {
    // Gradient g = X^T (p - y); Hessian H = X^T W X, W = diag(p(1-p)).
    let gA = 0;
    let gB = 0;
    let hAA = LOGISTIC_RIDGE;
    let hAB = 0;
    let hBB = LOGISTIC_RIDGE;

    for (const { conf, win } of clean) {
      const p = sigmoid(a * conf + b);
      const err = p - win;
      gA += err * conf;
      gB += err;
      const w = p * (1 - p);
      hAA += w * conf * conf;
      hAB += w * conf;
      hBB += w;
    }

    // Solve H * delta = g for the 2x2 system; step a,b by -delta.
    const det = hAA * hBB - hAB * hAB;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (hAA * gB - hAB * gA) / det;
    if (!Number.isFinite(dA) || !Number.isFinite(dB)) break;
    a -= dA;
    b -= dB;
  }

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

/** Apply a logistic fit to a raw confidence → calibrated probability in (0,1). */
export function applyLogistic(fit: LogisticFit, conf: number): number {
  return sigmoid(fit.a * conf + fit.b);
}

// ── Reliability metrics (match the route's definitions) ──────────

/**
 * Brier score: mean((prob - win)^2). Same definition as /api/calibration's
 * `brier` (which uses confidence as the probability). Null on empty input.
 */
export function brierScore(points: ProbOutcome[]): number | null {
  if (points.length === 0) return null;
  let sum = 0;
  for (const p of points) sum += (p.prob - p.win) * (p.prob - p.win);
  return sum / points.length;
}

/**
 * Expected Calibration Error: |mean-prob − win-rate| per equal-width bin,
 * weighted by bin population. Same spirit as the route's ECE (a population-
 * weighted mean of per-bucket calibration error), generalized to arbitrary
 * probabilities and a configurable bin count. Null on empty input.
 */
export function expectedCalibrationError(
  points: ProbOutcome[],
  bins: number = DEFAULT_ECE_BINS,
): number | null {
  if (points.length === 0) return null;
  const nBins = Math.max(1, Math.floor(bins));
  const sumProb = new Array<number>(nBins).fill(0);
  const sumWin = new Array<number>(nBins).fill(0);
  const count = new Array<number>(nBins).fill(0);

  for (const { prob, win } of points) {
    const p = clamp01(prob);
    // Top edge (p === 1) lands in the last bin instead of overflowing.
    let idx = Math.floor(p * nBins);
    if (idx >= nBins) idx = nBins - 1;
    sumProb[idx] += p;
    sumWin[idx] += win;
    count[idx] += 1;
  }

  const total = points.length;
  let ece = 0;
  for (let i = 0; i < nBins; i++) {
    if (count[i] === 0) continue;
    const meanProb = sumProb[i] / count[i];
    const winRate = sumWin[i] / count[i];
    ece += (count[i] / total) * Math.abs(meanProb - winRate);
  }
  return ece;
}

// ── Time-ordered holdout (no peeking) ────────────────────────────

/**
 * Split rows into an OLDER train slice and a NEWER validation slice by time.
 * Sorts ascending by `ts`, then takes the last `validationFraction` of rows as
 * validation. The fit trains on the older portion only — the validation slice
 * is strictly newer than every training row (assuming distinct ts), so
 * reliability is measured out-of-sample. Keeps ≥1 row on each side when there
 * are ≥2 rows.
 */
export function timeOrderedHoldout<T extends { ts: number }>(
  rows: T[],
  validationFraction: number,
): { train: T[]; validation: T[] } {
  const sorted = [...rows].sort((a, b) => a.ts - b.ts);
  const n = sorted.length;
  if (n === 0) return { train: [], validation: [] };
  if (n === 1) return { train: sorted, validation: [] };

  const frac = validationFraction <= 0 ? 0 : validationFraction >= 1 ? 1 : validationFraction;
  let valCount = Math.round(n * frac);
  // Guarantee at least 1 on each side so a fit can train AND be evaluated.
  if (valCount < 1) valCount = 1;
  if (valCount > n - 1) valCount = n - 1;

  const train = sorted.slice(0, n - valCount);
  const validation = sorted.slice(n - valCount);
  return { train, validation };
}

// ── Orchestrator ─────────────────────────────────────────────────

export interface CalibrateOptions {
  /** Fraction of the time-sorted tail used for validation. Default 0.3. */
  validationFraction?: number;
  /** ECE bin count. Default 10. */
  eceBins?: number;
}

/**
 * Fit both calibration methods on a time-ordered holdout and report reliability
 * on the held-out (newer) slice. Returns null when the population is below
 * MIN_CALIBRATION_SAMPLES (the fit would be noise) — the caller then reports
 * insufficient data rather than a fabricated curve.
 *
 * The returned maps are fit on the TRAIN slice; the Brier/ECE numbers compare
 * raw confidence vs each calibrated map ON THE VALIDATION SLICE. No row appears
 * in both train and validation. When the validation slice has fewer than
 * MIN_VALIDATION_ROWS rows the holdout metric fields are nulled (the size
 * fields are kept) — too few rows for a meaningful Brier/ECE estimate.
 */
export function calibrateConfidence(
  rows: TimedPair[],
  options: CalibrateOptions = {},
): CalibrationReport | null {
  const clean = rows.filter(
    (r) => Number.isFinite(r.ts) && Number.isFinite(r.conf) && (r.win === 0 || r.win === 1),
  );
  if (clean.length < MIN_CALIBRATION_SAMPLES) return null;

  const validationFraction = options.validationFraction ?? 0.3;
  const eceBins = options.eceBins ?? DEFAULT_ECE_BINS;

  const { train, validation } = timeOrderedHoldout(clean, validationFraction);

  const trainPairs: CalibrationPair[] = train.map((r) => ({ conf: r.conf, win: r.win }));
  const isotonic = fitIsotonic(trainPairs);
  const logistic = fitLogistic(trainPairs);

  // Evaluate on the held-out (newer) slice only.
  const rawPoints: ProbOutcome[] = validation.map((r) => ({ prob: r.conf, win: r.win }));
  const isoPoints: ProbOutcome[] = isotonic
    ? validation.map((r) => ({ prob: applyIsotonic(isotonic, r.conf), win: r.win }))
    : [];
  const logPoints: ProbOutcome[] = logistic
    ? validation.map((r) => ({ prob: applyLogistic(logistic, r.conf), win: r.win }))
    : [];

  const rawHoldout: HoldoutReliability = {
    validationSize: validation.length,
    trainSize: train.length,
    rawBrier: brierScore(rawPoints),
    isotonicBrier: isotonic ? brierScore(isoPoints) : null,
    logisticBrier: logistic ? brierScore(logPoints) : null,
    rawEce: expectedCalibrationError(rawPoints, eceBins),
    isotonicEce: isotonic ? expectedCalibrationError(isoPoints, eceBins) : null,
    logisticEce: logistic ? expectedCalibrationError(logPoints, eceBins) : null,
  };

  // Null the metric fields when the validation slice is too thin to support a
  // meaningful estimate (see MIN_VALIDATION_ROWS). Keep validationSize/trainSize
  // so the consumer still sees the slice exists but is below the reporting floor.
  const clampHoldout = (h: HoldoutReliability): HoldoutReliability =>
    h.validationSize >= MIN_VALIDATION_ROWS
      ? h
      : {
          ...h,
          rawBrier: null,
          isotonicBrier: null,
          logisticBrier: null,
          rawEce: null,
          isotonicEce: null,
          logisticEce: null,
        };

  return {
    sampleSize: clean.length,
    validationFraction,
    method: { isotonic, logistic },
    holdout: clampHoldout(rawHoldout),
  };
}

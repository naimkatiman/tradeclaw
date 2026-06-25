/**
 * Phase 4 D7 — offline confidence calibrator (pure module).
 *
 * Proves the two fitting methods recover known miscalibration, that the
 * isotonic map is monotone for any input, that the logistic fit is
 * deterministic and recovers its generating parameters, that the time-ordered
 * holdout never peeks (newest rows go to validation), and that small/empty
 * populations degrade to insufficient-data rather than NaN/crash.
 *
 * The module is pure: no DB, no Date, no Math.random. Every fixture is a fixed
 * array of (rawConfidence ∈ [0,1], win ∈ {0,1}) pairs, so the same input must
 * yield a byte-identical fit on every run.
 */

import {
  fitIsotonic,
  applyIsotonic,
  fitLogistic,
  applyLogistic,
  brierScore,
  expectedCalibrationError,
  timeOrderedHoldout,
  calibrateConfidence,
  MIN_CALIBRATION_SAMPLES,
  MIN_VALIDATION_ROWS,
  type CalibrationPair,
} from '../confidence-calibration';

// ── Deterministic synthetic generators (no Math.random) ──────────

/**
 * Generate (conf, win) pairs whose realized win rate is a KNOWN function of
 * confidence. The label is assigned deterministically by counting wins inside
 * each confidence cohort so the empirical rate equals the target rate exactly
 * (no sampling noise). This lets us assert exact recovery within tolerance.
 */
function syntheticCohorts(
  confidences: number[],
  perConf: number,
  trueWinRate: (conf: number) => number,
): CalibrationPair[] {
  const pairs: CalibrationPair[] = [];
  for (const conf of confidences) {
    const p = trueWinRate(conf);
    const wins = Math.round(p * perConf);
    for (let i = 0; i < perConf; i++) {
      pairs.push({ conf, win: i < wins ? 1 : 0 });
    }
  }
  return pairs;
}

// ── Isotonic PAV ─────────────────────────────────────────────────

describe('fitIsotonic (Pool-Adjacent-Violators)', () => {
  it('recovers a known miscalibration: true P(win) = 0.5 * conf', () => {
    // Confidence is systematically over-stated: at conf=0.8 the real win rate
    // is only 0.4. A correct calibrator must pull every point DOWN toward the
    // true 0.5*conf line.
    const confs = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const pairs = syntheticCohorts(confs, 40, (c) => 0.5 * c);

    const map = fitIsotonic(pairs);
    expect(map).not.toBeNull();

    for (const c of confs) {
      const calibrated = applyIsotonic(map!, c);
      // Recovers the 0.5*conf offset within a small tolerance.
      expect(calibrated).toBeCloseTo(0.5 * c, 2);
    }
  });

  it('calibrated Brier <= raw Brier on the synthetic miscalibrated set', () => {
    const confs = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const pairs = syntheticCohorts(confs, 40, (c) => 0.5 * c);

    const map = fitIsotonic(pairs)!;
    const rawBrier = brierScore(pairs.map((p) => ({ prob: p.conf, win: p.win })))!;
    const calBrier = brierScore(
      pairs.map((p) => ({ prob: applyIsotonic(map, p.conf), win: p.win })),
    )!;
    expect(calBrier).toBeLessThanOrEqual(rawBrier);
  });

  it('output is non-decreasing for any input (monotonicity invariant)', () => {
    // A noisy, non-monotone empirical signal must still fit a monotone map.
    const pairs: CalibrationPair[] = [
      { conf: 0.5, win: 1 }, { conf: 0.5, win: 1 }, { conf: 0.5, win: 0 },
      { conf: 0.6, win: 0 }, { conf: 0.6, win: 0 }, { conf: 0.6, win: 0 }, // dip below 0.5 cohort
      { conf: 0.7, win: 1 }, { conf: 0.7, win: 0 },
      { conf: 0.8, win: 1 }, { conf: 0.8, win: 1 }, { conf: 0.8, win: 1 },
      { conf: 0.9, win: 1 }, { conf: 0.9, win: 0 },
      { conf: 1.0, win: 1 }, { conf: 1.0, win: 1 },
    ];
    const map = fitIsotonic(pairs)!;

    let prev = -Infinity;
    for (let x = 0; x <= 1.0001; x += 0.01) {
      const y = applyIsotonic(map, x);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
      prev = y;
    }
  });

  it('clamps inputs outside the fitted range to the endpoint values', () => {
    const pairs = syntheticCohorts([0.6, 0.8], 20, (c) => c);
    const map = fitIsotonic(pairs)!;
    const lowEnd = applyIsotonic(map, 0.6);
    const highEnd = applyIsotonic(map, 0.8);
    expect(applyIsotonic(map, 0.0)).toBeCloseTo(lowEnd, 9);
    expect(applyIsotonic(map, 1.0)).toBeCloseTo(highEnd, 9);
  });

  it('is deterministic: same input → identical breakpoints', () => {
    const pairs = syntheticCohorts([0.5, 0.7, 0.9], 30, (c) => 0.5 * c);
    const a = fitIsotonic(pairs);
    const b = fitIsotonic(pairs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('empty pairs → null', () => {
    expect(fitIsotonic([])).toBeNull();
  });
});

// ── Logistic (Platt) ─────────────────────────────────────────────

describe('fitLogistic (Platt scaling)', () => {
  it('recovers known a,b from sigmoid-generated labels within tolerance', () => {
    // Generate labels from a known sigmoid(a*conf + b). Use dense cohorts so
    // the empirical rate matches the sigmoid closely and Newton can recover
    // the parameters.
    const trueA = 4;
    const trueB = -2;
    const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
    const confs: number[] = [];
    for (let c = 0.05; c <= 1.0001; c += 0.05) confs.push(+c.toFixed(2));
    const pairs = syntheticCohorts(confs, 200, (c) => sigmoid(trueA * c + trueB));

    const fit = fitLogistic(pairs);
    expect(fit).not.toBeNull();
    expect(fit!.a).toBeCloseTo(trueA, 0);
    expect(fit!.b).toBeCloseTo(trueB, 0);

    // The applied probability tracks the true sigmoid at a sample point.
    expect(applyLogistic(fit!, 0.5)).toBeCloseTo(sigmoid(trueA * 0.5 + trueB), 1);
  });

  it('is deterministic: same input → identical params (fixed iterations)', () => {
    const confs = [0.5, 0.6, 0.7, 0.8, 0.9];
    const pairs = syntheticCohorts(confs, 50, (c) => 0.5 * c);
    const a = fitLogistic(pairs);
    const b = fitLogistic(pairs);
    expect(a).toEqual(b);
  });

  it('produces probabilities strictly in (0,1) and monotone in conf for a>0', () => {
    const confs = [0.5, 0.7, 0.9];
    const pairs = syntheticCohorts(confs, 40, (c) => c);
    const fit = fitLogistic(pairs)!;
    expect(fit.a).toBeGreaterThan(0);
    let prev = -Infinity;
    for (let x = 0; x <= 1; x += 0.1) {
      const y = applyLogistic(fit, x);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });

  it('empty pairs → null', () => {
    expect(fitLogistic([])).toBeNull();
  });
});

// ── Reliability metrics ──────────────────────────────────────────

describe('brierScore + expectedCalibrationError', () => {
  it('brier of a perfectly-confident-correct set is 0', () => {
    expect(brierScore([{ prob: 1, win: 1 }, { prob: 0, win: 0 }])).toBe(0);
  });

  it('brier of empty set is null', () => {
    expect(brierScore([])).toBeNull();
  });

  it('ece is 0 when bin rates equal bin mean-probabilities', () => {
    // 10 at prob 0.7 with 7 wins, 10 at prob 0.3 with 3 wins → perfectly calibrated.
    const points = [
      ...Array.from({ length: 10 }, (_, i) => ({ prob: 0.7, win: i < 7 ? 1 : 0 })),
      ...Array.from({ length: 10 }, (_, i) => ({ prob: 0.3, win: i < 3 ? 1 : 0 })),
    ];
    const ece = expectedCalibrationError(points, 10);
    expect(ece).toBeCloseTo(0, 6);
  });

  it('ece of empty set is null', () => {
    expect(expectedCalibrationError([], 10)).toBeNull();
  });
});

// ── Time-ordered holdout ─────────────────────────────────────────

describe('timeOrderedHoldout', () => {
  it('puts the NEWEST rows in validation, oldest in train (no peeking)', () => {
    // ts intentionally out of order on input — split must sort by ts first.
    const rows = [
      { ts: 300, conf: 0.9, win: 1 },
      { ts: 100, conf: 0.5, win: 0 },
      { ts: 500, conf: 0.7, win: 1 },
      { ts: 200, conf: 0.6, win: 0 },
      { ts: 400, conf: 0.8, win: 1 },
    ];
    const { train, validation } = timeOrderedHoldout(rows, 0.4);
    // 5 rows, 0.4 validation → round(2) → last 2 by time (ts 400, 500) in validation.
    expect(validation.map((r) => r.ts).sort((a, b) => a - b)).toEqual([400, 500]);
    expect(train.map((r) => r.ts).sort((a, b) => a - b)).toEqual([100, 200, 300]);
    // Boundary: max train ts < min validation ts (strict time order).
    const maxTrain = Math.max(...train.map((r) => r.ts));
    const minVal = Math.min(...validation.map((r) => r.ts));
    expect(maxTrain).toBeLessThan(minVal);
  });

  it('keeps at least one row in each side when possible', () => {
    const rows = [
      { ts: 1, conf: 0.5, win: 0 },
      { ts: 2, conf: 0.9, win: 1 },
    ];
    const { train, validation } = timeOrderedHoldout(rows, 0.4);
    expect(train.length).toBeGreaterThanOrEqual(1);
    expect(validation.length).toBeGreaterThanOrEqual(1);
  });

  it('empty input → empty train and validation', () => {
    const { train, validation } = timeOrderedHoldout([] as Array<{ ts: number }>, 0.3);
    expect(train).toEqual([]);
    expect(validation).toEqual([]);
  });
});

// ── End-to-end calibrateConfidence + edge cases ─────────────────

describe('calibrateConfidence (orchestrator)', () => {
  it('returns a full report on a healthy miscalibrated population', () => {
    // Lay down (conf, win) cohorts in time order with realized rate 0.5*conf,
    // enough rows that both train and validation clear MIN_CALIBRATION_SAMPLES.
    const confs = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const rows: Array<{ ts: number; conf: number; win: number }> = [];
    let ts = 0;
    // 20 wins-vs-losses per conf, interleaved deterministically so the realized
    // rate per conf is exactly 0.5*conf and rows are spread across time.
    const perConf = 20;
    for (let i = 0; i < perConf; i++) {
      for (const c of confs) {
        const targetWins = Math.round(0.5 * c * perConf);
        rows.push({ ts: ts++, conf: c, win: i < targetWins ? 1 : 0 });
      }
    }

    const report = calibrateConfidence(rows, { validationFraction: 0.3 });
    expect(report).not.toBeNull();
    expect(report!.method.isotonic).not.toBeNull();
    expect(report!.method.logistic).not.toBeNull();
    expect(report!.holdout.rawBrier).not.toBeNull();
    expect(report!.holdout.isotonicBrier).not.toBeNull();
    expect(report!.holdout.logisticBrier).not.toBeNull();
    expect(report!.sampleSize).toBe(rows.length);
    // The map domain is the train confidences; reliability is on the val slice.
    expect(report!.holdout.trainSize + report!.holdout.validationSize).toBe(rows.length);
  });

  it('empty population → null (insufficient)', () => {
    expect(calibrateConfidence([], {})).toBeNull();
  });

  it('tiny N below MIN_CALIBRATION_SAMPLES → null (not reported)', () => {
    const rows = Array.from({ length: MIN_CALIBRATION_SAMPLES - 1 }, (_, i) => ({
      ts: i, conf: 0.7, win: i % 2,
    }));
    expect(calibrateConfidence(rows, {})).toBeNull();
  });

  it('all-same-confidence → graceful (no NaN/Infinity), report numbers finite', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ ts: i, conf: 0.7, win: i % 2 }));
    const report = calibrateConfidence(rows, { validationFraction: 0.3 });
    expect(report).not.toBeNull();
    const nums = [
      report!.holdout.rawBrier,
      report!.holdout.isotonicBrier,
      report!.holdout.logisticBrier,
      report!.holdout.rawEce,
      report!.holdout.isotonicEce,
      report!.holdout.logisticEce,
    ];
    for (const v of nums) {
      if (v !== null) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('is deterministic end-to-end: same input → identical report', () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({
      ts: i,
      conf: 0.5 + (i % 5) * 0.1,
      win: i % 3 === 0 ? 1 : 0,
    }));
    const a = calibrateConfidence(rows, { validationFraction: 0.3 });
    const b = calibrateConfidence(rows, { validationFraction: 0.3 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('nulls holdout metrics when the validation slice is below MIN_VALIDATION_ROWS', () => {
    // 20 rows (just clears MIN_CALIBRATION_SAMPLES) × 0.3 → round(6) = 6 validation
    // rows, below the 8-row floor. Report is non-null but the metric fields null.
    const rows = Array.from({ length: 20 }, (_, i) => ({
      ts: i,
      conf: 0.5 + (i % 5) * 0.1,
      win: i % 2,
    }));
    const report = calibrateConfidence(rows, { validationFraction: 0.3 });
    expect(report).not.toBeNull();
    // Size fields stay populated so the consumer sees the slice is thin.
    expect(report!.holdout.validationSize).toBeGreaterThan(0);
    expect(report!.holdout.validationSize).toBeLessThan(MIN_VALIDATION_ROWS);
    expect(report!.holdout.trainSize).toBeGreaterThan(0);
    // Every per-metric Brier/ECE field is nulled (noise floor, not evidence).
    expect(report!.holdout.rawBrier).toBeNull();
    expect(report!.holdout.isotonicBrier).toBeNull();
    expect(report!.holdout.logisticBrier).toBeNull();
    expect(report!.holdout.rawEce).toBeNull();
    expect(report!.holdout.isotonicEce).toBeNull();
    expect(report!.holdout.logisticEce).toBeNull();
    // The fitted maps are still returned (they train on the larger older slice).
    expect(report!.method.isotonic).not.toBeNull();
    expect(report!.method.logistic).not.toBeNull();
  });

  it('reports holdout metrics when the validation slice meets MIN_VALIDATION_ROWS', () => {
    // 40 rows × 0.3 → round(12) = 12 validation rows, above the 8-row floor.
    const rows = Array.from({ length: 40 }, (_, i) => ({
      ts: i,
      conf: 0.5 + (i % 5) * 0.1,
      win: i % 2,
    }));
    const report = calibrateConfidence(rows, { validationFraction: 0.3 });
    expect(report).not.toBeNull();
    expect(report!.holdout.validationSize).toBeGreaterThanOrEqual(MIN_VALIDATION_ROWS);
    expect(report!.holdout.rawBrier).not.toBeNull();
    expect(report!.holdout.isotonicBrier).not.toBeNull();
    expect(report!.holdout.logisticBrier).not.toBeNull();
    expect(report!.holdout.rawEce).not.toBeNull();
  });
});

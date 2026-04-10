/**
 * Per-symbol ATR stop calibration.
 *
 * Gold, BTC, EURUSD all have wildly different volatility profiles — applying a
 * single ATR multiplier to every instrument leads to premature stop-outs on
 * volatile assets and loose stops on quiet ones. This module takes the recorded
 * outcome history for a single symbol and grid-searches candidate ATR
 * multipliers, scoring each by how many recorded stop-outs it would have
 * avoided minus how many wins it would have flipped to losses.
 *
 * Pure function. No I/O. Caller is responsible for supplying per-symbol samples
 * and persisting/caching the result.
 */

export type Direction = 'BUY' | 'SELL';
export type SampleOutcome = 'win' | 'loss' | 'stop' | 'open';
export type CalibrationConfidence = 'low' | 'medium' | 'high';

export interface OutcomeSample {
  /** Signal direction. */
  direction: Direction;
  /** Outcome of the trade. Only closed (win/loss/stop) are scored. */
  outcome: SampleOutcome;
  /** Entry price. */
  entry: number;
  /** Recorded stop-loss price. */
  stop: number;
  /** Recorded first take-profit price. */
  target: number;
  /** ATR value at signal time (in price units). */
  entryAtr: number;
  /** |entry - stop| — the stop distance actually used at signal time. */
  stopDistance: number;
  /**
   * Furthest adverse excursion from entry observed over the trade's life
   * (in price units). For stop-outs this is typically >= stopDistance. For
   * wins it is the deepest pullback before TP was hit. Optional: when missing
   * we fall back to conservative estimates (stopDistance for stops, 0 for
   * wins), which biases the calibration toward looser stops.
   */
  adverseExcursion?: number;
}

export interface CalibrationOptions {
  /** Fallback multiplier when sample size is below MIN_CALIBRATION_SAMPLES. */
  defaultMultiplier?: number;
  /** Override the grid. Rarely needed. */
  grid?: readonly number[];
}

export interface CalibrationResult {
  multiplier: number;
  confidence: CalibrationConfidence;
  sampleSize: number;
  avoidedStopouts: number;
  winsLost: number;
  score: number;
}

/** Current production default — matches `atr * 2.0` in signal-generator.ts. */
export const DEFAULT_ATR_MULTIPLIER = 2.0;

/** Minimum closed samples required to trust a calibration result. */
export const MIN_CALIBRATION_SAMPLES = 15;

/** Grid of candidate ATR multipliers: 1.0, 1.25, 1.5, ..., 3.5. */
export const ATR_MULTIPLIER_GRID: readonly number[] = (() => {
  const grid: number[] = [];
  for (let m = 1.0; m <= 3.5 + 1e-9; m += 0.25) {
    grid.push(+m.toFixed(2));
  }
  return grid;
})();

/**
 * Calibrate the ATR stop multiplier for a single symbol from its outcome
 * history. Returns the default multiplier with `confidence: 'low'` when there
 * are fewer than MIN_CALIBRATION_SAMPLES closed outcomes.
 */
export function calibrateAtrMultiplier(
  samples: readonly OutcomeSample[],
  options: CalibrationOptions = {},
): CalibrationResult {
  const defaultMultiplier = options.defaultMultiplier ?? DEFAULT_ATR_MULTIPLIER;
  const grid = options.grid ?? ATR_MULTIPLIER_GRID;

  // Filter to closed, usable samples.
  const closed = samples.filter(
    (s) =>
      (s.outcome === 'win' || s.outcome === 'loss' || s.outcome === 'stop') &&
      Number.isFinite(s.entryAtr) &&
      s.entryAtr > 0 &&
      Number.isFinite(s.stopDistance) &&
      s.stopDistance > 0,
  );

  if (closed.length < MIN_CALIBRATION_SAMPLES) {
    return {
      multiplier: defaultMultiplier,
      confidence: 'low',
      sampleSize: closed.length,
      avoidedStopouts: 0,
      winsLost: 0,
      score: 0,
    };
  }

  // Grid search: for each candidate M, simulate the new stop distance and
  // count avoided stop-outs and wins-that-would-have-been-lost.
  let best: { M: number; score: number; avoided: number; lost: number } | null = null;

  for (const M of grid) {
    let avoided = 0;
    let lost = 0;

    for (const s of closed) {
      const newStopDistance = s.entryAtr * M;

      if (s.outcome === 'stop') {
        // A looser stop avoids the stop-out iff it sits beyond the adverse
        // excursion that triggered the original stop. When adverseExcursion
        // is missing we assume price touched exactly the original stop.
        const adverse = s.adverseExcursion ?? s.stopDistance;
        if (newStopDistance > adverse) {
          avoided += 1;
        }
      } else if (s.outcome === 'win') {
        // A tighter stop flips a win to a loss iff the new stop sits inside
        // the deepest pullback observed during the winning trade. Without
        // adverseExcursion we cannot prove a flip — assume 0 (optimistic).
        const adverse = s.adverseExcursion ?? 0;
        if (adverse > 0 && newStopDistance < adverse) {
          lost += 1;
        }
      }
      // 'loss' outcomes (closed flat / TP never hit, no stop-out) don't
      // contribute to either metric under this model.
    }

    const score = avoided - lost;
    if (
      best === null ||
      score > best.score ||
      // Tie-break: prefer the multiplier closest to the default.
      (score === best.score &&
        Math.abs(M - defaultMultiplier) < Math.abs(best.M - defaultMultiplier))
    ) {
      best = { M, score, avoided, lost };
    }
  }

  const confidence: CalibrationConfidence = closed.length >= 25 ? 'high' : 'medium';

  return {
    multiplier: best!.M,
    confidence,
    sampleSize: closed.length,
    avoidedStopouts: best!.avoided,
    winsLost: best!.lost,
    score: best!.score,
  };
}

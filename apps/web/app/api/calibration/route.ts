import { NextResponse } from 'next/server';
import { readHistoryAsync, isCountedResolved } from '@/lib/signal-history';
import {
  calibrateConfidence,
  normalizeConfidence,
  MIN_CALIBRATION_CONFIDENCE,
  type CalibrationReport,
} from '@/lib/confidence-calibration';

export const revalidate = 300; // 5-min cache

interface CalibrationBucket {
  label: string;
  confMin: number;
  confMax: number;
  count: number;
  wins: number;
  /** Null when the bucket is empty — the UI must not render a fake point. */
  winRate: number | null;
  midpoint: number;
  calibrationError: number | null;
}

// Below this many counted-resolved signals the per-bucket win-rates are too
// noisy to read as a stable calibration. Real data under this floor is
// "insufficient", not "simulated" — the distinction the UI surfaces.
const MIN_STABLE_CALIBRATION_SIGNALS = 20;

const BUCKETS = [
  { label: '50-59%', confMin: 0.50, confMax: 0.60, midpoint: 0.545 },
  { label: '60-69%', confMin: 0.60, confMax: 0.70, midpoint: 0.645 },
  { label: '70-79%', confMin: 0.70, confMax: 0.80, midpoint: 0.745 },
  { label: '80-89%', confMin: 0.80, confMax: 0.90, midpoint: 0.845 },
  { label: '90-99%', confMin: 0.90, confMax: 1.00, midpoint: 0.945 },
];

// normalizeConfidence (0-100 → 0-1) + MIN_CALIBRATION_CONFIDENCE (the 0.5 floor)
// are imported from confidence-calibration.ts — one source of truth shared with
// the router shadow recorder so the populations never drift. Before that fix the
// route compared raw 0-100 values against 0-1 bucket bounds: every bucket was
// empty, each fell back to winRate = midpoint, and the reliability chart rendered
// as perfectly calibrated — fabricated by construction.

export async function GET() {
  try {
    const history = await readHistoryAsync();
    // Canonical resolved filter: excludes simulated rows, gate-blocked rows,
    // and auto-expired closes — same population as win-rate/equity, so the
    // calibration chart measures the engine, not placeholder artifacts.
    const resolved = history
      .filter(isCountedResolved)
      .map((s) => ({ ...s, confidence: normalizeConfidence(s.confidence) }))
      .filter((s) => s.confidence >= MIN_CALIBRATION_CONFIDENCE);

    const buckets: CalibrationBucket[] = BUCKETS.map((b) => {
      // Top bucket is inclusive so confidence exactly 100 (normalized 1.0)
      // lands in 90-99% instead of falling out of every bucket while still
      // counting in totalSignals/Brier.
      const topInclusive = b.confMax === 1.0;
      const inBucket = resolved.filter(
        (s) => s.confidence >= b.confMin && (topInclusive ? s.confidence <= b.confMax : s.confidence < b.confMax)
      );
      const wins = inBucket.filter((s) => s.outcomes['24h']?.hit).length;
      const winRate = inBucket.length > 0 ? wins / inBucket.length : null;
      return {
        label: b.label,
        confMin: b.confMin,
        confMax: b.confMax,
        count: inBucket.length,
        wins,
        winRate,
        midpoint: b.midpoint,
        calibrationError: winRate !== null ? Math.abs(winRate - b.midpoint) : null,
      };
    });

    const totalSignals = resolved.length;
    const totalWins = resolved.filter((s) => s.outcomes['24h']?.hit).length;
    const overallAccuracy = totalSignals > 0 ? totalWins / totalSignals : 0;

    // Date range of the resolved population the metrics cover. Null when empty
    // so the UI can omit the window rather than render an invalid range.
    const timestamps = resolved.map((s) => s.timestamp);
    const windowStart = timestamps.length ? Math.min(...timestamps) : null;
    const windowEnd = timestamps.length ? Math.max(...timestamps) : null;

    // Brier score: mean((conf - outcome)^2) on the 0-1 scale.
    const brier = totalSignals > 0
      ? resolved.reduce((sum, s) => {
          const outcome = s.outcomes['24h']?.hit ? 1 : 0;
          return sum + Math.pow(s.confidence - outcome, 2);
        }, 0) / totalSignals
      : null;

    // ECE: weighted mean calibration error over non-empty buckets.
    const ece = totalSignals > 0
      ? buckets.reduce(
          (sum, b) => sum + (b.calibrationError !== null ? (b.count / totalSignals) * b.calibrationError : 0),
          0,
        )
      : null;

    // Phase 4 D7 — REPORTED calibration curves (isotonic + logistic) fit on a
    // time-ordered holdout over the SAME resolved population used above. This is
    // read-only reporting: published confidence on signals is NOT changed here.
    // Returns null when the population is below the calibrator's minimum sample
    // size — the UI then shows raw buckets only, never a fabricated curve.
    // v1 calibrates the single feature carried by all history (confidence →
    // P(win)); multi-feature calibration + the confluence-bonus shrink are
    // data-gated on the migration-051 columns accruing ≥4wk (see D4/D7).
    const calibration: CalibrationReport | null = calibrateConfidence(
      resolved.map((s) => ({
        ts: s.timestamp,
        conf: s.confidence,
        win: s.outcomes['24h']?.hit ? 1 : 0,
      })),
    );

    // This route NEVER serves simulated rows — isCountedResolved already
    // excludes `isSimulated` history. So server-side isSimulated is always
    // false; the genuine simulated/demo case lives only in the client
    // catch-block fallback. A real-but-thin population (1–19 counted, or 0)
    // is flagged `insufficientData`, NOT mislabeled as simulated, so the UI
    // can say "insufficient live data (N=n)" instead of "demo data".
    return NextResponse.json({
      buckets,
      overallAccuracy,
      totalSignals,
      isSimulated: false,
      insufficientData: totalSignals < MIN_STABLE_CALIBRATION_SIGNALS,
      minStableSignals: MIN_STABLE_CALIBRATION_SIGNALS,
      windowStart,
      windowEnd,
      brier,
      ece,
      calibration,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Calibration API error:', err);
    return NextResponse.json({ error: 'Failed to compute calibration' }, { status: 500 });
  }
}

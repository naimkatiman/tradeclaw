import { NextResponse } from 'next/server';
import { readHistoryAsync } from '@/lib/signal-history';

export const revalidate = 300; // 5-min cache

interface CalibrationBucket {
  label: string;
  confMin: number;
  confMax: number;
  count: number;
  wins: number;
  winRate: number;
  midpoint: number;
  calibrationError: number;
}

const BUCKETS = [
  { label: '50-59%', confMin: 0.50, confMax: 0.60, midpoint: 0.545 },
  { label: '60-69%', confMin: 0.60, confMax: 0.70, midpoint: 0.645 },
  { label: '70-79%', confMin: 0.70, confMax: 0.80, midpoint: 0.745 },
  { label: '80-89%', confMin: 0.80, confMax: 0.90, midpoint: 0.845 },
  { label: '90-99%', confMin: 0.90, confMax: 1.00, midpoint: 0.945 },
];

export async function GET() {
  try {
    const history = await readHistoryAsync();
    // Only use resolved signals with 24h outcomes
    const resolved = history.filter(
      (s) => s.outcomes['24h'] !== null && s.confidence >= 0.5
    );

    const buckets: CalibrationBucket[] = BUCKETS.map((b) => {
      const inBucket = resolved.filter(
        (s) => s.confidence >= b.confMin && s.confidence < b.confMax
      );
      const wins = inBucket.filter((s) => s.outcomes['24h']?.hit).length;
      const winRate = inBucket.length > 0 ? wins / inBucket.length : b.midpoint;
      return {
        label: b.label,
        confMin: b.confMin,
        confMax: b.confMax,
        count: inBucket.length,
        wins,
        winRate,
        midpoint: b.midpoint,
        calibrationError: Math.abs(winRate - b.midpoint),
      };
    });

    const totalSignals = resolved.length;
    const totalWins = resolved.filter((s) => s.outcomes['24h']?.hit).length;
    const overallAccuracy = totalSignals > 0 ? totalWins / totalSignals : 0;

    // Brier score: mean((conf - outcome)^2)
    const brier = totalSignals > 0
      ? resolved.reduce((sum, s) => {
          const outcome = s.outcomes['24h']?.hit ? 1 : 0;
          return sum + Math.pow(s.confidence - outcome, 2);
        }, 0) / totalSignals
      : 0.21; // fallback demo value

    // ECE: weighted mean calibration error
    const ece = totalSignals > 0
      ? buckets.reduce((sum, b) => sum + (b.count / totalSignals) * b.calibrationError, 0)
      : 0.038;

    const isSimulated = resolved.every((s) => s.isSimulated);

    return NextResponse.json({
      buckets,
      overallAccuracy,
      totalSignals,
      isSimulated: isSimulated || totalSignals < 20,
      brier,
      ece,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Calibration API error:', err);
    return NextResponse.json({ error: 'Failed to compute calibration' }, { status: 500 });
  }
}

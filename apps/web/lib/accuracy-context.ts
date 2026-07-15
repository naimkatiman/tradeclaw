import { isCountedResolved, type SignalHistoryRecord } from './signal-history';

export interface AccuracyContext {
  winRate: number;        // 0-100
  sampleSize: number;     // resolved signal count
  windowLabel: string;    // "24h" — which outcome window we used
  oldestSampleTs: string; // ISO timestamp of oldest sample
  newestSampleTs: string; // ISO timestamp of newest sample
}

/**
 * Pure function: compute accuracy context from pre-fetched rows.
 * Filters to matching symbol+timeframe, uses 24h outcome window.
 */
export function computeAccuracyContext(
  rows: SignalHistoryRecord[],
  symbol: string,
  timeframe: string,
): AccuracyContext | null {
  const matched = rows.filter(
    (r) =>
      r.pair.toUpperCase() === symbol.toUpperCase() &&
      r.timeframe === timeframe &&
      isCountedResolved(r),
  );

  if (matched.length === 0) return null;

  const wins = matched.filter((r) => r.outcomes['24h']!.hit).length;
  const sorted = [...matched].sort((a, b) => a.timestamp - b.timestamp);

  return {
    winRate: (wins / matched.length) * 100,
    sampleSize: matched.length,
    windowLabel: '24h',
    oldestSampleTs: new Date(sorted[0].timestamp).toISOString(),
    newestSampleTs: new Date(sorted[sorted.length - 1].timestamp).toISOString(),
  };
}

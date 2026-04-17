export interface AccuracyContext {
  winRate: number;        // 0-100
  sampleSize: number;     // resolved signal count
  windowLabel: string;    // "24h" — which outcome window we used
  oldestSampleTs: string; // ISO timestamp of oldest sample
  newestSampleTs: string; // ISO timestamp of newest sample
}

interface HistoryRow {
  pair: string;
  timeframe: string;
  created_at: string;
  outcomes: {
    '24h': { hit: boolean; pnlPct: number } | null;
  };
}

/**
 * Pure function: compute accuracy context from pre-fetched rows.
 * Filters to matching symbol+timeframe, uses 24h outcome window.
 */
export function computeAccuracyContext(
  rows: HistoryRow[],
  symbol: string,
  timeframe: string,
): AccuracyContext | null {
  const matched = rows.filter(
    (r) =>
      r.pair.toUpperCase() === symbol.toUpperCase() &&
      r.timeframe === timeframe &&
      r.outcomes['24h'] != null,
  );

  if (matched.length === 0) return null;

  const wins = matched.filter((r) => r.outcomes['24h']!.hit).length;
  const sorted = matched.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return {
    winRate: (wins / matched.length) * 100,
    sampleSize: matched.length,
    windowLabel: '24h',
    oldestSampleTs: sorted[0].created_at,
    newestSampleTs: sorted[sorted.length - 1].created_at,
  };
}

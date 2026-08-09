import { isCountedResolved, type SignalHistoryRecord } from './signal-history';

export interface RollingWinRateSummary {
  totalSignals: number;
  resolvedSignals: number;
  winRate: number;
}

export interface RollingWinRates {
  '7d': RollingWinRateSummary;
  '30d': RollingWinRateSummary;
  '90d': RollingWinRateSummary;
}

function computeWinRateSummary(records: SignalHistoryRecord[]): RollingWinRateSummary {
  const resolvedSignals = records.filter(isCountedResolved);
  const wins = resolvedSignals.filter((record) => record.outcomes['24h']!.hit).length;

  return {
    totalSignals: records.length,
    resolvedSignals: resolvedSignals.length,
    winRate: resolvedSignals.length > 0
      ? +((wins / resolvedSignals.length) * 100).toFixed(1)
      : 0,
  };
}

export function computeRollingWinRates(
  records: SignalHistoryRecord[],
  now: number = Date.now(),
): RollingWinRates {
  const windows = [7, 30, 90] as const;

  return windows.reduce((acc, days) => {
    const cutoff = now - days * 86_400_000;
    const key = `${days}d` as const;
    acc[key] = computeWinRateSummary(records.filter((record) => record.timestamp >= cutoff));
    return acc;
  }, {} as RollingWinRates);
}

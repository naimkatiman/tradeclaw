import { isCountedResolved, readHistoryAsync, type SignalHistoryRecord } from './signal-history';

/**
 * Minimum resolved signals in the year before /wrapped shows numbers instead of
 * an honest "not enough tracked history yet" state.
 */
export const WRAPPED_MIN = 20;

/**
 * A pair needs at least this many resolved signals to be eligible as the
 * best/worst performer, so a lone 1-for-1 pair can't claim "100% best pair".
 */
const PAIR_MIN = 3;

export interface WrappedStats {
  year: number;
  hasEnoughData: boolean;
  /** Resolved, counted signals tracked in the year. */
  totalSignals: number;
  bestPair: string;
  bestPairCount: number;
  /** 0..1 */
  bestPairWinRate: number;
  worstPair: string;
  /** 0..1 */
  worstPairWinRate: number;
  totalBuy: number;
  totalSell: number;
  /** 0..100 */
  avgConfidence: number;
  topTimeframe: string;
  totalWins: number;
  totalLosses: number;
  /** 0..1 */
  overallWinRate: number;
  /** Longest run of consecutive winning signals, chronological. */
  longestStreak: number;
  /** length 12, resolved-signal counts Jan..Dec (UTC). */
  monthlyActivity: number[];
  /** length 12, monthly win rate 0..1 (0 when no data that month). */
  accuracyTrend: number[];
  /** 0..23 UTC hour with the most signals. */
  busiestHour: number;
  uniquePairs: number;
}

function emptyWrapped(year: number, totalSignals: number): WrappedStats {
  return {
    year,
    hasEnoughData: false,
    totalSignals,
    bestPair: '—',
    bestPairCount: 0,
    bestPairWinRate: 0,
    worstPair: '—',
    worstPairWinRate: 0,
    totalBuy: 0,
    totalSell: 0,
    avgConfidence: 0,
    topTimeframe: '—',
    totalWins: 0,
    totalLosses: 0,
    overallWinRate: 0,
    longestStreak: 0,
    monthlyActivity: Array.from({ length: 12 }, () => 0),
    accuracyTrend: Array.from({ length: 12 }, () => 0),
    busiestHour: 0,
    uniquePairs: 0,
  };
}

/**
 * Pure, real-data "year in review" for TradeClaw's tracked signals. Computed
 * from signal_history through isCountedResolved (excludes simulated,
 * gate-blocked, and auto-expired rows). This is a PLATFORM recap — the signals
 * TradeClaw tracked that year — NOT a per-user trading record (the product has
 * no per-user trade ledger). Replaces a seeded LCG that fabricated every stat.
 */
export function computeWrappedStats(records: SignalHistoryRecord[], year: number): WrappedStats {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1) - 1;
  const recs = records
    .filter(r => r.timestamp >= yearStart && r.timestamp <= yearEnd && isCountedResolved(r))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recs.length < WRAPPED_MIN) {
    return emptyWrapped(year, recs.length);
  }

  let totalWins = 0;
  let totalBuy = 0;
  let confSum = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  const byPair = new Map<string, { hits: number; total: number }>();
  const byTimeframe = new Map<string, number>();
  const monthlyActivity = Array.from({ length: 12 }, () => 0);
  const monthlyWins = Array.from({ length: 12 }, () => 0);
  const hourCounts = Array.from({ length: 24 }, () => 0);

  for (const r of recs) {
    const hit = r.outcomes['24h']!.hit;
    if (hit) {
      totalWins++;
      currentStreak++;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
    if (r.direction === 'BUY') totalBuy++;
    confSum += r.confidence;

    const s = byPair.get(r.pair) ?? { hits: 0, total: 0 };
    s.total++;
    if (hit) s.hits++;
    byPair.set(r.pair, s);

    byTimeframe.set(r.timeframe, (byTimeframe.get(r.timeframe) ?? 0) + 1);

    const d = new Date(r.timestamp);
    const month = d.getUTCMonth();
    monthlyActivity[month]++;
    if (hit) monthlyWins[month]++;
    hourCounts[d.getUTCHours()]++;
  }

  const total = recs.length;
  const totalLosses = total - totalWins;

  // Best / worst pair by win rate among pairs with a meaningful sample.
  let bestPair = '—';
  let worstPair = '—';
  let bestRate = -1;
  let worstRate = Infinity;
  let bestCount = 0;
  for (const [pair, s] of byPair) {
    if (s.total < PAIR_MIN) continue;
    const rate = s.hits / s.total;
    if (rate > bestRate || (rate === bestRate && s.total > bestCount)) {
      bestRate = rate;
      bestPair = pair;
      bestCount = s.total;
    }
    if (rate < worstRate) {
      worstRate = rate;
      worstPair = pair;
    }
  }
  // No pair cleared PAIR_MIN — fall back to the most-traded pair.
  if (bestPair === '—') {
    let topCount = -1;
    for (const [pair, s] of byPair) {
      if (s.total > topCount) {
        topCount = s.total;
        bestPair = pair;
        worstPair = pair;
        bestCount = s.total;
        bestRate = s.hits / s.total;
        worstRate = bestRate;
      }
    }
  }

  let topTimeframe = '—';
  let topTfCount = -1;
  for (const [tf, c] of byTimeframe) {
    if (c > topTfCount) {
      topTfCount = c;
      topTimeframe = tf;
    }
  }

  let busiestHour = 0;
  let busiestCount = -1;
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > busiestCount) {
      busiestCount = hourCounts[h];
      busiestHour = h;
    }
  }

  const accuracyTrend = monthlyActivity.map((c, i) => (c > 0 ? monthlyWins[i] / c : 0));

  return {
    year,
    hasEnoughData: true,
    totalSignals: total,
    bestPair,
    bestPairCount: bestCount,
    bestPairWinRate: +bestRate.toFixed(4),
    worstPair,
    worstPairWinRate: worstRate === Infinity ? 0 : +worstRate.toFixed(4),
    totalBuy,
    totalSell: total - totalBuy,
    avgConfidence: Math.round(confSum / total),
    topTimeframe,
    totalWins,
    totalLosses,
    overallWinRate: +(totalWins / total).toFixed(4),
    longestStreak,
    monthlyActivity,
    accuracyTrend,
    busiestHour,
    uniquePairs: byPair.size,
  };
}

/**
 * Async wrapper: reads signal history and computes the year recap. Scopes the
 * DB read to the requested year onward (the current year — the common case —
 * resolves exactly); computeWrappedStats still bounds to [year, year + 1).
 */
export async function getWrappedStats(year: number): Promise<WrappedStats> {
  const records = await readHistoryAsync({ sinceMs: Date.UTC(year, 0, 1) });
  return computeWrappedStats(records, year);
}

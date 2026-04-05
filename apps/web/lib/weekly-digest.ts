import { readHistoryAsync, type SignalHistoryRecord } from './signal-history';

export interface RankedSignal extends SignalHistoryRecord {
  rank: number;
  pnlPips: number;
  pnlPercent: number;
}

export interface WeeklyStats {
  totalSignals: number;
  winRate: number;
  bestPair: string;
  worstPair: string;
  avgConfidence: number;
  dailyWinRates: [number, number, number, number, number, number, number]; // Mon-Sun
}

export interface WeeklyDigest {
  weekStart: number; // ms epoch (Monday 00:00 UTC)
  weekEnd: number;   // ms epoch (Sunday 23:59 UTC)
  topSignals: RankedSignal[];
  stats: WeeklyStats;
}

// Fake digest generator removed — empty digest returned when insufficient real data

function getWeekBounds(): { weekStart: number; weekEnd: number } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset,
  ));
  const weekStart = monday.getTime();
  const weekEnd = weekStart + 7 * 86400000 - 1;
  return { weekStart, weekEnd };
}

export async function getWeeklyDigest(): Promise<WeeklyDigest> {
  const { weekStart, weekEnd } = getWeekBounds();
  const records = await readHistoryAsync();

  // Filter to this week's records with resolved 24h outcomes
  const weekRecords = records.filter(
    r => r.timestamp >= weekStart && r.timestamp <= weekEnd && r.outcomes['24h'] !== null,
  );

  if (weekRecords.length < 5) {
    // Not enough real data — return empty digest instead of fake numbers
    return {
      weekStart,
      weekEnd,
      topSignals: [],
      stats: {
        totalSignals: weekRecords.length,
        winRate: 0,
        bestPair: '—',
        worstPair: '—',
        avgConfidence: 0,
        dailyWinRates: [0, 0, 0, 0, 0, 0, 0] as WeeklyStats['dailyWinRates'],
      },
    };
  }

  // Compute per-pair hit rates for ranking
  const pairStats = new Map<string, { hits: number; total: number }>();
  for (const r of weekRecords) {
    const s = pairStats.get(r.pair) ?? { hits: 0, total: 0 };
    s.total++;
    if (r.outcomes['24h']!.hit) s.hits++;
    pairStats.set(r.pair, s);
  }

  // Rank: hitRate desc, then confidence desc
  const sorted = [...weekRecords].sort((a, b) => {
    const aStats = pairStats.get(a.pair)!;
    const bStats = pairStats.get(b.pair)!;
    const aHitRate = aStats.total > 0 ? aStats.hits / aStats.total : 0;
    const bHitRate = bStats.total > 0 ? bStats.hits / bStats.total : 0;
    if (bHitRate !== aHitRate) return bHitRate - aHitRate;
    return b.confidence - a.confidence;
  });

  const top5 = sorted.slice(0, 5);

  const topSignals: RankedSignal[] = top5.map((r, i) => {
    const pnlPercent = r.outcomes['24h']?.pnlPct ?? 0;
    const pipMultiplier = r.pair.includes('JPY') ? 100 : r.pair === 'XAUUSD' ? 10 : 10000;
    const pnlPips = Math.round(pnlPercent * pipMultiplier / 100 * r.entryPrice);
    return { ...r, rank: i + 1, pnlPips, pnlPercent };
  });

  // Compute weekly stats
  const wins = weekRecords.filter(r => r.outcomes['24h']!.hit);
  const winRate = weekRecords.length > 0 ? +((wins.length / weekRecords.length) * 100).toFixed(1) : 0;
  const avgConfidence = weekRecords.length > 0
    ? Math.round(weekRecords.reduce((s, r) => s + r.confidence, 0) / weekRecords.length)
    : 0;

  // Best/worst pair by hit rate
  let bestPair = '—';
  let worstPair = '—';
  let bestRate = -1;
  let worstRate = 101;
  for (const [pair, s] of pairStats) {
    const rate = s.total > 0 ? s.hits / s.total : 0;
    if (rate > bestRate) { bestRate = rate; bestPair = pair; }
    if (rate < worstRate) { worstRate = rate; worstPair = pair; }
  }

  // Daily win rates Mon(0)-Sun(6)
  const dailyWins = Array(7).fill(0) as number[];
  const dailyTotal = Array(7).fill(0) as number[];
  for (const r of weekRecords) {
    const d = new Date(r.timestamp);
    const dayIdx = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1; // Mon=0..Sun=6
    dailyTotal[dayIdx]++;
    if (r.outcomes['24h']!.hit) dailyWins[dayIdx]++;
  }
  const dailyWinRates = dailyWins.map((w, i) =>
    dailyTotal[i] > 0 ? +((w / dailyTotal[i]) * 100).toFixed(1) : 0,
  ) as WeeklyStats['dailyWinRates'];

  return {
    weekStart,
    weekEnd,
    topSignals,
    stats: {
      totalSignals: weekRecords.length,
      winRate,
      bestPair,
      worstPair,
      avgConfidence,
      dailyWinRates,
    },
  };
}

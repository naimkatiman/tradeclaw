import { readHistory, type SignalHistoryRecord } from './signal-history';

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

// Seeded PRNG (mulberry32) for deterministic fake data
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAKE_PAIRS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPJPY', 'ETHUSD'];
const FAKE_TIMEFRAMES = ['H1', 'H4', 'D1'];

function generateFakeDigest(weekStart: number, weekEnd: number): WeeklyDigest {
  const seed = Math.floor(weekStart / 86400000); // deterministic per week
  const rng = mulberry32(seed);

  const topSignals: RankedSignal[] = FAKE_PAIRS.map((pair, i) => {
    const direction: 'BUY' | 'SELL' = rng() > 0.5 ? 'BUY' : 'SELL';
    const confidence = 60 + Math.floor(rng() * 35);
    const entryPrice = pair === 'XAUUSD' ? 2300 + rng() * 200
      : pair === 'BTCUSD' ? 60000 + rng() * 20000
      : pair === 'ETHUSD' ? 3000 + rng() * 1000
      : 1 + rng() * 0.5;
    const pnlPercent = +((-2 + rng() * 6).toFixed(2));
    const pipMultiplier = pair.includes('JPY') ? 100 : pair === 'XAUUSD' ? 10 : pair.includes('USD') && !pair.startsWith('BTC') && !pair.startsWith('ETH') ? 10000 : 1;
    const pnlPips = Math.round(pnlPercent * pipMultiplier / 100 * entryPrice);
    const hitRate = 40 + rng() * 50;

    return {
      rank: i + 1,
      id: `fake-weekly-${pair}-${seed}`,
      pair,
      timeframe: FAKE_TIMEFRAMES[Math.floor(rng() * FAKE_TIMEFRAMES.length)],
      direction,
      confidence,
      entryPrice: +entryPrice.toFixed(pair.includes('USD') && !pair.startsWith('BTC') && !pair.startsWith('ETH') ? 5 : 2),
      timestamp: weekStart + Math.floor(rng() * (weekEnd - weekStart)),
      tp1: undefined,
      sl: undefined,
      isSimulated: true,
      outcomes: {
        '4h': { price: entryPrice * (1 + pnlPercent / 200), pnlPct: +(pnlPercent / 2).toFixed(2), hit: pnlPercent > 0 },
        '24h': { price: entryPrice * (1 + pnlPercent / 100), pnlPct: pnlPercent, hit: pnlPercent > 0 },
      },
      pnlPips,
      pnlPercent,
      // Sort key for ranking
      _hitRate: hitRate,
    } as RankedSignal & { _hitRate: number };
  });

  // Sort by hitRate desc, then confidence desc (matching the spec)
  topSignals.sort((a, b) => {
    const aHit = (a as unknown as { _hitRate: number })._hitRate;
    const bHit = (b as unknown as { _hitRate: number })._hitRate;
    if (bHit !== aHit) return bHit - aHit;
    return b.confidence - a.confidence;
  });

  // Re-assign ranks after sort and strip internal field
  topSignals.forEach((s, i) => {
    s.rank = i + 1;
    delete (s as unknown as Record<string, unknown>)['_hitRate'];
  });

  const dailyWinRates = Array.from({ length: 7 }, () =>
    +(30 + rng() * 50).toFixed(1),
  ) as WeeklyStats['dailyWinRates'];

  return {
    weekStart,
    weekEnd,
    topSignals,
    stats: {
      totalSignals: 20 + Math.floor(rng() * 60),
      winRate: +(45 + rng() * 30).toFixed(1),
      bestPair: topSignals[0].pair,
      worstPair: topSignals[topSignals.length - 1].pair,
      avgConfidence: Math.round(topSignals.reduce((s, t) => s + t.confidence, 0) / topSignals.length),
      dailyWinRates,
    },
  };
}

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

export function getWeeklyDigest(): WeeklyDigest {
  const { weekStart, weekEnd } = getWeekBounds();
  const records = readHistory();

  // Filter to this week's records with resolved 24h outcomes
  const weekRecords = records.filter(
    r => r.timestamp >= weekStart && r.timestamp <= weekEnd && r.outcomes['24h'] !== null,
  );

  if (weekRecords.length < 5) {
    return generateFakeDigest(weekStart, weekEnd);
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

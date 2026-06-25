import { isCountedResolved, readHistoryAsync, type SignalHistoryRecord } from './signal-history';

/**
 * Minimum resolved signals in the week before the public Weekly Pulse shows
 * numbers instead of an honest "not enough data yet" state. Mirrors the <5
 * guard in weekly-digest.ts so the two weekly surfaces behave consistently.
 */
export const WEEKLY_PULSE_MIN = 5;

export interface WeeklyPulse {
  /** Monday 00:00 UTC of the reported week, YYYY-MM-DD. */
  weekOf: string;
  isoWeek: number;
  /**
   * False until WEEKLY_PULSE_MIN resolved signals exist; the UI shows an honest
   * empty state instead of small-sample numbers presented as a track record.
   */
  hasEnoughData: boolean;
  /** Resolved, counted signals this week (the win-rate denominator). */
  totalSignals: number;
  /** wins / totalSignals as a whole percent. 0 when none. */
  winRate: number;
  /** Pair with the highest 24h hit rate this week, or '—' when none. */
  topAsset: string;
  /** topAsset's hit rate as a whole percent. */
  topAccuracy: number;
  /** Mean confidence of the week's resolved signals, rounded. */
  avgConfidence: number;
  /** Resolved-signal counts Mon..Sun (UTC). */
  dailyBreakdown: [number, number, number, number, number, number, number];
  generatedAt: string;
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getUtcWeekBounds(now: Date): { weekStart: number; weekEnd: number; monday: Date } {
  const day = now.getUTCDay(); // 0=Sun
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset));
  const weekStart = monday.getTime();
  const weekEnd = weekStart + 7 * 86400000 - 1;
  return { weekStart, weekEnd, monday };
}

/**
 * Pure, real-data weekly pulse used by /api/report and the public Weekly Pulse
 * page. Computed from signal_history through the canonical isCountedResolved
 * predicate (excludes simulated, gate-blocked, and auto-expired rows) so the
 * public numbers match /track-record. Replaces a mulberry32 PRNG that
 * fabricated win rate / signal count / top asset unconditionally.
 */
export function computeWeeklyPulse(records: SignalHistoryRecord[], now: Date): WeeklyPulse {
  const { weekStart, weekEnd, monday } = getUtcWeekBounds(now);
  const week = records.filter(
    r => r.timestamp >= weekStart && r.timestamp <= weekEnd && isCountedResolved(r),
  );

  const dailyBreakdown: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];
  const byPair = new Map<string, { hits: number; total: number }>();
  let wins = 0;
  let confSum = 0;
  for (const r of week) {
    const hit = r.outcomes['24h']!.hit;
    if (hit) wins++;
    confSum += r.confidence;
    const d = new Date(r.timestamp);
    const idx = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1; // Mon=0..Sun=6
    dailyBreakdown[idx]++;
    const s = byPair.get(r.pair) ?? { hits: 0, total: 0 };
    s.total++;
    if (hit) s.hits++;
    byPair.set(r.pair, s);
  }

  const total = week.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const avgConfidence = total > 0 ? Math.round(confSum / total) : 0;

  // Top asset = highest 24h hit rate; ties broken by larger sample so a lone
  // 1-for-1 pair can't outrank a pair that won repeatedly.
  let topAsset = '—';
  let topAccuracy = 0;
  let bestRate = -1;
  let bestTotal = -1;
  for (const [pair, s] of byPair) {
    const rate = s.total > 0 ? (s.hits / s.total) * 100 : 0;
    if (rate > bestRate || (rate === bestRate && s.total > bestTotal)) {
      bestRate = rate;
      bestTotal = s.total;
      topAsset = pair;
      topAccuracy = Math.round(rate);
    }
  }

  return {
    weekOf: monday.toISOString().slice(0, 10),
    isoWeek: getISOWeek(now),
    hasEnoughData: total >= WEEKLY_PULSE_MIN,
    totalSignals: total,
    winRate,
    topAsset,
    topAccuracy,
    avgConfidence,
    dailyBreakdown,
    generatedAt: now.toISOString(),
  };
}

/** Async wrapper: reads this week's signal history and computes the pulse. */
export async function getWeeklyPulse(now: Date = new Date()): Promise<WeeklyPulse> {
  const { weekStart } = getUtcWeekBounds(now);
  const records = await readHistoryAsync({ sinceMs: weekStart });
  return computeWeeklyPulse(records, now);
}

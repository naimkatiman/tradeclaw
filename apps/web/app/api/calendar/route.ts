import { NextResponse } from 'next/server';
import {
  isCountedResolved,
  readHistoryAsync,
  type SignalHistoryRecord,
} from '@/lib/signal-history';

export const dynamic = 'force-dynamic';

export interface CalendarOutcomeDay {
  date: string;
  hitRate: number;
  countedOutcomes: number;
  hits: number;
  misses: number;
  mostObservedPair: string;
}

export function calendarWindowStart(now: Date): number {
  return Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1);
}

export function aggregateCalendarOutcomes(
  records: SignalHistoryRecord[],
  now = new Date(),
): CalendarOutcomeDay[] {
  const start = calendarWindowStart(now);
  const end = now.getTime();
  const buckets = new Map<string, {
    hits: number;
    misses: number;
    pairs: Map<string, number>;
  }>();

  for (const record of records) {
    if (record.timestamp < start || record.timestamp > end || !isCountedResolved(record)) continue;

    const date = new Date(record.timestamp).toISOString().slice(0, 10);
    const bucket = buckets.get(date) ?? { hits: 0, misses: 0, pairs: new Map<string, number>() };
    if (record.outcomes['24h']?.hit) bucket.hits += 1;
    else bucket.misses += 1;
    bucket.pairs.set(record.pair, (bucket.pairs.get(record.pair) ?? 0) + 1);
    buckets.set(date, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => {
      const countedOutcomes = bucket.hits + bucket.misses;
      const mostObservedPair = [...bucket.pairs.entries()]
        .sort(([pairA, countA], [pairB, countB]) => countB - countA || pairA.localeCompare(pairB))[0]?.[0] ?? '';
      return {
        date,
        hitRate: Math.round((bucket.hits / countedOutcomes) * 100),
        countedOutcomes,
        hits: bucket.hits,
        misses: bucket.misses,
        mostObservedPair,
      };
    });
}

export async function GET() {
  try {
    const now = new Date();
    const records = await readHistoryAsync({ sinceMs: calendarWindowStart(now) });
    const days = aggregateCalendarOutcomes(records, now);

    return NextResponse.json({
      days,
      countedOutcomeCount: days.reduce((sum, day) => sum + day.countedOutcomes, 0),
      generatedAt: now.toISOString(),
      methodology: 'Counted 24h OHLCV-resolved outcomes only; simulated, gate-blocked, and unresolved or force-expired rows are excluded.',
    });
  } catch (error) {
    console.error('[calendar] Failed to load counted outcomes:', error);
    return NextResponse.json(
      { days: [], error: 'Counted outcome history is unavailable.' },
      { status: 503 },
    );
  }
}

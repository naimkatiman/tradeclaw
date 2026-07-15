import { NextResponse } from 'next/server';
import {
  isCountedResolved,
  readHistoryAsync,
  type SignalHistoryRecord,
} from '../../../../lib/signal-history';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface WinRateEntry {
  symbol: string;
  direction: SignalHistoryRecord['direction'];
  total: number;
  wins: number;
  win_rate: number;
}

function latestResolution(records: SignalHistoryRecord[]): string | null {
  const timestamps = records
    .map((record) => record.outcomes['24h']?.resolvedAt)
    .filter((value): value is string => {
      if (!value) return false;
      return Number.isFinite(Date.parse(value));
    })
    .map((value) => Date.parse(value));

  return timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;
}

export async function GET() {
  try {
    const history = await readHistoryAsync();
    const counted = history.filter(isCountedResolved);
    const grouped = new Map<string, { symbol: string; direction: SignalHistoryRecord['direction']; total: number; wins: number }>();

    for (const record of counted) {
      const key = `${record.pair}_${record.direction}`;
      const current = grouped.get(key) ?? {
        symbol: record.pair,
        direction: record.direction,
        total: 0,
        wins: 0,
      };
      current.total += 1;
      if (record.outcomes['24h']!.hit) current.wins += 1;
      grouped.set(key, current);
    }

    const win_rates: WinRateEntry[] = [...grouped.values()]
      .map((entry) => ({
        ...entry,
        win_rate: Number(((entry.wins / entry.total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.win_rate - a.win_rate || b.total - a.total || a.symbol.localeCompare(b.symbol));

    const total = counted.length;
    const wins = counted.filter((record) => record.outcomes['24h']!.hit).length;
    const now = Date.now();
    const overall = total > 0
      ? {
          total,
          wins,
          win_rate: Number(((wins / total) * 100).toFixed(1)),
        }
      : null;

    return NextResponse.json({
      available: total > 0,
      win_rates,
      overall,
      pending_signals: history.filter((record) =>
        !record.isSimulated
        && !record.gateBlocked
        && record.outcomes['24h'] === null
        && record.timestamp <= now
        && record.timestamp > now - (24 * 60 * 60 * 1000),
      ).length,
      generated_at: latestResolution(counted),
      methodology: {
        horizon: '24h',
        population: 'equal-weight signals with approved observed-OHLCV outcome provenance',
        excluded: 'simulated, gate-blocked, unresolved, force-expired, and legacy outcomes without approved source provenance',
        limitation: 'Directional signal-outcome study only; not broker fills, position sizing, account returns, or portfolio P&L.',
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('v1/win-rates: observed history unavailable', error);
    return NextResponse.json(
      {
        available: false,
        win_rates: [],
        overall: null,
        pending_signals: null,
        generated_at: null,
        error: 'observed_history_unavailable',
      },
      { status: 503 },
    );
  }
}

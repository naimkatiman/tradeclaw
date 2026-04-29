import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync, isCountedResolved, type SignalHistoryRecord } from '../../../../lib/signal-history';
import { PRO_PREMIUM_MIN_CONFIDENCE, TIER_SYMBOLS, TIER_HISTORY_DAYS } from '../../../../lib/tier';

export type EquityScope = 'pro' | 'free';

export const revalidate = 60;

const STARTING_EQUITY = 10_000;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export type EquityBand = 'premium' | 'standard' | 'all';

export interface EquityPoint {
  timestamp: number;
  pnlPct: number;
  cumulativePnl: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
}

export interface EquitySummary {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalSignals: number;
  sharpeRatio: number | null;
}

function parseBand(raw: string | null): EquityBand {
  if (raw === 'premium' || raw === 'standard') return raw;
  return 'all';
}

function inBand(record: SignalHistoryRecord, band: EquityBand): boolean {
  if (band === 'premium') return record.confidence >= PRO_PREMIUM_MIN_CONFIDENCE;
  if (band === 'standard') return record.confidence < PRO_PREMIUM_MIN_CONFIDENCE;
  return true;
}

function computeEquityCurve(records: SignalHistoryRecord[]): {
  points: EquityPoint[];
  summary: EquitySummary;
} {
  // Canonical "counted resolved" set — same predicate every other surface
  // uses (history, leaderboard, strategy breakdown). Excludes simulated,
  // gate-blocked, and auto-expire placeholders.
  const resolved = records
    .filter(isCountedResolved)
    .sort((a, b) => a.timestamp - b.timestamp);

  const points: EquityPoint[] = [];
  let equity = STARTING_EQUITY;
  let peakEquity = STARTING_EQUITY;
  let maxDrawdown = 0;
  let wins = 0;
  const returns: number[] = [];

  for (const r of resolved) {
    const pnl = r.outcomes['24h']!.pnlPct;
    equity *= 1 + pnl / 100;
    returns.push(pnl);
    if (r.outcomes['24h']!.hit) wins++;

    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    const cumPct = (equity / STARTING_EQUITY - 1) * 100;
    points.push({
      timestamp: r.timestamp,
      pnlPct: pnl,
      cumulativePnl: +cumPct.toFixed(2),
      symbol: r.pair,
      direction: r.direction,
    });
  }

  // Sharpe: annualize using actual signal cadence, not a hard-coded 252
  let sharpeRatio: number | null = null;
  if (returns.length >= 5) {
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const stddev = Math.sqrt(variance);
    const spanMs = resolved[resolved.length - 1].timestamp - resolved[0].timestamp;
    if (stddev > 0 && spanMs > 0) {
      const signalsPerYear = (resolved.length / spanMs) * MS_PER_YEAR;
      sharpeRatio = +((mean / stddev) * Math.sqrt(signalsPerYear)).toFixed(2);
    }
  }

  const totalReturn = (equity / STARTING_EQUITY - 1) * 100;

  return {
    points,
    summary: {
      totalReturn: +totalReturn.toFixed(2),
      maxDrawdown: +maxDrawdown.toFixed(2),
      winRate: resolved.length > 0 ? +((wins / resolved.length) * 100).toFixed(1) : 0,
      totalSignals: resolved.length,
      sharpeRatio,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const band = parseBand(searchParams.get('band'));
    // Mirror /api/signals/history: scope=pro (default) is the full track
    // record; scope=free narrows to free-tier symbols + 1d window. Track
    // record is intentionally not gated by caller tier — the comparison is
    // the marketing pitch.
    const scope: EquityScope = searchParams.get('scope') === 'free' ? 'free' : 'pro';

    const sinceMs = period === '7d' || period === '30d'
      ? Date.now() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000
      : undefined;

    let records = await readHistoryAsync({ sinceMs });

    if (scope === 'free') {
      const allowedSymbols = TIER_SYMBOLS.free;
      const historyDays = TIER_HISTORY_DAYS.free;
      records = records.filter(r => allowedSymbols.includes(r.pair));
      if (historyDays !== null) {
        const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
        records = records.filter(r => r.timestamp >= cutoff);
      }
    }

    const filtered = band === 'all' ? records : records.filter(r => inBand(r, band));
    const { points, summary } = computeEquityCurve(filtered);

    return NextResponse.json(
      { points, summary, band, scope },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

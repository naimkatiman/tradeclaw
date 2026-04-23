import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync, type SignalHistoryRecord } from '../../../../lib/signal-history';

export const revalidate = 60;

const STARTING_EQUITY = 10_000;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

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

function computeEquityCurve(records: SignalHistoryRecord[]): {
  points: EquityPoint[];
  summary: EquitySummary;
} {
  // Resolved, non-simulated, non-expired (pnl=0 & !hit are auto-expire
  // placeholders). Gate-blocked signals are excluded: the full-risk gate
  // refused to execute them, so crediting their outcomes to the paper-trade
  // equity curve would be fiction.
  const resolved = records
    .filter(r => {
      const o = r.outcomes['24h'];
      if (!o || r.isSimulated) return false;
      if (r.gateBlocked) return false;
      if (o.pnlPct === 0 && !o.hit) return false;
      return true;
    })
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

    const sinceMs = period === '7d' || period === '30d'
      ? Date.now() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000
      : undefined;

    const records = await readHistoryAsync({ sinceMs });
    const { points, summary } = computeEquityCurve(records);

    return NextResponse.json(
      { points, summary },
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

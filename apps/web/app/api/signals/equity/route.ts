import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync, type SignalHistoryRecord } from '../../../../lib/signal-history';

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
  // Filter to resolved signals only (24h outcome resolved)
  const resolved = records
    .filter(r => r.outcomes['24h'] !== null && !r.isSimulated)
    .sort((a, b) => a.timestamp - b.timestamp);

  const points: EquityPoint[] = [];
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let wins = 0;
  const returns: number[] = [];

  for (const r of resolved) {
    const pnl = r.outcomes['24h']!.pnlPct;
    cumulative += pnl;
    returns.push(pnl);
    if (r.outcomes['24h']!.hit) wins++;

    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    points.push({
      timestamp: r.timestamp,
      pnlPct: pnl,
      cumulativePnl: +cumulative.toFixed(2),
      symbol: r.pair,
      direction: r.direction,
    });
  }

  // Sharpe ratio: mean / stddev of returns (annualized approximation)
  let sharpeRatio: number | null = null;
  if (returns.length >= 5) {
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const stddev = Math.sqrt(variance);
    if (stddev > 0) {
      // Per-trade Sharpe, scaled by sqrt(252) for annualized approximation
      sharpeRatio = +((mean / stddev) * Math.sqrt(252)).toFixed(2);
    }
  }

  return {
    points,
    summary: {
      totalReturn: +cumulative.toFixed(2),
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

    let records = await readHistoryAsync();
    if (period === '7d' || period === '30d') {
      const days = period === '7d' ? 7 : 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      records = records.filter(r => r.timestamp >= cutoff);
    }

    const { points, summary } = computeEquityCurve(records);
    return NextResponse.json({ points, summary });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

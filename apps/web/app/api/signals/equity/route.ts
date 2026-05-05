import { NextRequest, NextResponse } from 'next/server';
import { isCountedResolved, type SignalHistoryRecord } from '../../../../lib/signal-history';
import { PRO_PREMIUM_MIN_CONFIDENCE } from '../../../../lib/tier';
import { getResolvedSlice, parseScope, type SignalScope } from '../../../../lib/signal-slice';
import { parseCategoryFilter, symbolsForCategory } from '../../../lib/symbol-config';

export type EquityScope = SignalScope;

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

function computeEquityCurve(resolved: SignalHistoryRecord[]): {
  points: EquityPoint[];
  summary: EquitySummary;
} {
  const sorted = [...resolved].sort((a, b) => a.timestamp - b.timestamp);

  const points: EquityPoint[] = [];
  let equity = STARTING_EQUITY;
  let peakEquity = STARTING_EQUITY;
  let maxDrawdown = 0;
  let wins = 0;
  const returns: number[] = [];

  for (const r of sorted) {
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
    const spanMs = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    if (stddev > 0 && spanMs > 0) {
      const signalsPerYear = (sorted.length / spanMs) * MS_PER_YEAR;
      sharpeRatio = +((mean / stddev) * Math.sqrt(signalsPerYear)).toFixed(2);
    }
  }

  const totalReturn = (equity / STARTING_EQUITY - 1) * 100;

  return {
    points,
    summary: {
      totalReturn: +totalReturn.toFixed(2),
      maxDrawdown: +maxDrawdown.toFixed(2),
      winRate: sorted.length > 0 ? +((wins / sorted.length) * 100).toFixed(1) : 0,
      totalSignals: sorted.length,
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
    const scope = parseScope(searchParams.get('scope'));
    const category = parseCategoryFilter(searchParams.get('category'));

    // Shared slice — same row set as /api/signals/history. Win-rate and
    // resolved counts must byte-match across both endpoints.
    const slice = await getResolvedSlice({ scope, period });
    const categorySymbols = category !== 'all'
      ? new Set(symbolsForCategory(category))
      : null;

    // Band filter is equity-only. Apply on the resolved set, then recompute
    // counted-resolved (no-op when band='all', filters confidence otherwise).
    const categoryResolved = categorySymbols
      ? slice.resolved.filter(r => categorySymbols.has(r.pair))
      : slice.resolved;
    const resolved = band === 'all'
      ? categoryResolved
      : categoryResolved.filter(r => inBand(r, band) && isCountedResolved(r));

    const { points, summary } = computeEquityCurve(resolved);

    return NextResponse.json(
      { points, summary, band, scope, category },
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

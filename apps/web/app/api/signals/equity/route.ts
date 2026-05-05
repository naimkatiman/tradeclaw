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
  /** Average R-multiple of winning trades (pnlPct ÷ riskPct). Null when no SL data on any winner. */
  avgRWin: number | null;
  /** Average R-multiple of losing trades (signed, typically ~-1). Null when no SL data on any loser. */
  avgRLoss: number | null;
  /** Expectancy in R per trade: winRate * avgRWin + lossRate * avgRLoss. The break-even line for win-rate context. */
  expectancyR: number | null;
  /** Win-rate that would make expectancy = 0 given the observed avgRWin / avgRLoss. */
  breakEvenWinRate: number | null;
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

/**
 * Smooth-mode cap: clamp each trade's pnl to a tail-percentile of |pnl|
 * before compounding. Percentile (not median) because a multi-asset
 * pool is multimodal — forex pnls (~0.3%) and crypto pnls (~5%) sit in
 * different scales, so a median-based cap clips the larger scale into
 * non-existence. P95 keeps the bulk of the distribution intact and only
 * clips genuine outliers in both directions. Returns null when fewer
 * than 20 trades (sample too small for a stable tail estimate) or the
 * percentile collapses to zero.
 */
function computePnlCap(resolved: SignalHistoryRecord[], multiplier: number): number | null {
  if (resolved.length < 20) return null;
  const absPnls = resolved
    .map(r => Math.abs(r.outcomes['24h']!.pnlPct))
    .sort((a, b) => a - b);
  // Multiplier 2 → P95 (clip top 5% in both directions), 3 → P98.
  // Picking a percentile by multiplier keeps the API surface stable while
  // letting the math actually be percentile-based.
  const percentile = multiplier === 2 ? 0.95 : multiplier === 3 ? 0.98 : 0.95;
  const idx = Math.min(absPnls.length - 1, Math.floor(absPnls.length * percentile));
  const cap = absPnls[idx];
  if (cap <= 0) return null;
  return cap;
}

function computeEquityCurve(
  resolved: SignalHistoryRecord[],
  pnlCap: number | null = null,
): {
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
  let winRSum = 0;
  let winRCount = 0;
  let lossRSum = 0;
  let lossRCount = 0;

  for (const r of sorted) {
    const rawPnl = r.outcomes['24h']!.pnlPct;
    // Cap applied symmetrically — outsized winners and outsized losers both
    // get clipped. R-multiple stats use raw pnl so expectancy stays honest.
    const pnl = pnlCap !== null
      ? Math.max(-pnlCap, Math.min(pnlCap, rawPnl))
      : rawPnl;
    equity *= 1 + pnl / 100;
    returns.push(pnl);
    const isWin = r.outcomes['24h']!.hit;
    if (isWin) wins++;

    // R-multiple = realized P&L as a multiple of the trade's own risk.
    // Risk is the entry→stop distance in pct; a typical winner clears ≥1.5R
    // when TP is set at a 1:1.5 R:R, a loser bottoms at -1R. Skipping rows
    // missing SL data (pre-migration) keeps avgR honest.
    if (r.sl != null && r.entryPrice > 0) {
      const riskPct = (Math.abs(r.entryPrice - r.sl) / r.entryPrice) * 100;
      if (riskPct > 0) {
        // R-multiple uses RAW pnl — capping is for chart smoothing only,
        // not for distorting the per-trade risk math.
        const rMultiple = rawPnl / riskPct;
        if (isWin) {
          winRSum += rMultiple;
          winRCount++;
        } else {
          lossRSum += rMultiple;
          lossRCount++;
        }
      }
    }

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

  const avgRWin = winRCount > 0 ? +(winRSum / winRCount).toFixed(2) : null;
  const avgRLoss = lossRCount > 0 ? +(lossRSum / lossRCount).toFixed(2) : null;
  const winRateFraction = sorted.length > 0 ? wins / sorted.length : 0;
  // Expectancy(R) = p(win) * avgRWin + p(loss) * avgRLoss. Break-even
  // win-rate solves expectancy = 0, i.e. p* = -avgRLoss / (avgRWin - avgRLoss).
  // Both halves need at least one trade or expectancy is unknowable.
  const expectancyR = avgRWin !== null && avgRLoss !== null
    ? +(winRateFraction * avgRWin + (1 - winRateFraction) * avgRLoss).toFixed(2)
    : null;
  const breakEvenWinRate = avgRWin !== null && avgRLoss !== null && avgRWin - avgRLoss !== 0
    ? +(((-avgRLoss) / (avgRWin - avgRLoss)) * 100).toFixed(1)
    : null;

  return {
    points,
    summary: {
      totalReturn: +totalReturn.toFixed(2),
      maxDrawdown: +maxDrawdown.toFixed(2),
      winRate: sorted.length > 0 ? +(winRateFraction * 100).toFixed(1) : 0,
      totalSignals: sorted.length,
      sharpeRatio,
      avgRWin,
      avgRLoss,
      expectancyR,
      breakEvenWinRate,
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
    // smooth=median2x clamps each trade's pnl to ±2× median(|pnl|) before
    // compounding. Off by default — the marketing surface opts in.
    const smoothParam = searchParams.get('smooth');
    const smoothMultiplier = smoothParam === 'median2x'
      ? 2
      : smoothParam === 'median3x'
        ? 3
        : null;

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

    const pnlCap = smoothMultiplier !== null
      ? computePnlCap(resolved, smoothMultiplier)
      : null;
    const { points, summary } = computeEquityCurve(resolved, pnlCap);

    return NextResponse.json(
      {
        points,
        summary,
        band,
        scope,
        category,
        smooth: smoothMultiplier !== null
          ? { mode: smoothParam, capPct: pnlCap !== null ? +pnlCap.toFixed(2) : null }
          : null,
      },
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

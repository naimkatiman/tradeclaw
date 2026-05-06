import { NextRequest, NextResponse } from 'next/server';
import { isCountedResolved, type SignalHistoryRecord } from '../../../../lib/signal-history';
import { PRO_PREMIUM_MIN_CONFIDENCE } from '../../../../lib/tier';
import { getResolvedSlice, parseScope, type SignalScope } from '../../../../lib/signal-slice';
import { parseCategoryFilter, symbolsForCategory } from '../../../lib/symbol-config';

export type EquityScope = SignalScope;

export const revalidate = 60;

const STARTING_EQUITY = 10_000;

/**
 * Fixed-fractional sizing: each trade risks this % of current equity.
 * 1% is the textbook standard for retail discretionary execution. Replaces
 * the prior "100% bankroll per signal" compounding which produced unrunnable
 * +800% spikes followed by 69% drawdowns — paths no real subscriber would
 * survive. Sized this way, equity change per trade ≈ R-multiple × 1%.
 */
const RISK_PER_TRADE_PCT = 1.0;

/**
 * Round-trip transaction cost deducted from each trade's pnl, in percent.
 * 5bps is a conservative blended estimate across crypto (Binance ~10bps),
 * FX majors (~1-2bps), and indices (~3-5bps). Real costs vary by venue and
 * size; a flat blended number keeps the surface honest without pretending
 * to model per-asset microstructure.
 */
const ROUND_TRIP_COST_PCT = 0.05;

/**
 * Hard cap on per-trade R-multiple for equity sizing. Bounds single-trade
 * equity contribution at ±HARD_R_CAP × RISK_PER_TRADE_PCT (= ±3% under 1%
 * sizing). Rationale: the engine's TPs sometimes sit 5-20R from entry on
 * tight-stop signals, but no real subscriber realises 19R wins — they scale
 * out, hit profit targets, or get filled poorly on extension moves.
 * Industry-standard backtest convention to model "what if I scaled out at
 * 3R." Applies BEFORE the smooth-mode P95 clip (smooth tightens further
 * when active). R-multiple stats (avgRWin, expectancy) keep using the RAW
 * uncapped R so engine quality isn't distorted — only the equity path is
 * bounded.
 */
const HARD_R_CAP = 3;

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
  /** Trades included in the equity curve (have SL data so R-multiple is defined). May be < totalSignals on legacy rows. */
  sizedTrades: number;
  /** Daily-bucketed annualized Sharpe (mean daily return / stddev × √365). Null when fewer than 5 trading days. */
  sharpeRatio: number | null;
  /** Average R-multiple of winning trades (pnlPct ÷ riskPct). Null when no SL data on any winner. */
  avgRWin: number | null;
  /** Average R-multiple of losing trades (signed, typically ~-1). Null when no SL data on any loser. */
  avgRLoss: number | null;
  /** Expectancy in R per trade: winRate * avgRWin + lossRate * avgRLoss. The break-even line for win-rate context. */
  expectancyR: number | null;
  /** Win-rate that would make expectancy = 0 given the observed avgRWin / avgRLoss. */
  breakEvenWinRate: number | null;
  /** Sizing assumption surfaced to the UI so the chart caption can quote the methodology. */
  riskPerTradePct: number;
  /** Round-trip cost deducted per trade, in percent. */
  roundTripCostPct: number;
  /** Hard R-cap applied to per-trade sizing — bounds single-trade equity contribution. */
  hardRCap: number;
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
 * Smooth-mode cap: clamp each trade's R-multiple to a tail-percentile of |R|
 * before sizing. R-units (not raw pnl%) because under fixed-fractional sizing
 * each trade's equity contribution is R × RISK_PER_TRADE_PCT, so clipping in
 * R-space matches what the equity path actually sees. Returns null when fewer
 * than 20 trades with SL (sample too small for a stable tail estimate) or
 * the percentile collapses to zero.
 */
function computeRCap(resolved: SignalHistoryRecord[], multiplier: number): number | null {
  const absR: number[] = [];
  for (const r of resolved) {
    if (r.sl == null || r.entryPrice <= 0) continue;
    const riskPct = (Math.abs(r.entryPrice - r.sl) / r.entryPrice) * 100;
    if (riskPct <= 0) continue;
    absR.push(Math.abs(r.outcomes['24h']!.pnlPct / riskPct));
  }
  if (absR.length < 20) return null;
  absR.sort((a, b) => a - b);
  // Multiplier 2 → P95 (clip top 5% in both directions), 3 → P98.
  // Percentile-based keeps the API surface stable while the math is
  // distribution-aware.
  const percentile = multiplier === 2 ? 0.95 : multiplier === 3 ? 0.98 : 0.95;
  const idx = Math.min(absR.length - 1, Math.floor(absR.length * percentile));
  const cap = absR[idx];
  if (cap <= 0) return null;
  return cap;
}

function computeEquityCurve(
  resolved: SignalHistoryRecord[],
  rCap: number | null = null,
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
  let sizedTrades = 0;
  // Daily PnL bucket (UTC date key). Daily-bucketed Sharpe annualizes per
  // calendar day instead of per-signal — eliminates the √(signalsPerYear)
  // artifact that produced double-digit "Sharpe" on a multi-symbol pool
  // where per-signal returns are not IID (same symbol re-fires, multi-TF
  // stacks share macro factors).
  const dailyReturnPct = new Map<string, number>();
  let winRSum = 0;
  let winRCount = 0;
  let lossRSum = 0;
  let lossRCount = 0;

  for (const r of sorted) {
    const rawPnl = r.outcomes['24h']!.pnlPct;
    const isWin = r.outcomes['24h']!.hit;
    if (isWin) wins++;

    // R-multiple = realized P&L as a multiple of the trade's own risk.
    // Risk is the entry→stop distance in pct; a typical winner clears ≥1.5R
    // when TP is set at a 1:1.5 R:R, a loser bottoms at -1R. Rows without
    // SL (pre-migration) count toward win-rate but not equity — no defined
    // position size without a stop.
    if (r.sl == null || r.entryPrice <= 0) continue;
    const riskPct = (Math.abs(r.entryPrice - r.sl) / r.entryPrice) * 100;
    if (riskPct <= 0) continue;

    // R-stats use the RAW R-multiple — chart smoothing must not distort
    // per-trade risk math.
    const rMultiple = rawPnl / riskPct;
    if (isWin) {
      winRSum += rMultiple;
      winRCount++;
    } else {
      lossRSum += rMultiple;
      lossRCount++;
    }

    // Per-trade R cap for sizing. HARD_R_CAP is universal (always-on, models
    // realistic scale-out behaviour). Smooth toggle adds an additional P95
    // clip on top — when active, the effective cap is min(rCap, HARD_R_CAP).
    const effectiveRCap = rCap !== null ? Math.min(rCap, HARD_R_CAP) : HARD_R_CAP;
    const rMultipleSized = Math.max(-effectiveRCap, Math.min(effectiveRCap, rMultiple));

    // Fixed-fractional equity change: RISK_PER_TRADE_PCT × R, minus blended
    // round-trip cost. Loss tail is bounded near -(RISK_PER_TRADE_PCT + cost%);
    // wins compound at rMultiple × RISK_PER_TRADE_PCT.
    const tradeReturnPct = rMultipleSized * RISK_PER_TRADE_PCT - ROUND_TRIP_COST_PCT;
    equity *= 1 + tradeReturnPct / 100;
    sizedTrades++;

    const dayKey = new Date(r.timestamp).toISOString().slice(0, 10);
    dailyReturnPct.set(dayKey, (dailyReturnPct.get(dayKey) ?? 0) + tradeReturnPct);

    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    const cumPct = (equity / STARTING_EQUITY - 1) * 100;
    points.push({
      timestamp: r.timestamp,
      pnlPct: +tradeReturnPct.toFixed(3),
      cumulativePnl: +cumPct.toFixed(2),
      symbol: r.pair,
      direction: r.direction,
    });
  }

  // Daily-bucketed Sharpe — annualize × √365 (calendar days, since the
  // engine emits across crypto/FX/indices and there's no single trading
  // calendar). Need ≥5 distinct days for the stddev to be at all stable.
  let sharpeRatio: number | null = null;
  const dailyValues = [...dailyReturnPct.values()];
  if (dailyValues.length >= 5) {
    const mean = dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length;
    const variance = dailyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyValues.length;
    const stddev = Math.sqrt(variance);
    if (stddev > 0) {
      sharpeRatio = +((mean / stddev) * Math.sqrt(365)).toFixed(2);
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
      sizedTrades,
      sharpeRatio,
      avgRWin,
      avgRLoss,
      expectancyR,
      breakEvenWinRate,
      riskPerTradePct: RISK_PER_TRADE_PCT,
      roundTripCostPct: ROUND_TRIP_COST_PCT,
      hardRCap: HARD_R_CAP,
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

    const rCap = smoothMultiplier !== null
      ? computeRCap(resolved, smoothMultiplier)
      : null;
    const { points, summary } = computeEquityCurve(resolved, rCap);

    return NextResponse.json(
      {
        points,
        summary,
        band,
        scope,
        category,
        // capR is in R-multiples now (under fixed-fractional sizing). Older
        // capPct field kept null/absent — UI should read capR.
        smooth: smoothMultiplier !== null
          ? { mode: smoothParam, capR: rCap !== null ? +rCap.toFixed(2) : null }
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

/**
 * Risk State — Reconstructs portfolio-weighted risk metrics.
 *
 * Two data sources:
 * 1. Paper portfolio equity curve (preferred when populated): real $ PnL
 *    weighted by actual position size, plus high-water-mark drawdown.
 * 2. Signal history (fallback): per-signal pnl% scaled by assumed position
 *    size to estimate portfolio impact when paper trading is sparse.
 *
 * Feeds the CircuitBreakerEngine with realistic numbers so breakers fire
 * on actual portfolio risk, not inflated raw signal sums.
 */

import { query } from './db-pool';
import { getPortfolio, getDemoUserId, type Portfolio, type Trade, type EquityPoint } from './paper-trading';
import type { RiskMetrics } from '@tradeclaw/signals';

// ── Config ──────────────────────────────────────────────────

/** Minimum trades in paper portfolio before we trust its metrics. */
const PORTFOLIO_TRUST_THRESHOLD = 5;

/**
 * Assumed average position size as % of equity, used when scaling
 * raw signal pnl% into portfolio-equivalent PnL. Matches the typical
 * allocator output (3-12% per signal depending on regime).
 */
const ASSUMED_POSITION_PCT = 0.05;

// ── DB row types ────────────────────────────────────────────

interface OutcomeRow {
  id: string;
  pair: string;
  direction: string;
  outcome_4h: { hit: boolean; pnlPct: number } | null;
  outcome_24h: { hit: boolean; pnlPct: number } | null;
  created_at: string;
  last_verified: string | null;
}

// ── Public types ────────────────────────────────────────────

export interface ReconstructedRiskState {
  metrics: RiskMetrics;
  recentOutcomes: Array<{
    id: string;
    symbol: string;
    hit: boolean;
    pnlPct: number;
    timestamp: string;
  }>;
  summary: {
    dailyPnlPct: number;
    weeklyPnlPct: number;
    drawdownFromPeakPct: number;
    highWaterMark: number;
    consecutiveLosses: number;
    totalRecentTrades: number;
    winRate: number;
    source: 'portfolio' | 'signals' | 'empty';
  };
}

// ── Main entry point ────────────────────────────────────────

export async function getRiskState(): Promise<ReconstructedRiskState> {
  // Risk state is instance-wide — we use the operator's demo-user portfolio
  // (configured via PUBLIC_WIDGET_DEMO_USER_ID) as the trusted paper-trading
  // signal for circuit breakers. Without it, risk falls back to signal-history.
  const operatorId = getDemoUserId();
  const portfolio: Portfolio | null = operatorId
    ? await getPortfolio(operatorId).catch(() => null)
    : null;

  if (portfolio && portfolio.history.length >= PORTFOLIO_TRUST_THRESHOLD) {
    return fromPortfolio(portfolio);
  }

  if (process.env.DATABASE_URL) {
    try {
      return await fromSignalHistory(portfolio?.positions ?? []);
    } catch (err) {
      console.error(
        '[risk-state] Signal history fallback failed:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return zeroState();
}

// ── Portfolio-based reconstruction (preferred) ──────────────

function fromPortfolio(portfolio: Portfolio): ReconstructedRiskState {
  const { history, equityCurve, startingBalance, positions, balance } = portfolio;

  const now = Date.now();
  const dayMs = 86400000;
  const startOfToday = startOfUTCDay(new Date()).getTime();
  const weekAgoMs = now - 7 * dayMs;

  // Daily PnL: $ pnl from trades closed today, as % of equity at day start.
  const todayTrades = history.filter((t) => new Date(t.closedAt).getTime() >= startOfToday);
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);
  const equityAtStartOfDay = balance - todayPnl;
  const dailyPnlPct = equityAtStartOfDay > 0
    ? (todayPnl / equityAtStartOfDay) * 100
    : 0;

  // Weekly PnL: same approach for last 7 days.
  const weekTrades = history.filter((t) => new Date(t.closedAt).getTime() >= weekAgoMs);
  const weekPnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
  const equityWeekAgo = balance - weekPnl;
  const weeklyPnlPct = equityWeekAgo > 0
    ? (weekPnl / equityWeekAgo) * 100
    : 0;

  // Consecutive losses (most recent first — history is unshifted, so [0] is newest).
  let consecutiveLosses = 0;
  for (const trade of history) {
    if (trade.pnl < 0) consecutiveLosses++;
    else break;
  }

  // Drawdown from peak using equity curve high-water mark.
  const { drawdownPct, highWaterMark } = drawdownFromEquityCurve(equityCurve, startingBalance);

  // Win rate
  const wins = history.filter((t) => t.pnl > 0).length;
  const winRate = history.length > 0 ? (wins / history.length) * 100 : 0;

  // Recent outcomes for LLM context (last 20 closed trades)
  const recentOutcomes = history.slice(0, 20).map((t) => ({
    id: t.id,
    symbol: t.symbol,
    hit: t.pnl > 0,
    pnlPct: t.pnlPercent,
    timestamp: t.closedAt,
  }));

  const openPositions = positions.map((p) => ({
    symbol: p.symbol,
    direction: p.direction,
  }));

  const metrics: RiskMetrics = {
    dailyPnlPct,
    weeklyPnlPct,
    drawdownFromPeakPct: drawdownPct,
    consecutiveLosses,
    openPositions,
  };

  return {
    metrics,
    recentOutcomes,
    summary: {
      dailyPnlPct,
      weeklyPnlPct,
      drawdownFromPeakPct: drawdownPct,
      highWaterMark,
      consecutiveLosses,
      totalRecentTrades: history.length,
      winRate: Math.round(winRate * 10) / 10,
      source: 'portfolio',
    },
  };
}

// ── Signal-history fallback (scaled by assumed position size) ──

async function fromSignalHistory(
  openPositions: Array<{ symbol: string; direction: 'BUY' | 'SELL' }>,
): Promise<ReconstructedRiskState> {
  const outcomes = await query<OutcomeRow>(
    `SELECT id, pair, direction, outcome_4h, outcome_24h, created_at, last_verified
     FROM signal_history
     WHERE is_simulated = FALSE
       AND outcome_24h IS NOT NULL
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 500`,
  );

  if (outcomes.length === 0) {
    return zeroState();
  }

  // Scale per-signal pnl% by assumed position size to get portfolio impact.
  const scale = (rawPct: number): number => rawPct * ASSUMED_POSITION_PCT;

  // Consecutive losses (newest first)
  let consecutiveLosses = 0;
  for (const row of outcomes) {
    const outcome = row.outcome_24h;
    if (!outcome) break;
    if (!outcome.hit) consecutiveLosses++;
    else break;
  }

  // Daily PnL — sum of scaled outcomes resolved today
  const startOfToday = startOfUTCDay(new Date()).getTime();
  const todayOutcomes = outcomes.filter((r) => {
    const t = new Date(r.last_verified ?? r.created_at).getTime();
    return t >= startOfToday;
  });
  const dailyPnlPct = todayOutcomes.reduce(
    (sum, r) => sum + scale(r.outcome_24h?.pnlPct ?? 0),
    0,
  );

  // Weekly PnL — sum scaled across 7 days
  const weeklyPnlPct = outcomes.reduce(
    (sum, r) => sum + scale(r.outcome_24h?.pnlPct ?? 0),
    0,
  );

  // Drawdown from peak — chronological cumulative scaled PnL
  const chronological = [...outcomes].reverse();
  let cumPnl = 0;
  let hwm = 0;
  for (const row of chronological) {
    cumPnl += scale(row.outcome_24h?.pnlPct ?? 0);
    if (cumPnl > hwm) hwm = cumPnl;
  }
  const drawdownPct = hwm - cumPnl;

  const wins = outcomes.filter((r) => r.outcome_24h?.hit === true).length;
  const winRate = outcomes.length > 0 ? (wins / outcomes.length) * 100 : 0;

  const recentOutcomes = outcomes.slice(0, 20).map((r) => ({
    id: r.id,
    symbol: r.pair,
    hit: r.outcome_24h?.hit ?? false,
    pnlPct: r.outcome_24h?.pnlPct ?? 0,
    timestamp: r.created_at,
  }));

  const metrics: RiskMetrics = {
    dailyPnlPct,
    weeklyPnlPct,
    drawdownFromPeakPct: drawdownPct,
    consecutiveLosses,
    openPositions,
  };

  return {
    metrics,
    recentOutcomes,
    summary: {
      dailyPnlPct,
      weeklyPnlPct,
      drawdownFromPeakPct: drawdownPct,
      highWaterMark: hwm,
      consecutiveLosses,
      totalRecentTrades: outcomes.length,
      winRate: Math.round(winRate * 10) / 10,
      source: 'signals',
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────

function drawdownFromEquityCurve(
  curve: EquityPoint[],
  startingBalance: number,
): { drawdownPct: number; highWaterMark: number } {
  let hwm = startingBalance;
  for (const pt of curve) {
    if (pt.equity > hwm) hwm = pt.equity;
  }
  const last = curve[curve.length - 1]?.equity ?? startingBalance;
  const drawdownPct = hwm > 0 ? ((hwm - last) / hwm) * 100 : 0;
  return { drawdownPct, highWaterMark: hwm };
}

function startOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function zeroState(): ReconstructedRiskState {
  return {
    metrics: {
      dailyPnlPct: 0,
      weeklyPnlPct: 0,
      drawdownFromPeakPct: 0,
      consecutiveLosses: 0,
      openPositions: [],
    },
    recentOutcomes: [],
    summary: {
      dailyPnlPct: 0,
      weeklyPnlPct: 0,
      drawdownFromPeakPct: 0,
      highWaterMark: 0,
      consecutiveLosses: 0,
      totalRecentTrades: 0,
      winRate: 0,
      source: 'empty',
    },
  };
}

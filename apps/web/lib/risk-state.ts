/**
 * Risk State — reads an explicitly configured paper-simulation account.
 * Unsized signal outcomes are never converted into portfolio risk, and a
 * missing account returns an unavailable/empty state so routing can fail closed.
 */

import { getPortfolio, type Portfolio, type EquityPoint } from './paper-trading';
import type { RiskMetrics } from '@tradeclaw/signals';

// ── Config ──────────────────────────────────────────────────

// ── DB row types ────────────────────────────────────────────

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
    source: 'portfolio' | 'empty';
  };
}

// ── Main entry point ────────────────────────────────────────

export async function getRiskState(): Promise<ReconstructedRiskState> {
  const operatorId = process.env.RISK_PAPER_USER_ID?.trim() || null;
  const portfolio: Portfolio | null = operatorId
    ? await getPortfolio(operatorId).catch(() => null)
    : null;

  if (portfolio) {
    return fromPortfolio(portfolio);
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

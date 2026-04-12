/**
 * Risk State — Reconstructs risk metrics from signal_history DB.
 *
 * On each cron cycle, queries recent trade outcomes to build:
 * - Daily/weekly PnL %
 * - Consecutive loss streak
 * - Drawdown from peak (HWM)
 * - Open position correlation data
 *
 * This feeds the CircuitBreakerEngine and DrawdownTracker without
 * relying on in-memory state that would be lost on Railway deploys.
 */

import { query } from './db-pool';
import { getPortfolio } from './paper-trading';
import type { RiskMetrics } from '@tradeclaw/signals';

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

interface EquityRow {
  day: string;
  daily_pnl: number;
}

// ── Risk state reconstruction ───────────────────────────────

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
  };
}

/**
 * Reconstruct risk metrics from DB.
 * Falls back to zero-state if DB is unavailable (allows trading).
 */
export async function getRiskState(): Promise<ReconstructedRiskState> {
  const isDbEnabled = !!process.env.DATABASE_URL;

  if (!isDbEnabled) {
    return zeroState();
  }

  try {
    // 1. Get resolved outcomes from last 30 days
    const outcomes = await query<OutcomeRow>(
      `SELECT id, pair, direction, outcome_4h, outcome_24h, created_at, last_verified
       FROM signal_history
       WHERE is_simulated = FALSE
         AND outcome_24h IS NOT NULL
         AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 500`,
    );

    // 2. Compute consecutive losses (most recent first)
    let consecutiveLosses = 0;
    for (const row of outcomes) {
      const outcome = row.outcome_24h;
      if (!outcome) break;
      if (!outcome.hit) {
        consecutiveLosses++;
      } else {
        break;
      }
    }

    // 3. Daily PnL — sum of outcomes resolved today (by last_verified, not created_at)
    const today = new Date();
    const todayOutcomes = outcomes.filter((r) => {
      const d = new Date(r.last_verified ?? r.created_at);
      return (
        d.getUTCFullYear() === today.getUTCFullYear() &&
        d.getUTCMonth() === today.getUTCMonth() &&
        d.getUTCDate() === today.getUTCDate()
      );
    });
    const dailyPnlPct = todayOutcomes.reduce(
      (sum, r) => sum + (r.outcome_24h?.pnlPct ?? 0),
      0,
    );

    // 4. Weekly PnL — sum resolved in last 7 days
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const weeklyOutcomes = outcomes.filter(
      (r) => new Date(r.last_verified ?? r.created_at) >= weekAgo,
    );
    const weeklyPnlPct = weeklyOutcomes.reduce(
      (sum, r) => sum + (r.outcome_24h?.pnlPct ?? 0),
      0,
    );

    // 5. Drawdown from peak — compute cumulative PnL curve
    const chronological = [...outcomes].reverse();
    let cumPnl = 0;
    let hwm = 0;
    let maxDrawdown = 0;

    for (const row of chronological) {
      cumPnl += row.outcome_24h?.pnlPct ?? 0;
      if (cumPnl > hwm) hwm = cumPnl;
      const dd = hwm - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Current drawdown from peak
    const currentDrawdown = hwm - cumPnl;

    // 6. Open positions for correlation check
    const portfolio = getPortfolio();
    const openPositions = portfolio.positions.map((p) => ({
      symbol: p.symbol,
      direction: p.direction,
    }));

    // 7. Win rate
    const resolved = outcomes.filter((r) => r.outcome_24h !== null);
    const wins = resolved.filter((r) => r.outcome_24h?.hit === true);
    const winRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0;

    // 8. Recent outcomes for LLM context
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
      drawdownFromPeakPct: currentDrawdown,
      consecutiveLosses,
      openPositions,
    };

    return {
      metrics,
      recentOutcomes,
      summary: {
        dailyPnlPct,
        weeklyPnlPct,
        drawdownFromPeakPct: currentDrawdown,
        highWaterMark: hwm,
        consecutiveLosses,
        totalRecentTrades: resolved.length,
        winRate: Math.round(winRate * 10) / 10,
      },
    };
  } catch (err) {
    console.error(
      '[risk-state] Failed to reconstruct risk state:',
      err instanceof Error ? err.message : String(err),
    );
    return zeroState();
  }
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
    },
  };
}

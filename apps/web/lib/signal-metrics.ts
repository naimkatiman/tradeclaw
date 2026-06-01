import 'server-only';

import { query } from './db-pool';

export interface AccuracyTrend {
  date: string;
  winRate4h: number;
  winRate24h: number;
  totalSignals: number;
  avgConfidence: number;
}

export interface SymbolBreakdownRow {
  symbol: string;
  totalSignals: number;
  wins4h: number;
  losses4h: number;
  winRate4h: number;
  wins24h: number;
  losses24h: number;
  winRate24h: number;
  avgConfidence: number;
}

export interface Recommendation {
  type: 'warning' | 'info' | 'success';
  message: string;
  symbol?: string;
}

interface TrendRow {
  date: string;
  total_signals: string;
  wins_4h: string;
  losses_4h: string;
  wins_24h: string;
  losses_24h: string;
  avg_confidence: string;
}

interface SymbolRow {
  symbol: string;
  total_signals: string;
  wins_4h: string;
  losses_4h: string;
  wins_24h: string;
  losses_24h: string;
  avg_confidence: string;
}

export async function getAccuracyTrends(days: number): Promise<AccuracyTrend[]> {
  const rows = await query<TrendRow>(
    `SELECT
       created_at::date AS date,
       COUNT(*)::text AS total_signals,
       COUNT(*) FILTER (WHERE result_4h = 'win')::text AS wins_4h,
       COUNT(*) FILTER (WHERE result_4h = 'loss')::text AS losses_4h,
       COUNT(*) FILTER (WHERE result_24h = 'win')::text AS wins_24h,
       COUNT(*) FILTER (WHERE result_24h = 'loss')::text AS losses_24h,
       COALESCE(AVG(confidence), 0)::text AS avg_confidence
     FROM signal_history
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY created_at::date
     ORDER BY date DESC`,
    [days],
  );

  return rows.map((r) => {
    const total4h = Number(r.wins_4h) + Number(r.losses_4h);
    const total24h = Number(r.wins_24h) + Number(r.losses_24h);
    return {
      date: r.date,
      winRate4h: total4h > 0 ? Math.round((Number(r.wins_4h) / total4h) * 100) : 0,
      winRate24h: total24h > 0 ? Math.round((Number(r.wins_24h) / total24h) * 100) : 0,
      totalSignals: Number(r.total_signals),
      avgConfidence: Math.round(Number(r.avg_confidence)),
    };
  });
}

export async function getSymbolBreakdown(days: number): Promise<SymbolBreakdownRow[]> {
  const rows = await query<SymbolRow>(
    `SELECT
       symbol,
       COUNT(*)::text AS total_signals,
       COUNT(*) FILTER (WHERE result_4h = 'win')::text AS wins_4h,
       COUNT(*) FILTER (WHERE result_4h = 'loss')::text AS losses_4h,
       COUNT(*) FILTER (WHERE result_24h = 'win')::text AS wins_24h,
       COUNT(*) FILTER (WHERE result_24h = 'loss')::text AS losses_24h,
       COALESCE(AVG(confidence), 0)::text AS avg_confidence
     FROM signal_history
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY symbol
     ORDER BY COUNT(*) DESC`,
    [days],
  );

  return rows.map((r) => {
    const total4h = Number(r.wins_4h) + Number(r.losses_4h);
    const total24h = Number(r.wins_24h) + Number(r.losses_24h);
    return {
      symbol: r.symbol,
      totalSignals: Number(r.total_signals),
      wins4h: Number(r.wins_4h),
      losses4h: Number(r.losses_4h),
      winRate4h: total4h > 0 ? Math.round((Number(r.wins_4h) / total4h) * 100) : 0,
      wins24h: Number(r.wins_24h),
      losses24h: Number(r.losses_24h),
      winRate24h: total24h > 0 ? Math.round((Number(r.wins_24h) / total24h) * 100) : 0,
      avgConfidence: Math.round(Number(r.avg_confidence)),
    };
  });
}

export async function getOperatorMemoryCount(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM operator_memory`,
  );
  return rows.length > 0 ? Number(rows[0].count) : 0;
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Check 7-day symbol breakdown for underperformers
  const breakdown = await getSymbolBreakdown(7);
  for (const row of breakdown) {
    if (row.totalSignals >= 5 && row.winRate4h < 40) {
      recommendations.push({
        type: 'warning',
        message: `Review ${row.symbol} TA thresholds — 7-day 4h win rate is ${row.winRate4h}%`,
        symbol: row.symbol,
      });
    }
  }

  // Check avg confidence across the board
  const trends = await getAccuracyTrends(7);
  if (trends.length > 0) {
    const overallAvgConfidence =
      trends.reduce((sum, t) => sum + t.avgConfidence, 0) / trends.length;
    if (overallAvgConfidence < 60) {
      recommendations.push({
        type: 'info',
        message: `Average confidence is ${Math.round(overallAvgConfidence)}% — consider tightening entry filters`,
      });
    }

    // Check signal volume
    const avgDaily = trends.reduce((sum, t) => sum + t.totalSignals, 0) / trends.length;
    if (avgDaily > 50) {
      recommendations.push({
        type: 'info',
        message: `Signal volume averaging ${Math.round(avgDaily)}/day — review dedup window`,
      });
    }

    // Positive: if overall win rate is good
    const overallWin4h = trends.reduce((sum, t) => sum + t.winRate4h, 0) / trends.length;
    if (overallWin4h >= 60) {
      recommendations.push({
        type: 'success',
        message: `4h win rate averaging ${Math.round(overallWin4h)}% over 7 days`,
      });
    }
  }

  return recommendations;
}

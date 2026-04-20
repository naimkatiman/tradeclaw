import { queryOne } from './db-pool';

export interface SignalPayload {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp1: number | null;
  sl: number | null;
  confidence: number;
  createdAt: string;
}

export interface SamplePair {
  free: SignalPayload;
  pro: SignalPayload;
}

export interface LandingStats {
  cumulativePnlPct: number;
  profitFactor: number | null;
  signalsToday: number;
  closedSignals30d: number;
  latestSignal: SignalPayload | null;
  samples: SamplePair | null;
}

interface AggRow {
  cumulative: string | null;
  gross_wins: string | null;
  gross_losses: string | null;
  closed_count: string;
}

interface LatestRow {
  pair: string;
  direction: 'BUY' | 'SELL';
  entry_price: string | number;
  tp1: string | number | null;
  sl: string | number | null;
  confidence: string | number;
  created_at: string;
}

interface TodayCountRow {
  c: string;
}

export async function getLandingStats(): Promise<LandingStats> {
  const aggRes = await queryOne<AggRow>(
    `WITH closed AS (
       SELECT (outcome_24h->>'pnlPct')::numeric AS pnl_pct,
              (outcome_24h->>'hit')::boolean   AS hit
         FROM signal_history
        WHERE outcome_24h IS NOT NULL
          AND created_at >= NOW() - INTERVAL '30 days'
          AND is_simulated = FALSE
          AND NOT ((outcome_24h->>'pnlPct')::numeric = 0
                   AND (outcome_24h->>'hit')::boolean = FALSE)
     )
     SELECT
       COALESCE(SUM(pnl_pct), 0)::text                                 AS cumulative,
       COALESCE(SUM(CASE WHEN pnl_pct > 0 THEN pnl_pct END), 0)::text  AS gross_wins,
       COALESCE(ABS(SUM(CASE WHEN pnl_pct < 0 THEN pnl_pct END)), 0)::text
                                                                       AS gross_losses,
       COUNT(*)::text                                                  AS closed_count
       FROM closed`
  );

  const cumulativePnlPct = Number(aggRes?.cumulative ?? 0);
  const grossLosses = Number(aggRes?.gross_losses ?? 0);
  const grossWins = Number(aggRes?.gross_wins ?? 0);
  const closedCount = Number(aggRes?.closed_count ?? 0);
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : null;

  const todayRes = await queryOne<TodayCountRow>(
    `SELECT COUNT(*)::text AS c
       FROM signal_history
      WHERE created_at >= date_trunc('day', NOW())
        AND is_simulated = FALSE`
  );
  const signalsToday = Number(todayRes?.c ?? 0);

  const latestRes = await queryOne<LatestRow>(
    `SELECT pair, direction, entry_price, tp1, sl, confidence, created_at
       FROM signal_history
      WHERE is_simulated = FALSE
      ORDER BY created_at DESC
      LIMIT 1`
  );

  const latestSignal: SignalPayload | null = latestRes
    ? {
        symbol: latestRes.pair,
        direction: latestRes.direction,
        entry: Number(latestRes.entry_price),
        tp1: latestRes.tp1 != null ? Number(latestRes.tp1) : null,
        sl: latestRes.sl != null ? Number(latestRes.sl) : null,
        confidence: Number(latestRes.confidence),
        createdAt: new Date(latestRes.created_at).toISOString(),
      }
    : null;

  const samples: SamplePair | null = latestSignal
    ? {
        pro: latestSignal,
        free: {
          symbol: latestSignal.symbol,
          direction: latestSignal.direction,
          entry: latestSignal.entry,
          tp1: latestSignal.tp1,
          sl: null,
          confidence: latestSignal.confidence,
          createdAt: new Date(
            new Date(latestSignal.createdAt).getTime() + 15 * 60 * 1000
          ).toISOString(),
        },
      }
    : null;

  return {
    cumulativePnlPct,
    profitFactor,
    signalsToday,
    closedSignals30d: closedCount,
    latestSignal,
    samples,
  };
}

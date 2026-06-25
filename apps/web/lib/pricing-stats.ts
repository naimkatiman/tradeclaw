import { queryOne } from './db-pool';

export interface RawPricingAgg {
  closed_count: string;
  wins: string;
  cumulative_pnl: string;
  avg_win_pnl?: string | null;
  avg_loss_pnl?: string | null;
}

export interface PricingStats {
  closedSignalsAllTime: number;
  winRatePct: number | null;
  cumulativePnlPct: number;
  /** Average winning PnL divided by average losing PnL magnitude. */
  payoffRatio: number | null;
  /** Win rate needed to break even at the observed payoff ratio. */
  breakEvenWinRatePct: number | null;
}

function safeNumber(input: string | null | undefined): number {
  if (input == null) return 0;
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

export function computePricingStats(agg: RawPricingAgg | null): PricingStats {
  if (!agg) {
    return {
      closedSignalsAllTime: 0,
      winRatePct: null,
      cumulativePnlPct: 0,
      payoffRatio: null,
      breakEvenWinRatePct: null,
    };
  }
  const closed = safeNumber(agg.closed_count);
  const wins = safeNumber(agg.wins);
  const cumulative = safeNumber(agg.cumulative_pnl);
  const avgWin = safeNumber(agg.avg_win_pnl);
  const avgLoss = Math.abs(safeNumber(agg.avg_loss_pnl));
  const winRatePct = closed > 0 ? Math.round((wins / closed) * 1000) / 10 : null;
  const payoffRatio = avgWin > 0 && avgLoss > 0 ? Math.round((avgWin / avgLoss) * 10) / 10 : null;
  const breakEvenWinRatePct =
    payoffRatio != null ? Math.round((100 / (1 + payoffRatio)) * 10) / 10 : null;
  return {
    closedSignalsAllTime: closed,
    winRatePct,
    cumulativePnlPct: cumulative,
    payoffRatio,
    breakEvenWinRatePct,
  };
}

export async function getPricingStats(): Promise<PricingStats> {
  try {
    // Same denominator as isCountedResolved (lib/signal-history.ts) so the
    // pricing bar matches /api/signals/history and /api/signals/equity.
    const row = await queryOne<RawPricingAgg>(
      `WITH closed AS (
         SELECT (outcome_24h->>'pnlPct')::numeric AS pnl_pct,
                (outcome_24h->>'hit')::boolean   AS hit
           FROM signal_history
          WHERE outcome_24h IS NOT NULL
            AND is_simulated = FALSE
            AND COALESCE(gate_blocked, FALSE) = FALSE
            -- Auto-expired (no TP/SL hit) rows are transparency-only, not
            -- resolved trades — same contract as landing-stats and the
            -- history/equity APIs.
            AND outcome_24h->>'target' IS DISTINCT FROM 'expired'
            AND NOT ((outcome_24h->>'pnlPct')::numeric = 0
                     AND (outcome_24h->>'hit')::boolean = FALSE)
       )
       SELECT
         COUNT(*)::text                                              AS closed_count,
         COALESCE(SUM(CASE WHEN hit THEN 1 ELSE 0 END), 0)::text     AS wins,
         COALESCE(SUM(pnl_pct), 0)::text                             AS cumulative_pnl,
         AVG(CASE WHEN hit THEN pnl_pct END)::text                   AS avg_win_pnl,
         AVG(CASE WHEN NOT hit THEN pnl_pct END)::text               AS avg_loss_pnl
         FROM closed`
    );
    return computePricingStats(row ?? null);
  } catch {
    return computePricingStats(null);
  }
}

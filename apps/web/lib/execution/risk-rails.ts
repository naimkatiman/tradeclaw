/**
 * Loss-driven kill switches.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md §risk-rails
 *
 * Two gates:
 *   - daily   — realized PnL over the last 24h vs current wallet equity.
 *               Threshold: EXEC_DAILY_LOSS_PCT (default 5).
 *   - weekly  — realized PnL over the last 7d.
 *               Threshold: EXEC_WEEKLY_LOSS_PCT (default 12).
 *
 * Realized PnL is sourced from Binance's /fapi/v1/income endpoint
 * (incomeType=REALIZED_PNL), not from `executions.realized_pnl`. Our local
 * PnL backfill is intentionally deferred (plan §1.x) and would lag; the
 * exchange ledger is authoritative.
 *
 * Comparing loss against CURRENT wallet equity (not "starting equity") is a
 * pragmatic Phase 1.0 choice: wallet shrinks as losses realize, so
 * loss/wallet trips earlier than loss/start_of_day. That's the safe
 * direction. A starting-equity snapshot can come in Phase 1.5 with
 * portfolio_snapshots.
 */

import { getRealizedPnlSince, type BinanceAccount, type IncomeEntry } from './binance-futures';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const DEFAULT_DAILY_PCT = 5;
const DEFAULT_WEEKLY_PCT = 12;

export interface KillSwitchVerdict {
  halted: boolean;
  reason?: string;
  detail?: {
    realizedPnlDaily: number;
    realizedPnlWeekly: number;
    equityUsd: number;
    dailyPct: number;
    weeklyPct: number;
  };
}

const cfgPct = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Sum REALIZED_PNL income entries since `sinceMs`. Binance returns the field
 * as a string; we normalize to number and sum. Empty / missing is 0.
 */
function sumRealizedPnl(entries: IncomeEntry[], sinceMs: number): number {
  let total = 0;
  for (const e of entries) {
    if (e.time < sinceMs) continue;
    const n = Number(e.income);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

/**
 * Evaluate both kill switches against current account state. Returns
 * `halted: true` on the first gate that trips. Both PnL windows query the
 * same /income page (last 7d), so this is one network call.
 */
export async function checkLossKillSwitch(
  account: Pick<BinanceAccount, 'totalWalletBalance'>,
): Promise<KillSwitchVerdict> {
  const dailyPct = cfgPct('EXEC_DAILY_LOSS_PCT', DEFAULT_DAILY_PCT);
  const weeklyPct = cfgPct('EXEC_WEEKLY_LOSS_PCT', DEFAULT_WEEKLY_PCT);
  const equityUsd = account.totalWalletBalance;

  if (equityUsd <= 0) {
    // Drawdown without settled USDT (or a brand-new account with zero
    // wallet) is exactly the situation we want to halt on, not skip.
    // Previous behavior was halted:false, which let new entries through
    // at the worst possible moment.
    return {
      halted: true,
      reason: `zero_equity_kill: totalWalletBalance=${equityUsd}`,
      detail: {
        realizedPnlDaily: 0,
        realizedPnlWeekly: 0,
        equityUsd,
        dailyPct,
        weeklyPct,
      },
    };
  }

  const now = Date.now();
  const weekAgo = now - WEEK_MS;
  const dayAgo = now - DAY_MS;

  const entries = await getRealizedPnlSince(weekAgo);
  const realizedPnlWeekly = sumRealizedPnl(entries, weekAgo);
  const realizedPnlDaily = sumRealizedPnl(entries, dayAgo);

  const detail = {
    realizedPnlDaily,
    realizedPnlWeekly,
    equityUsd,
    dailyPct,
    weeklyPct,
  };

  // Negative PnL is a loss. `lossPct` = positive number when in the red.
  const dailyLossPct = realizedPnlDaily < 0 ? (-realizedPnlDaily / equityUsd) * 100 : 0;
  const weeklyLossPct = realizedPnlWeekly < 0 ? (-realizedPnlWeekly / equityUsd) * 100 : 0;

  if (dailyLossPct >= dailyPct) {
    return {
      halted: true,
      reason: `daily_loss_kill: ${dailyLossPct.toFixed(2)}% >= ${dailyPct}%`,
      detail,
    };
  }

  if (weeklyLossPct >= weeklyPct) {
    return {
      halted: true,
      reason: `weekly_loss_kill: ${weeklyLossPct.toFixed(2)}% >= ${weeklyPct}%`,
      detail,
    };
  }

  return { halted: false, detail };
}

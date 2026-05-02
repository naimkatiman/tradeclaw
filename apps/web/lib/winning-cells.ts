import 'server-only';

/**
 * Winning-cells publish gate.
 *
 * The 30-day backtest on 2026-05-02 across signal_history showed that the
 * full-fire engine produced a 36.1% win rate at +0.05% expectancy
 * (breakeven before spread / negative after). The same window contained six
 * (pair, direction) cells that delivered 53–68% win rates with strongly
 * positive per-trade expectancy. Cutting publish to those cells alone
 * doubled the cumulative 30-day P&L while reducing volume by ~80%.
 *
 * This module is the publish-time gate that encodes that subset. It does
 * NOT alter the engine — every signal still lands in `signal_history` so
 * the public track record stays complete and re-evaluable. Only the
 * downstream fan-out (Telegram, alert webhooks, social posts) is gated.
 *
 * **The set is a hypothesis, not a permanent config.** Re-run the
 * segment-slice SQL after each shadow window and prune / add cells based
 * on what the next 30 days say. See:
 *   docs/plans/2026-05-02-pro-paywall-hardening.md (Phase 2)
 */

export type WinningCellsMode = 'off' | 'shadow' | 'active';

export interface WinningCell {
  pair: string;
  direction: 'BUY' | 'SELL';
  /** 30-day backtest win rate %. Documentation only — not used at runtime. */
  backtestWinRate: number;
  /** 30-day backtest avg P&L per trade %. Documentation only. */
  backtestAvgPnl: number;
}

export const WINNING_CELLS: readonly WinningCell[] = [
  { pair: 'XAUUSD',  direction: 'BUY',  backtestWinRate: 67.9, backtestAvgPnl: 0.42 },
  { pair: 'XAGUSD',  direction: 'BUY',  backtestWinRate: 61.7, backtestAvgPnl: 0.89 },
  { pair: 'USDJPY',  direction: 'SELL', backtestWinRate: 57.4, backtestAvgPnl: 0.17 },
  { pair: 'AUDUSD',  direction: 'BUY',  backtestWinRate: 56.1, backtestAvgPnl: 0.34 },
  { pair: 'BTCUSD',  direction: 'BUY',  backtestWinRate: 53.8, backtestAvgPnl: 0.56 },
  { pair: 'DOGEUSD', direction: 'BUY',  backtestWinRate: 52.9, backtestAvgPnl: 0.73 },
] as const;

const WINNING_CELL_KEYS: ReadonlySet<string> = new Set(
  WINNING_CELLS.map((c) => `${c.pair}:${c.direction}`),
);

export const WINNING_CELLS_GATE_REASON = 'not_in_winning_cells';

/**
 * Resolve the configured gate mode. Defaults to 'shadow' so a fresh deploy
 * logs decisions without altering publish behavior. Set
 * WINNING_CELLS_MODE=active on Railway to start gating, or 'off' to disable.
 */
export function getWinningCellsMode(): WinningCellsMode {
  const raw = (process.env.WINNING_CELLS_MODE ?? 'shadow').toLowerCase();
  if (raw === 'off' || raw === 'active' || raw === 'shadow') return raw;
  return 'shadow';
}

/**
 * Return true if (pair, direction) is in the published winning subset.
 * Pair comparison is case-insensitive on the input but the canonical
 * stored pair is uppercase.
 */
export function isWinningCell(
  pair: string,
  direction: 'BUY' | 'SELL',
): boolean {
  return WINNING_CELL_KEYS.has(`${pair.toUpperCase()}:${direction}`);
}

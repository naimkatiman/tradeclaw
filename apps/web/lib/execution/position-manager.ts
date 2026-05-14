/**
 * Position manager — runs every 60s after the executor.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 *
 * Phase 1.0 responsibilities:
 *   - Detect TP1 fills by comparing Binance position size vs original qty.
 *   - Move SL to breakeven once TP1 fills (idempotent, marker stored on the
 *     executions row).
 *   - Mark closed when position size hits zero on Binance.
 *
 * Phase 1.5:
 *   - Backfill realized_pnl on close via /fapi/v1/userTrades summing
 *     realizedPnl across all fills for the position (entry P&L = 0,
 *     closing-trade P&L = actual settlement). Net = gross - commission.
 */

import { execute, query } from '../db-pool';
import {
  cancelOrder,
  currentMode,
  getAccount,
  getMarkPrice,
  getOpenOrders,
  getOrderByClientId,
  getUserTrades,
  placeOrder,
  type OrderSide,
} from './binance-futures';
import { buildClientIds } from './client-ids';
import { notifyPositionClosed } from './telegram';

const BROKER = 'binance-futures';

interface ManageTickResult {
  mode: ReturnType<typeof currentMode>;
  reviewed: number;
  breakeven: number;
  closed: number;
  errors: number;
}

interface OpenExecution {
  id: string;
  signalId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  status: string;
  slMovedToBreakeven: boolean;
  /** Epoch ms of the entry fill; null when the row was inserted as 'pending'. */
  filledAtMs: number | null;
}

export async function runPositionManagerTick(): Promise<ManageTickResult> {
  const mode = currentMode();
  const result: ManageTickResult = { mode, reviewed: 0, breakeven: 0, closed: 0, errors: 0 };

  if (mode === 'disabled') return result;

  const open = await fetchOpenExecutions();
  result.reviewed = open.length;
  if (open.length === 0) return result;

  let account;
  try {
    account = await getAccount();
  } catch (err) {
    console.error('[pilot/manage] getAccount failed:', getMsg(err));
    result.errors++;
    return result;
  }

  for (const ex of open) {
    try {
      // Phase 1 enforces one-way mode + one position per symbol (see plan §risk
      // rails), so a side-blind lookup is correct here. If hedge mode is ever
      // enabled, filter by `positionSide` matching `ex.side` too.
      const livePos = account.positions.find((p) => p.symbol === ex.symbol);
      const liveQty = livePos ? Math.abs(livePos.positionAmt) : 0;

      if (liveQty === 0) {
        // Snapshot mark price at close-detection. Fail-soft: a flaky
        // markPrice fetch shouldn't block marking the row closed —
        // exit_price stays NULL and the row is still terminal.
        const exitPrice = await getMarkPrice(ex.symbol).catch(() => null);

        // Backfill realized P&L from Binance userTrades. Fail-soft: if the
        // trades endpoint is unavailable, realized_pnl stays NULL and the
        // reconciliation query returns NULLIF(risk_usd, 0) for that row.
        // The COALESCE in markClosed means a re-run can fill it in later.
        const realizedPnl = await fetchRealizedPnl(ex).catch(() => null);

        await markClosed(ex.id, exitPrice, realizedPnl);
        result.closed++;
        void notifyPositionClosed({
          signalId: ex.signalId,
          symbol: ex.symbol,
          side: ex.side,
          qty: ex.qty,
          entryPrice: ex.entryPrice,
        });
        continue;
      }

      // TP1 detection — authoritative on the order itself, not on position size.
      // The size heuristic broke on partial entry fills (e.g. 40% fill made
      // liveQty < ex.qty*0.55, falsely tripping breakeven before TP1 ever ran).
      const ids = buildClientIds(ex.signalId);
      const tp1 = await getOrderByClientId(ex.symbol, ids.tp1);
      const tp1Filled = tp1 !== null && (tp1.status === 'FILLED' || tp1.status === 'PARTIALLY_FILLED');

      if (tp1Filled) {
        const moved = await moveStopToBreakeven(ex);
        if (moved) {
          await markBreakevenMoved(ex.id);
          result.breakeven++;
        }
      }
    } catch (err) {
      result.errors++;
      await logError({ executionId: ex.id, signalId: ex.signalId, stage: 'manage', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/manage] tick: ${JSON.stringify(result)}`);
  return result;
}

// ─── Breakeven move ────────────────────────────────────────────────────

async function moveStopToBreakeven(ex: OpenExecution): Promise<boolean> {
  const ids = buildClientIds(ex.signalId);
  const orders = await getOpenOrders(ex.symbol);
  const oldSl = orders.find((o) => o.clientOrderId === ids.sl);
  if (oldSl) {
    try {
      await cancelOrder(ex.symbol, oldSl.orderId);
    } catch (err) {
      // -2011 unknown order = already gone, treat as success
      const msg = getMsg(err);
      if (!msg.includes('-2011')) throw err;
    }
  }

  // Idempotency: if the breakeven order already exists (this tick was retried),
  // skip the re-place — Binance would return -2026 (duplicate clientOrderId).
  const existingBe = orders.find((o) => o.clientOrderId === ids.slBe);
  if (existingBe) return true;

  const exitSide: OrderSide = ex.side === 'BUY' ? 'SELL' : 'BUY';
  const placed = await placeOrder({
    symbol: ex.symbol,
    side: exitSide,
    type: 'STOP_MARKET',
    stopPrice: ex.entryPrice,
    closePosition: true,
    clientOrderId: ids.slBe,
    workingType: 'MARK_PRICE',
  });
  return placed !== null;
}

// ─── PnL backfill ──────────────────────────────────────────────────────

/**
 * Compute net realized PnL for this position by summing Binance userTrades
 * since the entry fill. Closing trades have non-zero `realizedPnl`; entry
 * trades have zero. Net = sum(realizedPnl) - sum(commission).
 *
 * Commission is reported in `commissionAsset` (USDT for most perps, BNB for
 * discounted accounts). BNB amounts are treated as USDT for simplicity —
 * they're a small fraction of the trade value (<0.02%) and won't affect
 * R-multiple calculations materially.
 *
 * Returns null when no closing trades are found yet (possible on the same
 * tick as close-detection due to Binance processing lag — COALESCE in
 * markClosed preserves any previously written value).
 */
async function fetchRealizedPnl(ex: OpenExecution): Promise<number | null> {
  // Fall back to 24h ago when filledAt is missing (pre-Phase1.5 rows inserted
  // before filled_at was reliably set). This is a conservative window that
  // may include trades from a prior position on the same symbol if the symbol
  // was re-entered within 24h, but single-tenant Phase 1 makes that unlikely.
  const startTime = ex.filledAtMs ?? Date.now() - 24 * 60 * 60 * 1000;

  const trades = await getUserTrades(ex.symbol, { startTime, limit: 100 });
  if (trades.length === 0) return null;

  // Opening trades always have realizedPnl === '0'. Closing trades (FILLED by
  // SL, SL-BE, TP1, or runner) have non-zero realizedPnl representing the
  // mark-to-entry price delta × qty in quote currency (USDT).
  const hasClosingTrades = trades.some((t) => Number(t.realizedPnl) !== 0);
  if (!hasClosingTrades) return null;

  const grossPnl = trades.reduce((sum, t) => sum + Number(t.realizedPnl), 0);
  const totalCommission = trades.reduce((sum, t) => sum + Number(t.commission), 0);
  return grossPnl - totalCommission;
}

// ─── DB helpers ────────────────────────────────────────────────────────

async function fetchOpenExecutions(): Promise<OpenExecution[]> {
  try {
    const rows = await query<{
      id: string;
      signal_id: string;
      symbol: string;
      side: OrderSide;
      qty: string;
      entry_price: string;
      stop_price: string;
      tp1_price: string;
      status: string;
      filled_at: Date | null;
    }>(
      `SELECT id, signal_id, symbol, side, qty, entry_price, stop_price, tp1_price, status, filled_at
         FROM executions
        WHERE broker = $1 AND status IN ('filled','partially_filled','pending')
        ORDER BY created_at ASC`,
      [BROKER],
    );
    return rows.map((r) => ({
      id: r.id,
      signalId: r.signal_id,
      symbol: r.symbol,
      side: r.side,
      qty: Number(r.qty),
      entryPrice: Number(r.entry_price),
      stopPrice: Number(r.stop_price),
      tp1Price: Number(r.tp1_price),
      status: r.status,
      // Phase 1.0: re-derive from Binance state each tick instead of persisting a flag.
      slMovedToBreakeven: false,
      filledAtMs: r.filled_at ? r.filled_at.getTime() : null,
    }));
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return [];
    throw err;
  }
}

async function markClosed(executionId: string, exitPrice: number | null, realizedPnl: number | null): Promise<void> {
  try {
    // COALESCE preserves values written by a prior tick that got a later re-run
    // with null (e.g. a flaky markPrice / userTrades call after the initial
    // successful write). Status guard ensures the row is only transitioned once.
    await execute(
      `UPDATE executions
          SET status='closed',
              closed_at=NOW(),
              updated_at=NOW(),
              exit_price=COALESCE($2, exit_price),
              realized_pnl=COALESCE($3, realized_pnl)
        WHERE id=$1 AND status <> 'closed'`,
      [executionId, exitPrice, realizedPnl],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    // 42P01 = table missing (pre-018), 42703 = column missing (pre-031).
    // Either means schema not caught up to code — swallow so the rest of
    // the tick proceeds.
    if (code === '42P01' || code === '42703') return;
    throw err;
  }
}

async function markBreakevenMoved(executionId: string): Promise<void> {
  try {
    await execute(`UPDATE executions SET updated_at=NOW() WHERE id=$1`, [executionId]);
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') throw err;
  }
}

async function logError(a: { signalId?: string; executionId?: string; stage: string; errorMsg: string }): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors (signal_id, execution_id, broker, stage, error_msg)
       VALUES ($1, $2, $3, $4, $5)`,
      [a.signalId ?? null, a.executionId ?? null, BROKER, a.stage, a.errorMsg.slice(0, 2000)],
    );
  } catch {
    // table may not exist yet
  }
}

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

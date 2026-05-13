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
 * Phase 1.5 (deferred):
 *   - Chandelier trail (max(highestHigh − 3×ATR, breakeven)).
 *   - PnL backfill on close.
 */

import { execute, query } from '../db-pool';
import {
  cancelOrder,
  currentMode,
  getAccount,
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
  filledAt: Date | null;
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
        const pnl = await computeRealizedPnl(ex);
        await markClosed(ex.id, pnl);
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
      filledAt: r.filled_at,
      // Phase 1.0: re-derive from Binance state each tick instead of persisting a flag.
      // We detect "needs breakeven move" by scanning open orders for the entry SL clientId.
      slMovedToBreakeven: false,
    }));
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return [];
    throw err;
  }
}

interface ClosePnl {
  realizedPnl: number | null;
  exitPrice: number | null;
}

/**
 * Fetch fills for the symbol since entry and compute the net realized PnL.
 *
 * Strategy: sum Binance's per-fill `realizedPnl` for all closing fills
 * (non-zero realizedPnl = position-reducing fill: TP1 partial, TP2/SL full)
 * and subtract total commission across all fills for the position.
 *
 * We use `filledAt` as the startTime cursor so we only pull fills for this
 * position, not prior positions on the same symbol. Falls back to 24h if
 * filledAt is null (shouldn't happen for a properly-tracked entry).
 */
async function computeRealizedPnl(ex: OpenExecution): Promise<ClosePnl> {
  try {
    const startMs = ex.filledAt
      ? ex.filledAt.getTime()
      : Date.now() - 86_400_000;

    const trades = await getUserTrades(ex.symbol, startMs);
    if (trades.length === 0) return { realizedPnl: null, exitPrice: null };

    // Closing fills have non-zero realizedPnl (Binance computes per fill).
    const closingFills = trades.filter((t) => Number(t.realizedPnl) !== 0);

    const grossPnl = closingFills.reduce((sum, t) => sum + Number(t.realizedPnl), 0);
    // Commission applies to every fill (entry + exit). Sum all to get net cost.
    const totalCommission = trades.reduce((sum, t) => sum + Number(t.commission), 0);
    const realizedPnl = grossPnl - totalCommission;

    // Weighted average exit price across all closing fills.
    const totalClosingQty = closingFills.reduce((sum, t) => sum + Number(t.qty), 0);
    const exitPrice = totalClosingQty > 0
      ? closingFills.reduce((sum, t) => sum + Number(t.price) * Number(t.qty), 0) / totalClosingQty
      : null;

    return { realizedPnl, exitPrice };
  } catch (err) {
    console.error('[pilot/manage] computeRealizedPnl failed:', getMsg(err));
    return { realizedPnl: null, exitPrice: null };
  }
}

async function markClosed(executionId: string, pnl: ClosePnl): Promise<void> {
  try {
    await execute(
      `UPDATE executions
          SET status='closed', closed_at=NOW(), updated_at=NOW(),
              realized_pnl = COALESCE($2, realized_pnl),
              exit_price   = COALESCE($3, exit_price)
        WHERE id=$1 AND status <> 'closed'`,
      [executionId, pnl.realizedPnl ?? null, pnl.exitPrice ?? null],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') throw err;
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

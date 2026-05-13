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
  type UserTrade,
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
  /** Epoch ms; null when entry order is still pending fill. */
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
        const pnl = await fetchClosePnl(ex).catch((err) => {
          console.warn(`[pilot/manage] PnL fetch failed for ${ex.id}: ${getMsg(err)} — closing without PnL`);
          return null;
        });
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

interface ClosePnl {
  realizedPnl: number;
  exitPrice: number;
}

/**
 * Fetch closing trades from Binance and compute net realized PnL + weighted
 * avg exit price. Looks at trades on the closing side (opposite to entry)
 * since `filledAtMs`. Commissions in non-USDT assets (e.g. BNB) are logged
 * but not deducted — USDT-margined futures almost always charge in USDT.
 */
async function fetchClosePnl(ex: OpenExecution): Promise<ClosePnl | null> {
  // Start time: 60 s before fill to catch any timestamp skew; fallback to
  // 24 h before now when filled_at is missing (pending entry).
  const startMs = ex.filledAtMs
    ? ex.filledAtMs - 60_000
    : Date.now() - 24 * 60 * 60 * 1000;

  const trades = await getUserTrades(ex.symbol, startMs, 200);
  if (trades.length === 0) return null;

  // Closing trades are on the opposite side from entry.
  const closeSide: OrderSide = ex.side === 'BUY' ? 'SELL' : 'BUY';
  const closing = trades.filter(
    (t) => t.side === closeSide && Number(t.realizedPnl) !== 0,
  );
  if (closing.length === 0) return null;

  let totalPnl = 0;
  let totalQty = 0;
  let totalNotional = 0;

  for (const t of closing) {
    const qty = Number(t.qty);
    const price = Number(t.price);
    const pnl = Number(t.realizedPnl);
    const comm = Number(t.commission);

    // Deduct commission only when denominated in USDT — avoids needing BNB
    // spot price for BNB-discounted commissions.
    const commUsdt = t.commissionAsset === 'USDT' ? comm : 0;
    if (t.commissionAsset !== 'USDT' && comm > 0) {
      console.warn(`[pilot/manage] non-USDT commission (${t.commissionAsset}) on ${ex.symbol} — not deducted from PnL`);
    }

    totalPnl += pnl - commUsdt;
    totalQty += qty;
    totalNotional += qty * price;
  }

  const exitPrice = totalQty > 0 ? totalNotional / totalQty : 0;
  return { realizedPnl: totalPnl, exitPrice };
}

async function markClosed(executionId: string, pnl: ClosePnl | null): Promise<void> {
  try {
    await execute(
      `UPDATE executions
          SET status='closed', closed_at=NOW(), updated_at=NOW(),
              realized_pnl = COALESCE($2, realized_pnl),
              exit_price   = COALESCE($3, exit_price)
        WHERE id=$1 AND status <> 'closed'`,
      [executionId, pnl?.realizedPnl ?? null, pnl?.exitPrice ?? null],
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

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
 *
 * PnL backfill (Phase 1, Option A):
 *   - On close, fetch userTrades for the symbol since filledAt to recover
 *     the actual exit prices and realized PnL.
 *   - Formula: (exitPrice − entryPrice) × closedQty × sideSign − commission.
 *   - Fails gracefully: if the trade fetch errors, the row is still marked
 *     closed with NULL realized_pnl (cron can retry later).
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
  /** Timestamp of initial fill; null for rows that never received a fill_at update. */
  filledAt: Date | null;
  slMovedToBreakeven: boolean;
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
        await markClosedWithPnl(ex);
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

// ─── Breakeven move ────────────────────────────────────────────────

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

// ─── PnL backfill ─────────────────────────────────────────────────

/**
 * Mark closed and attempt to backfill exit_price + realized_pnl in one shot.
 *
 * PnL formula (matches plan §1 Option A):
 *   grossPnl = (exitPrice − entryPrice) × closedQty × sideSign
 *   commission = Σ |trade.commission| where commissionAsset = 'USDT'
 *   realized_pnl = grossPnl − commission
 *
 * Falls back to a status-only update if trade fetch fails or if the
 * migration 019 column is not yet present (code = 42703 / column_unknown).
 */
async function markClosedWithPnl(ex: OpenExecution): Promise<void> {
  let exitPrice: number | null = null;
  let realizedPnl: number | null = null;

  // 5-minute clock-skew buffer so testnet clock drift doesn't miss the
  // entry trade that created the position.
  const startTime = ex.filledAt
    ? ex.filledAt.getTime() - 5 * 60 * 1000
    : Date.now() - 24 * 60 * 60 * 1000; // fallback: last 24h

  try {
    const trades = await getUserTrades(ex.symbol, { startTime, limit: 100 });
    const exitSide: string = ex.side === 'BUY' ? 'SELL' : 'BUY';

    // Closing trades are the ones on the exit side. Entry trades contribute
    // commission but zero realizedPnl; we subtract all USDT commissions so
    // the net figure is fully loaded.
    const closingTrades = trades.filter((t) => t.side === exitSide);
    const totalUsdtCommission = trades.reduce((sum, t) => {
      return t.commissionAsset === 'USDT' ? sum + Math.abs(Number(t.commission)) : sum;
    }, 0);

    if (closingTrades.length > 0) {
      const closedQty = closingTrades.reduce((sum, t) => sum + Number(t.qty), 0);
      const wavgPrice = closingTrades.reduce((sum, t) => sum + Number(t.price) * Number(t.qty), 0) / closedQty;
      exitPrice = wavgPrice;

      const sideSign = ex.side === 'BUY' ? 1 : -1;
      const grossPnl = (wavgPrice - ex.entryPrice) * closedQty * sideSign;
      realizedPnl = grossPnl - totalUsdtCommission;
    }
  } catch (err) {
    console.warn(`[pilot/manage] PnL backfill skipped for ${ex.id}: ${getMsg(err)}`);
  }

  try {
    await execute(
      `UPDATE executions
          SET status='closed',
              closed_at=NOW(),
              updated_at=NOW(),
              exit_price=COALESCE($2, exit_price),
              realized_pnl=COALESCE($3, realized_pnl)
        WHERE id=$1 AND status <> 'closed'`,
      [ex.id, exitPrice, realizedPnl],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    // 42703 = column does not exist (migration 019 not applied yet)
    if (code === '42703') {
      await markClosed(ex.id);
      return;
    }
    if (code !== '42P01') throw err;
  }
}

// ─── DB helpers ───────────────────────────────────────────────────

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
      `SELECT id, signal_id, symbol, side, qty, entry_price, stop_price, tp1_price,
              status, filled_at
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

async function markClosed(executionId: string): Promise<void> {
  try {
    await execute(
      `UPDATE executions SET status='closed', closed_at=NOW(), updated_at=NOW()
        WHERE id=$1 AND status <> 'closed'`,
      [executionId],
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

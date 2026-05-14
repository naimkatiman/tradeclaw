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
  getIncomeSince,
  getMarkPrice,
  getOpenOrders,
  getOrderByClientId,
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
        // Snapshot mark price at close-detection. Fail-soft: a flaky
        // markPrice fetch shouldn't block marking the row closed —
        // exit_price stays NULL and the row is still terminal.
        const exitPrice = await getMarkPrice(ex.symbol).catch(() => null);
        const realizedPnl = await backfillRealizedPnl(ex);
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
 * Fetch REALIZED_PNL and COMMISSION income entries for `ex.symbol` since
 * `ex.filledAt` and return the net sum. Returns null on any error or when
 * `filledAt` is missing — the caller stores null and the row stays
 * reconcilable via a manual income query later.
 *
 * Binance REALIZED_PNL income = gross PnL; COMMISSION income is negative.
 * Summing both gives the net USD result for this position.
 */
async function backfillRealizedPnl(ex: OpenExecution): Promise<number | null> {
  if (!ex.filledAt) return null;
  const startMs = ex.filledAt.getTime();
  try {
    const [pnlEntries, commEntries] = await Promise.all([
      getIncomeSince('REALIZED_PNL', startMs, ex.symbol),
      getIncomeSince('COMMISSION', startMs, ex.symbol),
    ]);
    if (pnlEntries.length === 0 && commEntries.length === 0) return null;
    const gross = pnlEntries.reduce((s, e) => s + Number(e.income), 0);
    const commission = commEntries.reduce((s, e) => s + Number(e.income), 0);
    return gross + commission;
  } catch (err) {
    console.warn(`[pilot/manage] backfillRealizedPnl failed for ${ex.symbol}:`, getMsg(err));
    return null;
  }
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

async function markClosed(executionId: string, exitPrice: number | null, realizedPnl: number | null): Promise<void> {
  try {
    // COALESCE so a retry that gets NULL from a flaky fetch doesn't clobber
    // a value already captured. Status guard means the row is only updated once.
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

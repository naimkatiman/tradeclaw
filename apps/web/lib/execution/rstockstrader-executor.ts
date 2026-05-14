/**
 * TradeClaw Pilot — R StocksTrader (RoboForex) entry executor.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md
 *
 * Pulls recent unexecuted hmm-top3 signals, maps TradeClaw canonical pairs
 * to R StocksTrader symbols, sizes positions using ATR + contractSize from
 * the instrument spec, and places bracket orders (market entry + attached
 * SL + TP) via the REST bridge.
 *
 * Activated when:
 *   EXECUTION_BROKER=r-stockstrader  (set in Railway env)
 *   EXECUTION_MODE=testnet           (or live — never flip until Phase 2 §10 passes)
 *   RSTOCKSTRADER_BASE_URL, RSTOCKSTRADER_TOKEN, RSTOCKSTRADER_ACCOUNT_ID set
 *
 * Idempotency: clientRef = signal_id derived key. The bridge maps it to
 * whatever reference field R StocksTrader exposes. SQL already excludes
 * signals with an existing executions row.
 *
 * Keep this file's structure parallel to executor.ts (Binance). Do NOT try
 * to share an abstraction layer — the two brokers have asymmetric order
 * semantics and merging them prematurely leaks asymmetries.
 */

import type { PoolClient } from 'pg';
import { execute, query, withClient } from '../db-pool';
import { currentMode, isTestnet, type OrderSide } from './binance-futures';
import { buildClientIds } from './client-ids';
import { createRStocksTraderBridge, readRStocksTraderEnvOrNull, type RStocksTraderInstrumentSpec } from './rstockstrader-bridge';
import { toRStocksTraderSymbol, type RStocksTraderAssetClass } from './rstockstrader-symbols';

const STRATEGY_ID = 'hmm-top3';
const SIGNAL_LOOKBACK_MINUTES = 5;
const ADVISORY_LOCK_KEY = 'tradeclaw:executor:rst:hmm-top3';
const BROKER = 'r-stockstrader';
const ATR_MULTIPLIER = 1.5;
const TP_R_MULTIPLE = 1.5;

const cfgNum = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export interface RSTExecutorTickResult {
  mode: ReturnType<typeof currentMode>;
  processed: number;
  executed: number;
  rejected: number;
  filtered: number;
  errors: number;
  halted?: string;
  skipped?: 'locked' | 'env_missing';
}

interface PendingSignal {
  id: string;
  pair: string;
  timeframe: string;
  direction: OrderSide;
  entryPrice: number;
  entryAtr: number | null;
  createdAt: Date;
}

export async function runRStocksTraderTick(): Promise<RSTExecutorTickResult> {
  const mode = currentMode();
  const result: RSTExecutorTickResult = {
    mode, processed: 0, executed: 0, rejected: 0, filtered: 0, errors: 0,
  };

  if (mode === 'disabled') {
    console.log('[pilot/rst-executor] EXECUTION_MODE=disabled — tick skipped');
    return result;
  }

  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    console.warn('[pilot/rst-executor] R StocksTrader env vars not set — tick skipped');
    return { ...result, skipped: 'env_missing' };
  }

  return withClient(async (lockClient) => {
    const acquired = await tryAcquireLock(lockClient);
    if (!acquired) return { ...result, skipped: 'locked' };
    try {
      return await runTickLocked(mode, result, env);
    } finally {
      await releaseLock(lockClient);
    }
  });
}

async function runTickLocked(
  mode: ReturnType<typeof currentMode>,
  result: RSTExecutorTickResult,
  env: NonNullable<ReturnType<typeof readRStocksTraderEnvOrNull>>,
): Promise<RSTExecutorTickResult> {
  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  const bridge = createRStocksTraderBridge(env);
  let account;
  try {
    account = await bridge.getAccountInfo();
  } catch (err) {
    await logError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  const maxPositions = cfgNum('EXEC_MAX_POSITIONS', 4);
  let openCount = await getOpenExecutionCount();
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      const rstEntry = toRStocksTraderSymbol(sig.pair);
      if (!rstEntry) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_not_rstockstrader_eligible',
          errorMsg: `${sig.pair} has no R StocksTrader symbol mapping`,
        });
        continue;
      }

      const { symbol: rstSymbol, assetClass } = rstEntry;

      if (inTickSymbols.has(rstSymbol)) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_already_entered_in_tick',
          errorMsg: `${sig.pair} (${rstSymbol}) already entered earlier in this tick`,
        });
        continue;
      }

      if (openCount >= maxPositions) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'max_positions_reached',
          errorMsg: `openCount=${openCount} >= maxPositions=${maxPositions}`,
        });
        continue;
      }

      // Get instrument spec (cached 1h in bridge)
      let spec: RStocksTraderInstrumentSpec;
      try {
        spec = await bridge.getInstrumentSpec(rstSymbol);
      } catch (err) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'spec_fetch_failed', errorMsg: getMsg(err) });
        continue;
      }

      // Sizing
      const atr = sig.entryAtr;
      if (!atr || atr <= 0) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `signal=${sig.id} pair=${sig.pair}` });
        continue;
      }

      const sizing = computeRSTSize({
        side: sig.direction,
        entryPrice: sig.entryPrice,
        atr,
        equity: account.equity,
        spec,
        assetClass,
      });

      if (!sizing.ok) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: sizing.reason, errorMsg: sizing.detail });
        continue;
      }

      // Place bracket order
      const ids = buildClientIds(sig.id);
      const placeResult = await bridge.placeOrder({
        symbol: rstSymbol,
        side: sig.direction,
        type: 'MARKET',
        qty: sizing.qty,
        stopLoss: sizing.stopPrice,
        takeProfit: sizing.tp1Price,
        clientRef: ids.entry,
        comment: `tc:${sig.id.slice(0, 12)}`,
      });

      if (placeResult.status === 'rejected') {
        result.rejected++;
        await logError({
          signalId: sig.id,
          stage: 'place_entry',
          errorCode: 'broker_rejected',
          errorMsg: placeResult.rejectReason ?? 'broker rejected order',
        });
        continue;
      }

      await persistExecution({
        signalId: sig.id,
        symbol: rstSymbol,
        side: sig.direction,
        qty: sizing.qty,
        entryPrice: placeResult.avgFillPrice ?? sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        leverage: 1, // R StocksTrader margin leverage is broker-managed, not set per-order
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        clientOrderId: ids.entry,
        exchangeOrderId: placeResult.brokerOrderId,
        status: mapStatus(placeResult.status),
        mode: isTestnet() ? 'testnet' : 'live',
      });

      result.executed++;
      openCount++;
      inTickSymbols.add(rstSymbol);

      console.log(`[pilot/rst-executor] placed ${sig.direction} ${rstSymbol} qty=${sizing.qty} ref=${ids.entry} status=${placeResult.status}`);
    } catch (err) {
      result.errors++;
      await logError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/rst-executor] tick: ${JSON.stringify(result)}`);
  return result;
}

// ─── R StocksTrader sizing ─────────────────────────────────────────────────

interface RSTSizingInput {
  side: OrderSide;
  entryPrice: number;
  atr: number;
  equity: number;
  spec: RStocksTraderInstrumentSpec;
  assetClass: RStocksTraderAssetClass;
}

type RSTSizingResult =
  | { ok: true; qty: number; stopPrice: number; tp1Price: number; riskUsd: number; notionalUsd: number }
  | { ok: false; reason: string; detail: string };

function computeRSTSize(input: RSTSizingInput): RSTSizingResult {
  if (input.atr <= 0 || input.entryPrice <= 0 || input.equity <= 0) {
    return { ok: false, reason: 'invalid_input', detail: `atr=${input.atr} entry=${input.entryPrice} equity=${input.equity}` };
  }

  const riskPct = cfgNum('EXEC_RISK_PCT', 1);
  const stopDistance = input.atr * ATR_MULTIPLIER;

  // Enforce minimum stop distance from instrument spec
  if (input.spec.minStopDistance > 0 && stopDistance < input.spec.minStopDistance) {
    return {
      ok: false,
      reason: 'stop_too_tight',
      detail: `stopDistance=${stopDistance} < minStopDistance=${input.spec.minStopDistance}`,
    };
  }

  const riskUsd = input.equity * (riskPct / 100);

  // qty (in API units) = riskUsd / (stopDistance * contractSize)
  // contractSize converts API units → "per-unit USD risk" factor.
  const rawQty = riskUsd / (stopDistance * input.spec.contractSize);

  // Per-asset-class notional cap
  const notionalCapPct = getNotionalCapPct(input.assetClass);
  const notionalCap = input.equity * (notionalCapPct / 100);
  const rawNotional = rawQty * input.entryPrice * input.spec.contractSize;
  const cappedQty = rawNotional > notionalCap
    ? notionalCap / (input.entryPrice * input.spec.contractSize)
    : rawQty;

  // Round qty DOWN to qtyStep, enforce minQty
  const stepDecimalPlaces = countDecimalPlaces(input.spec.qtyStep);
  const stepped = Math.floor(cappedQty / input.spec.qtyStep) * input.spec.qtyStep;
  const qty = Number(stepped.toFixed(stepDecimalPlaces));

  if (qty <= 0 || qty < input.spec.minQty) {
    return {
      ok: false,
      reason: 'qty_below_minimum',
      detail: `qty=${qty} minQty=${input.spec.minQty} (riskUsd=${riskUsd.toFixed(2)})`,
    };
  }

  const stopPrice = input.side === 'BUY'
    ? input.entryPrice - stopDistance
    : input.entryPrice + stopDistance;
  const tp1Price = input.side === 'BUY'
    ? input.entryPrice + stopDistance * TP_R_MULTIPLE
    : input.entryPrice - stopDistance * TP_R_MULTIPLE;

  const priceDecimalPlaces = input.spec.digits;
  const roundedStop = Number(stopPrice.toFixed(priceDecimalPlaces));
  const roundedTp = Number(tp1Price.toFixed(priceDecimalPlaces));

  return {
    ok: true,
    qty,
    stopPrice: roundedStop,
    tp1Price: roundedTp,
    riskUsd: qty * Math.abs(input.entryPrice - roundedStop) * input.spec.contractSize,
    notionalUsd: qty * input.entryPrice * input.spec.contractSize,
  };
}

function getNotionalCapPct(assetClass: RStocksTraderAssetClass): number {
  switch (assetClass) {
    case 'crypto-cfd':    return cfgNum('EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT', 50);
    case 'fx':
    case 'metal':
    case 'energy-cfd':   return cfgNum('EXEC_FX_PER_TRADE_NOTIONAL_PCT', 100);
    case 'us-stock':
    case 'us-etf':
    case 'index-cfd':    return cfgNum('EXEC_STOCK_PER_TRADE_NOTIONAL_PCT', 100);
  }
}

// ─── Advisory lock ─────────────────────────────────────────────────────────

async function tryAcquireLock(client: PoolClient): Promise<boolean> {
  try {
    const r = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS acquired`,
      [ADVISORY_LOCK_KEY],
    );
    return r.rows[0]?.acquired === true;
  } catch (err) {
    console.error('[pilot/rst-executor] advisory lock acquire failed:', getMsg(err));
    return false;
  }
}

async function releaseLock(client: PoolClient): Promise<void> {
  try {
    await client.query(`SELECT pg_advisory_unlock(hashtext($1)::bigint)`, [ADVISORY_LOCK_KEY]);
  } catch (err) {
    console.error('[pilot/rst-executor] advisory lock release failed:', getMsg(err));
  }
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function fetchPendingSignals(): Promise<PendingSignal[]> {
  try {
    const rows = await query<{
      id: string;
      pair: string;
      timeframe: string;
      direction: 'BUY' | 'SELL';
      entry_price: string;
      entry_atr: string | null;
      created_at: Date;
    }>(
      `SELECT sh.id, sh.pair, sh.timeframe, sh.direction,
              sh.entry_price, sh.entry_atr, sh.created_at
         FROM signal_history sh
         LEFT JOIN executions e
           ON e.signal_id = sh.id AND e.broker = $3
        WHERE sh.strategy_id = $1
          AND sh.created_at > NOW() - ($2 || ' minutes')::INTERVAL
          AND (sh.gate_blocked IS NULL OR sh.gate_blocked = FALSE)
          AND e.id IS NULL
        ORDER BY sh.created_at ASC
        LIMIT 50`,
      [STRATEGY_ID, String(SIGNAL_LOOKBACK_MINUTES), BROKER],
    );
    return rows.map((r) => ({
      id: r.id,
      pair: r.pair,
      timeframe: r.timeframe,
      direction: r.direction,
      entryPrice: Number(r.entry_price),
      entryAtr: r.entry_atr ? Number(r.entry_atr) : null,
      createdAt: r.created_at,
    }));
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01' || code === '42703') {
      console.warn('[pilot/rst-executor] schema not ready — skipping tick');
      return [];
    }
    throw err;
  }
}

async function getOpenExecutionCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1 AND status IN ('pending','filled','partially_filled')`,
      [BROKER],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

interface PersistExecArgs {
  signalId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  leverage: number;
  notionalUsd: number;
  riskUsd: number;
  clientOrderId: string;
  exchangeOrderId: string | null;
  status: 'pending' | 'filled' | 'partially_filled' | 'rejected' | 'closed' | 'cancelled';
  mode: 'testnet' | 'live';
}

async function persistExecution(a: PersistExecArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status, filled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        a.signalId, BROKER, a.mode, a.symbol, a.side, a.qty,
        a.entryPrice, a.stopPrice, a.tp1Price, a.leverage,
        a.notionalUsd, a.riskUsd, a.clientOrderId, a.exchangeOrderId, a.status,
        a.status === 'filled' ? new Date() : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[pilot/rst-executor] migration 018 not applied — execution not persisted (', a.clientOrderId, ')');
      return;
    }
    throw err;
  }
}

interface ErrorLogArgs {
  signalId?: string;
  stage: 'size' | 'filter' | 'place_entry' | 'handshake';
  errorCode?: string;
  errorMsg: string;
}

async function logError(a: ErrorLogArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1, $2, $3, $4, $5)`,
      [a.signalId ?? null, BROKER, a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000)],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') console.error('[pilot/rst-executor] failed to persist error:', err);
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function mapStatus(s: string): PersistExecArgs['status'] {
  if (s === 'filled') return 'filled';
  if (s === 'partially_filled') return 'partially_filled';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function countDecimalPlaces(n: number): number {
  if (!isFinite(n) || n <= 0) return 0;
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

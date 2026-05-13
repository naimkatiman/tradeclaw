/**
 * R StocksTrader (RoboForex) executor tick — Phase 2.
 *
 * Called from executor.ts when EXECUTION_BROKER=r-stockstrader.
 * Mirrors the Binance executor structure but keeps the code path entirely
 * separate — MT5-style lots/contract-size sizing differs enough from Binance
 * futures qty that sharing code early would leak asymmetries.
 *
 * Plan: docs/plans/2026-05-08-demo-roboforex-rstockstrader.md
 */

import { ATR } from 'trading-signals';
import { execute, query } from '../db-pool';
import {
  createRStocksTraderBridge,
  readRStocksTraderEnvOrNull,
  type RStocksTraderBridge,
  type RStocksTraderInstrumentSpec,
  type RStocksTraderPlaceInput,
} from './rstockstrader-bridge';
import { buildClientIds } from './client-ids';
import { toRStocksTraderSymbol } from './rstockstrader-symbols';
import type { OrderSide } from './binance-futures';
import type { BinanceKline } from './binance-futures';
import { getKlines } from './binance-futures';
import { BINANCE_SYMBOLS } from '../../app/lib/ohlcv';

const STRATEGY_ID = 'hmm-top3';
const SIGNAL_LOOKBACK_MINUTES = 5;
const ADVISORY_LOCK_KEY = 'tradeclaw:executor:hmm-top3';
const BROKER = 'r-stockstrader';
const DEFAULT_ATR_PERIOD = 14;
const DEFAULT_ATR_MULTIPLIER = 1.5;
const DEFAULT_TP_R_MULTIPLE = 1.5;
const TP1_FRACTION = 0.5;
const H1_KLINE_LIMIT = 100;

function getMode(): 'disabled' | 'testnet' | 'live' {
  const raw = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  if (raw === 'testnet' || raw === 'live') return raw;
  return 'disabled';
}

function cfgNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface RSTTickResult {
  broker: typeof BROKER;
  mode: ReturnType<typeof getMode>;
  processed: number;
  executed: number;
  filtered: number;
  rejected: number;
  errors: number;
  skipped?: 'locked' | 'env_missing';
}

// ─── Kline→ candlestick adapter for ATR ────────────────────────────────────

function computeATRFromKlines(klines: BinanceKline[]): number | null {
  if (klines.length < DEFAULT_ATR_PERIOD + 1) return null;
  const indicator = new ATR(DEFAULT_ATR_PERIOD);
  for (const k of klines) {
    indicator.update({ high: k.high, low: k.low, close: k.close }, false);
  }
  const r = indicator.getResult();
  if (r === null || r === undefined) return null;
  return Number(r);
}

// ─── Lot sizing (MT5-style) ─────────────────────────────────────────────────

interface RSTSizingResult {
  ok: true;
  lots: number;
  stopPrice: number;
  tp1Price: number;
  stopDistance: number;
  notionalUsd: number;
  riskUsd: number;
}

interface RSTSizingRejection {
  ok: false;
  reason: string;
  detail: string;
}

/**
 * Risk-first lot sizing for MT5-style instruments.
 *
 * lots = equityUsd * riskPct/100 / (stopDistance * contractSize)
 *
 * Works for FX (contractSize=100000), metals (XAUUSD contractSize=100),
 * stocks (contractSize=1) and crypto-CFDs without changing the formula —
 * the contractSize absorbs the per-unit value.
 *
 * For cross-currency exposure (USDJPY, USDCAD) where PnL is NOT in USD
 * directly, a fx-rate adjustment would be needed in Phase 3. For now
 * all tracked pairs are USD-quoted so the formula is exact.
 */
function computeLotSize(
  side: OrderSide,
  entryPrice: number,
  atr: number,
  equityUsd: number,
  spec: RStocksTraderInstrumentSpec,
  riskPct: number,
): RSTSizingResult | RSTSizingRejection {
  if (atr <= 0 || entryPrice <= 0 || equityUsd <= 0) {
    return { ok: false, reason: 'invalid_input', detail: `atr=${atr} entry=${entryPrice} equity=${equityUsd}` };
  }

  const stopDistance = atr * DEFAULT_ATR_MULTIPLIER;
  const riskUsd = equityUsd * (riskPct / 100);

  // Check that the ATR-derived stop is at least minStopDistance away.
  if (stopDistance < spec.minStopDistance) {
    return {
      ok: false,
      reason: 'stop_too_close',
      detail: `stopDistance=${stopDistance.toFixed(spec.digits)} minStopDistance=${spec.minStopDistance}`,
    };
  }

  const rawLots = riskUsd / (stopDistance * spec.contractSize);
  const lots = Math.floor(rawLots / spec.qtyStep) * spec.qtyStep;

  if (lots < spec.minQty) {
    return {
      ok: false,
      reason: 'below_min_qty',
      detail: `lots=${lots} minQty=${spec.minQty}`,
    };
  }

  const stopPriceRaw = side === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
  const tp1PriceRaw  = side === 'BUY' ? entryPrice + stopDistance * DEFAULT_TP_R_MULTIPLE : entryPrice - stopDistance * DEFAULT_TP_R_MULTIPLE;

  const roundToTick = (p: number) =>
    Number((Math.round(p / spec.tickSize) * spec.tickSize).toFixed(spec.digits));

  const stopPrice = roundToTick(stopPriceRaw);
  const tp1Price  = roundToTick(tp1PriceRaw);

  const actualStopDistance = Math.abs(entryPrice - stopPrice);
  const notionalUsd = lots * entryPrice * spec.contractSize;

  return {
    ok: true,
    lots: Number(lots.toFixed(2)),
    stopPrice,
    tp1Price,
    stopDistance: actualStopDistance,
    notionalUsd,
    riskUsd: lots * actualStopDistance * spec.contractSize,
  };
}

// ─── Pending signal fetch (shared SQL, separate broker guard) ──────────────

interface PendingSignal {
  id: string;
  pair: string;
  direction: OrderSide;
  entryPrice: number;
  entryAtr: number | null;
  createdAt: Date;
}

async function fetchPendingSignals(): Promise<PendingSignal[]> {
  try {
    const rows = await query<{
      id: string;
      pair: string;
      direction: 'BUY' | 'SELL';
      entry_price: string;
      entry_atr: string | null;
      created_at: Date;
    }>(
      `SELECT sh.id, sh.pair, sh.direction, sh.entry_price, sh.entry_atr, sh.created_at
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
      direction: r.direction,
      entryPrice: Number(r.entry_price),
      entryAtr: r.entry_atr ? Number(r.entry_atr) : null,
      createdAt: r.created_at,
    }));
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01' || code === '42703') return [];
    throw err;
  }
}

async function getOpenCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker=$1 AND status IN ('pending','filled','partially_filled')`,
      [BROKER],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

async function logError(a: {
  signalId?: string;
  stage: string;
  errorCode?: string;
  errorMsg: string;
}): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1,$2,$3,$4,$5)`,
      [a.signalId ?? null, BROKER, a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000)],
    );
  } catch {
    // table may not exist
  }
}

async function persistExecution(a: {
  signalId: string;
  symbol: string;
  side: OrderSide;
  lots: number;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  notionalUsd: number;
  riskUsd: number;
  clientRef: string;
  brokerOrderId: string;
  status: string;
  mode: 'testnet' | 'live';
}): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status, filled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        a.signalId, BROKER, a.mode, a.symbol, a.side, a.lots,
        a.entryPrice, a.stopPrice, a.tp1Price,
        1,                     // leverage = 1 for CFD margin accounts (lot-based)
        a.notionalUsd, a.riskUsd,
        a.clientRef, a.brokerOrderId || null,
        a.status,
        a.status === 'filled' ? new Date() : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[rst/executor] migration 018 not applied — execution not persisted');
      return;
    }
    throw err;
  }
}

// ─── Main tick ─────────────────────────────────────────────────────────────

export async function runRStocksTraderTick(): Promise<RSTTickResult> {
  const mode = getMode();
  const result: RSTTickResult = {
    broker: BROKER,
    mode,
    processed: 0,
    executed: 0,
    filtered: 0,
    rejected: 0,
    errors: 0,
  };

  if (mode === 'disabled') {
    console.log('[rst/executor] EXECUTION_MODE=disabled — tick skipped');
    return result;
  }

  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    console.warn('[rst/executor] RSTOCKSTRADER env vars missing — tick skipped');
    return { ...result, skipped: 'env_missing' };
  }

  const bridge: RStocksTraderBridge = createRStocksTraderBridge(env);

  // Advisory lock — same mechanism as Binance path to prevent double-fills.
  const { withClient } = await import('../db-pool');
  return withClient(async (lockClient) => {
    const lockRes = await lockClient.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS acquired`,
      [ADVISORY_LOCK_KEY],
    );
    if (lockRes.rows[0]?.acquired !== true) return { ...result, skipped: 'locked' };

    try {
      return await runTickLocked(bridge, mode, result);
    } finally {
      await lockClient.query(
        `SELECT pg_advisory_unlock(hashtext($1)::bigint)`,
        [ADVISORY_LOCK_KEY],
      );
    }
  });
}

async function runTickLocked(
  bridge: RStocksTraderBridge,
  mode: RSTTickResult['mode'],
  result: RSTTickResult,
): Promise<RSTTickResult> {
  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  let account;
  let openCount: number;
  try {
    [account, openCount] = await Promise.all([bridge.getAccountInfo(), getOpenCount()]);
  } catch (err) {
    await logError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  const maxPositions = Math.floor(cfgNum('EXEC_MAX_POSITIONS', 4));
  const riskPct = cfgNum('EXEC_RISK_PCT', 1);
  let liveOpen = openCount;
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      const entry = toRStocksTraderSymbol(sig.pair);
      if (!entry) {
        result.filtered++;
        await logError({ signalId: sig.id, stage: 'filter', errorCode: 'symbol_not_rstockstrader_eligible', errorMsg: `${sig.pair} has no R StocksTrader mapping` });
        continue;
      }

      const { symbol } = entry;

      if (inTickSymbols.has(symbol)) {
        result.filtered++;
        await logError({ signalId: sig.id, stage: 'filter', errorCode: 'symbol_already_entered_in_tick', errorMsg: `${symbol} already entered in this tick` });
        continue;
      }

      if (liveOpen >= maxPositions) {
        result.filtered++;
        await logError({ signalId: sig.id, stage: 'filter', errorCode: 'max_positions_reached', errorMsg: `${liveOpen}/${maxPositions}` });
        continue;
      }

      // Use Binance mainnet klines for ATR (real price action; same as Binance path).
      // Falls back to the signal's stored ATR if the pair has no Binance mapping.
      const binancePair = BINANCE_SYMBOLS[sig.pair];
      let atr = sig.entryAtr;
      if (binancePair) {
        const klines = await getKlines(binancePair, '1h', H1_KLINE_LIMIT);
        atr = computeATRFromKlines(klines) ?? atr;
      }

      if (!atr || atr <= 0) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `pair=${sig.pair}` });
        continue;
      }

      let spec: RStocksTraderInstrumentSpec;
      try {
        spec = await bridge.getInstrumentSpec(symbol);
      } catch (err) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'instrument_spec_failed', errorMsg: getMsg(err) });
        continue;
      }

      const sizing = computeLotSize(sig.direction, sig.entryPrice, atr, account.equity, spec, riskPct);
      if (!sizing.ok) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: sizing.reason, errorMsg: sizing.detail });
        continue;
      }

      const ids = buildClientIds(sig.id);
      const orderInput: RStocksTraderPlaceInput = {
        symbol,
        side: sig.direction,
        type: 'MARKET',
        qty: sizing.lots,
        stopLoss: sizing.stopPrice,
        takeProfit: sizing.tp1Price,
        clientRef: ids.entry,
        comment: `tc-${sig.id.slice(0, 8)}`,
      };

      const placed = await bridge.placeOrder(orderInput);

      if (placed.status === 'rejected') {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'place_entry', errorCode: 'broker_rejected', errorMsg: placed.rejectReason ?? 'rejected' });
        continue;
      }

      await persistExecution({
        signalId: sig.id,
        symbol,
        side: sig.direction,
        lots: sizing.lots,
        entryPrice: placed.avgFillPrice ?? sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        clientRef: ids.entry,
        brokerOrderId: placed.brokerOrderId,
        status: placed.status,
        mode: mode as 'testnet' | 'live',
      });

      result.executed++;
      liveOpen++;
      inTickSymbols.add(symbol);

      // TP1 partial close — place as a separate take-profit order if the broker
      // doesn't support multi-leg brackets. R StocksTrader supports attached
      // SL/TP at order placement; the runner (full-close at TP2) is handled
      // by the position manager in a follow-up PR.
      void logTP1Intent(sig.id, symbol, sizing.tp1Price, sizing.lots * TP1_FRACTION);
    } catch (err) {
      result.errors++;
      await logError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[rst/executor] tick: ${JSON.stringify(result)}`);
  return result;
}

async function logTP1Intent(signalId: string, symbol: string, tp1Price: number, tp1Lots: number): Promise<void> {
  // TP1 partial close intent is stored as an audit row, not a live order,
  // because R StocksTrader's bracket already has an attached TP. A separate
  // position-manager tick (Phase 2.5) will handle breakeven moves.
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1,$2,'manage','tp1_intent',$3)`,
      [signalId, BROKER, `symbol=${symbol} tp1=${tp1Price} lots=${tp1Lots} (no separate order in Phase 2)`],
    );
  } catch {
    // non-critical
  }
}

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

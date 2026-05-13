/**
 * TradeClaw Pilot — entry executor.
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 *
 * Pulls recent unexecuted hmm-top3 signals, runs entry filters, sizes the
 * position, and places a market entry + STOP_MARKET + TAKE_PROFIT_MARKET
 * bracket. Writes audit rows to executions / execution_errors.
 *
 * Idempotency: clientOrderId = signal_id. Binance rejects duplicates, and
 * the SQL pull already excludes signals with an executions row.
 */

import type { PoolClient } from 'pg';
import { execute, query, withClient } from '../db-pool';
import { BINANCE_SYMBOLS } from '../../app/lib/ohlcv';
import {
  cancelOrder,
  currentMode,
  getAccount,
  getExchangeInfo,
  getKlines,
  isTestnet,
  placeOrder,
  setLeverage,
  setMarginType,
  type BinanceAccount,
  type BinanceKline,
  type OrderSide,
} from './binance-futures';
import { buildClientIds } from './client-ids';
import { runEntryFilters } from './filters';
import { checkLossKillSwitch } from './risk-rails';
import {
  createRStocksTraderBridge,
  readRStocksTraderEnvOrNull,
  type RStocksTraderInstrumentSpec,
} from './rstockstrader-bridge';
import { toRStocksTraderSymbol } from './rstockstrader-symbols';
import { computeATR, computeSize, extractFilters, type SymbolFilters } from './sizing';
import { notifyEntryFilled } from './telegram';
import { getTodayUniverse } from './universe-runner';

// Trading firewall — the executor pulls signals only where strategy_id =
// 'hmm-top3'. TradingView webhook strategies (tv-zaky-classic etc.) land in
// the separate `premium_signals` table and are NEVER read here. Do not
// loosen this filter without an explicit risk review — it is the gate that
// keeps third-party webhook input out of live order placement.
const STRATEGY_ID = 'hmm-top3';
const SIGNAL_LOOKBACK_MINUTES = 5;
const ADVISORY_LOCK_KEY = 'tradeclaw:executor:hmm-top3';
const H1_KLINE_LIMIT = 100;        // enough for EMA50 + slope + ADX(14) warmup
const BROKER_BINANCE = 'binance-futures';
const BROKER_RST = 'r-stockstrader';
const BROKER = BROKER_BINANCE;     // used by Binance helpers below; R StocksTrader uses BROKER_RST
const TP1_FRACTION = 0.5;          // half qty at TP1, runner = the rest

// ATR stop-distance multiplier (same for both brokers)
const ATR_STOP_MULT = 1.5;
// TP1 ATR multiplier (same for both brokers)
const ATR_TP1_MULT = 3.0;
// Minimum notional per trade in USD (reject if smaller after sizing)
const MIN_NOTIONAL_USD = 10;

const cfgInt = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

interface ExecutorTickResult {
  mode: ReturnType<typeof currentMode>;
  processed: number;
  executed: number;
  rejected: number;
  filtered: number;
  errors: number;
  halted?: string;
  skipped?: 'locked';
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

export async function runExecutorTick(): Promise<ExecutorTickResult> {
  const mode = currentMode();
  const result: ExecutorTickResult = { mode, processed: 0, executed: 0, rejected: 0, filtered: 0, errors: 0 };

  if (mode === 'disabled') {
    console.log('[pilot/executor] EXECUTION_MODE=disabled — tick skipped');
    return result;
  }

  // Broker dispatch — keep paths separate per plan §hard-constraints.
  const broker = (process.env.EXECUTION_BROKER ?? 'binance').toLowerCase();

  // PG advisory lock — prevents two overlapping cron firings from both
  // hitting placeOrder for the same signal between the SQL pull and the
  // executions row insert. Held on a dedicated session via withClient so
  // acquire and release run on the same connection; without this, releasing
  // through query() picks an arbitrary pool client and the lock leaks until
  // the original session idle-times out (idleTimeoutMillis=30s). Inner work
  // continues to use the pool freely — the held client is only the lock owner.
  return withClient(async (lockClient) => {
    const lockAcquired = await tryAcquireExecutorLock(lockClient);
    if (!lockAcquired) {
      return { ...result, skipped: 'locked' };
    }
    try {
      if (broker === BROKER_RST) {
        return await runRStocksTraderTickLocked(mode, result);
      }
      return await runExecutorTickLocked(mode, result);
    } finally {
      await releaseExecutorLock(lockClient);
    }
  });
}

async function runExecutorTickLocked(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  // 1. Pull pending signals
  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  // 2. Prefetch shared state once per tick
  let account: BinanceAccount;
  let universe: ReadonlySet<string>;
  let exchangeInfoMap: Map<string, ReturnType<typeof extractFilters>>;
  let openExecutionCount: number;
  try {
    [account, universe, exchangeInfoMap, openExecutionCount] = await Promise.all([
      getAccount(),
      getTodayUniverse().then((s) => new Set(s) as ReadonlySet<string>),
      buildExchangeInfoMap(),
      getOpenExecutionCount(),
    ]);
  } catch (err) {
    await logError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  // 2b. Loss kill switches — block new entries when daily/weekly loss caps
  // are tripped. Open positions keep their stops; manage-positions still runs.
  try {
    const verdict = await checkLossKillSwitch(account);
    if (verdict.halted) {
      result.halted = verdict.reason;
      await logError({
        stage: 'handshake',
        errorCode: 'loss_kill_switch',
        errorMsg: verdict.reason ?? 'loss_kill',
        payload: verdict.detail as unknown as Record<string, unknown>,
      });
      console.warn(`[pilot/executor] HALT: ${verdict.reason}`);
      return result;
    }
  } catch (err) {
    // Fail-CLOSED: if we can't read realized PnL, refuse new entries this tick.
    // Better to skip a profitable signal than to keep trading blind through a
    // drawdown.
    result.halted = 'kill_switch_check_failed';
    await logError({ stage: 'handshake', errorCode: 'loss_kill_switch_error', errorMsg: getMsg(err) });
    console.error('[pilot/executor] kill switch check failed — halting tick:', getMsg(err));
    return result;
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openExecutionCount;
  // Track symbols that have already opened a position in THIS tick. `account`
  // is fetched once at tick start and never refreshed inside the loop, so two
  // signals on the same pair would both pass concurrencyFilter and stack.
  // Plan §risk-rails forbids pyramiding in v1 — this Set is the gate.
  const inTickSymbols = new Set<string>();

  // 3. Iterate signals
  for (const sig of signals) {
    try {
      // signal_history.pair is TwelveData canonical (e.g. BTCUSD). Binance
      // Futures expects USDT-perp symbols (e.g. BTCUSDT). Map up-front, and
      // skip non-crypto pairs (FX, metals, US equities) — those are MetaApi /
      // IBKR territory, not this executor's.
      const binancePair = BINANCE_SYMBOLS[sig.pair];
      if (!binancePair) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_not_binance_eligible',
          errorMsg: `${sig.pair} has no Binance USDT-perp mapping`,
        });
        continue;
      }

      if (inTickSymbols.has(binancePair)) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_already_entered_in_tick',
          errorMsg: `${sig.pair} (${binancePair}) already entered earlier in this tick`,
        });
        continue;
      }

      // 3a. Filters
      const klinesH1 = await getKlines(binancePair, '1h', H1_KLINE_LIMIT);
      const verdict = runEntryFilters({
        symbol: binancePair,
        side: sig.direction,
        todayUniverse: universe,
        concurrencyState: { livePositions: account.positions, openExecutionCount: liveOpen, maxPositions },
        klinesH1,
      });
      if (!verdict.passed) {
        result.filtered++;
        await logError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: verdict.reason,
          errorMsg: verdict.detail ?? verdict.reason,
        });
        continue;
      }

      // 3b. ATR & size
      const filters = exchangeInfoMap.get(binancePair);
      if (!filters) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'symbol_not_in_exchange_info', errorMsg: `${sig.pair} (${binancePair})` });
        continue;
      }
      const atr = sig.entryAtr ?? computeATR(klinesH1);
      if (!atr || atr <= 0) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `signal=${sig.id} pair=${sig.pair}` });
        continue;
      }

      const sizing = computeSize({
        side: sig.direction,
        entryPrice: sig.entryPrice,
        atr,
        equityUsd: account.totalMarginBalance || account.totalWalletBalance,
        filters,
      });
      if (!sizing.ok) {
        result.rejected++;
        await logError({ signalId: sig.id, stage: 'size', errorCode: sizing.reason, errorMsg: sizing.detail });
        continue;
      }

      // 3c. Place bracket.
      // NOTE: `account` was fetched once at tick start. Positions opened by
      // earlier signals in the same tick aren't reflected in `account.positions`.
      // For symbols that just got entered we'd no-op leverage/margin setup
      // anyway; for fresh symbols this is correct.
      await ensureLeverageAndMargin(binancePair, sizing.leverage, account);

      const ids = buildClientIds(sig.id);

      const entryOrder = await placeOrder({
        symbol: binancePair,
        side: sig.direction,
        type: 'MARKET',
        quantity: sizing.qty,
        clientOrderId: ids.entry,
      });

      const slOrder = await placeOrder({
        symbol: binancePair,
        side: sig.direction === 'BUY' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        stopPrice: sizing.stopPrice,
        closePosition: true,
        clientOrderId: ids.sl,
        workingType: 'MARK_PRICE',
      }).catch(async (err) => {
        await logError({ signalId: sig.id, stage: 'place_sl', errorMsg: getMsg(err) });
        return null;
      });

      const tpQty = roundDownToStep(sizing.qty * TP1_FRACTION, filters.stepSize, filters.quantityPrecision);
      const tpOrder = tpQty > 0
        ? await placeOrder({
            symbol: binancePair,
            side: sig.direction === 'BUY' ? 'SELL' : 'BUY',
            type: 'TAKE_PROFIT_MARKET',
            quantity: tpQty,
            stopPrice: sizing.tp1Price,
            reduceOnly: true,
            clientOrderId: ids.tp1,
            workingType: 'MARK_PRICE',
          }).catch(async (err) => {
            await logError({ signalId: sig.id, stage: 'place_tp', errorMsg: getMsg(err) });
            return null;
          })
        : null;

      // 3d. If SL failed but entry filled, cancel entry to avoid naked exposure
      if (entryOrder && !slOrder) {
        try {
          await cancelOrder(binancePair, entryOrder.orderId);
        } catch (err) {
          await logError({ signalId: sig.id, stage: 'cancel', errorMsg: getMsg(err) });
        }
        result.rejected++;
        continue;
      }

      // 3e. Persist execution row. We store the Binance-native symbol
      // (binancePair) — that's what was actually traded. The signal_id FK
      // preserves the link back to the TradeClaw canonical pair.
      const status = !entryOrder ? 'pending' : (entryOrder.status?.toLowerCase() ?? 'pending');
      await persistExecution({
        signalId: sig.id,
        symbol: binancePair,
        side: sig.direction,
        qty: sizing.qty,
        entryPrice: entryOrder ? Number(entryOrder.avgPrice ?? entryOrder.price ?? sig.entryPrice) || sig.entryPrice : sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        leverage: sizing.leverage,
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        clientOrderId: ids.entry,
        exchangeOrderId: entryOrder?.orderId?.toString() ?? null,
        status: mapBinanceStatus(status),
        slOrderId: slOrder?.orderId?.toString() ?? null,
        tpOrderId: tpOrder?.orderId?.toString() ?? null,
        mode: isTestnet() ? 'testnet' : 'live',
      });

      result.executed++;
      liveOpen++;
      inTickSymbols.add(binancePair);

      void notifyEntryFilled({
        signalId: sig.id,
        symbol: binancePair,
        side: sig.direction,
        qty: sizing.qty,
        entryPrice: entryOrder ? Number(entryOrder.avgPrice ?? entryOrder.price ?? sig.entryPrice) || sig.entryPrice : sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        leverage: sizing.leverage,
      });
    } catch (err) {
      result.errors++;
      await logError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/executor] tick: ${JSON.stringify(result)}`);
  return result;
}

// ─── Concurrency helpers ──────────────────────────────────────────────

async function tryAcquireExecutorLock(client: PoolClient): Promise<boolean> {
  try {
    const r = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS acquired`,
      [ADVISORY_LOCK_KEY],
    );
    return r.rows[0]?.acquired === true;
  } catch (err) {
    // If the lock query fails (e.g. DB unreachable) skip the tick rather
    // than running unprotected. Better to miss a tick than to risk a
    // double-fill bracket race during a DB blip.
    console.error('[pilot/executor] advisory lock acquire failed:', getMsg(err));
    return false;
  }
}

async function releaseExecutorLock(client: PoolClient): Promise<void> {
  try {
    await client.query(
      `SELECT pg_advisory_unlock(hashtext($1)::bigint)`,
      [ADVISORY_LOCK_KEY],
    );
  } catch (err) {
    console.error('[pilot/executor] advisory lock release failed:', getMsg(err));
  }
}

// ─── Data helpers ──────────────────────────────────────────────────────

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
         LEFT JOIN executions e ON e.signal_id = sh.id
        WHERE sh.strategy_id = $1
          AND sh.created_at > NOW() - ($2 || ' minutes')::INTERVAL
          AND (sh.gate_blocked IS NULL OR sh.gate_blocked = FALSE)
          AND e.id IS NULL
        ORDER BY sh.created_at ASC
        LIMIT 50`,
      [STRATEGY_ID, String(SIGNAL_LOOKBACK_MINUTES)],
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
      console.warn('[pilot/executor] schema not ready (executions table or required columns missing) — skipping tick');
      return [];
    }
    throw err;
  }
}

async function buildExchangeInfoMap(): Promise<Map<string, SymbolFilters>> {
  const info = await getExchangeInfo();
  const map = new Map<string, SymbolFilters>();
  for (const s of info.symbols) {
    if (s.status !== 'TRADING' || s.quoteAsset !== 'USDT') continue;
    map.set(s.symbol, extractFilters(s));
  }
  return map;
}

async function getOpenExecutionCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1
          AND status IN ('pending','filled','partially_filled')`,
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
  slOrderId: string | null;
  tpOrderId: string | null;
  mode: 'testnet' | 'live';
}

async function persistExecution(a: PersistExecArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status,
         filled_at)
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
      console.warn('[pilot/executor] migration 018 not applied — execution not persisted (', a.clientOrderId, ')');
      return;
    }
    throw err;
  }
}

interface ErrorLogArgs {
  signalId?: string;
  executionId?: string;
  stage: 'size' | 'filter' | 'place_entry' | 'place_sl' | 'place_tp' | 'manage' | 'cancel' | 'handshake';
  errorCode?: string;
  errorMsg: string;
  payload?: Record<string, unknown>;
}

async function logError(a: ErrorLogArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, execution_id, broker, stage, error_code, error_msg, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        a.signalId ?? null, a.executionId ?? null, BROKER,
        a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000),
        a.payload ? JSON.stringify(a.payload) : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') console.error('[pilot/executor] failed to persist error:', err);
  }
}

async function ensureLeverageAndMargin(symbol: string, leverage: number, account: BinanceAccount): Promise<void> {
  const livePos = account.positions.find((p) => p.symbol === symbol && Math.abs(p.positionAmt) > 0);
  // Only set if no live position — avoids disturbing user's existing positions on this symbol
  if (livePos) return;
  await setMarginType(symbol, 'ISOLATED');
  await setLeverage(symbol, leverage);
}

function mapBinanceStatus(s: string): PersistExecArgs['status'] {
  const lc = s.toLowerCase();
  if (lc === 'filled' || lc === 'partially_filled' || lc === 'pending' || lc === 'rejected' || lc === 'closed' || lc === 'cancelled') {
    return lc;
  }
  if (lc === 'new') return 'pending';
  return 'pending';
}

function roundDownToStep(qty: number, stepSize: number, precision: number): number {
  if (stepSize <= 0) return Number(qty.toFixed(precision));
  const stepped = Math.floor(qty / stepSize) * stepSize;
  return Number(stepped.toFixed(precision));
}

// ─── R StocksTrader executor tick ────────────────────────────────────────────
//
// Kept entirely separate from the Binance path per plan §hard-constraints:
// "Do not try to share an abstract 'broker' interface on the first pass —
// it will leak asymmetries (MT5 lot vs futures qty, attached vs separate SL/TP)."

async function runRStocksTraderTickLocked(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    console.error('[pilot/executor/rst] EXECUTION_BROKER=r-stockstrader but env vars missing');
    await rstLogError({ stage: 'handshake', errorMsg: 'RSTOCKSTRADER_BASE_URL/TOKEN/ACCOUNT_ID not set' });
    result.errors++;
    return result;
  }

  const bridge = createRStocksTraderBridge(env);

  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  let account;
  let universe: ReadonlySet<string>;
  let openCount: number;
  try {
    [account, universe, openCount] = await Promise.all([
      bridge.getAccountInfo(),
      getTodayUniverse().then((s) => new Set(s) as ReadonlySet<string>),
      getRstOpenExecutionCount(),
    ]);
  } catch (err) {
    await rstLogError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openCount;
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      // Map TradeClaw canonical pair → R StocksTrader symbol entry
      const entry = toRStocksTraderSymbol(sig.pair);
      if (!entry) {
        result.filtered++;
        await rstLogError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_not_rstockstrader_eligible',
          errorMsg: `${sig.pair} has no R StocksTrader mapping`,
        });
        continue;
      }

      if (inTickSymbols.has(entry.symbol)) {
        result.filtered++;
        continue;
      }

      // Universe gate (same universe as Binance — TradeClaw's daily screen)
      if (!universe.has(sig.pair)) {
        result.filtered++;
        await rstLogError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'not_in_universe',
          errorMsg: `${sig.pair} not in today's universe`,
        });
        continue;
      }

      // Position count gate
      if (liveOpen >= maxPositions) {
        result.filtered++;
        await rstLogError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'max_positions_reached',
          errorMsg: `${liveOpen}/${maxPositions} open`,
        });
        continue;
      }

      // Instrument spec (cached 1h inside the bridge)
      let spec: RStocksTraderInstrumentSpec;
      try {
        spec = await bridge.getInstrumentSpec(entry.symbol);
      } catch (err) {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'instrument_spec_failed',
          errorMsg: getMsg(err),
        });
        continue;
      }

      // ATR: prefer the value stored on the signal (computed by signal generator);
      // R StocksTrader candle endpoint is not wired for Phase 2 demo.
      const atr = sig.entryAtr;
      if (!atr || atr <= 0) {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'size',
          errorCode: 'atr_unavailable',
          errorMsg: `entry_atr missing for signal ${sig.id}`,
        });
        continue;
      }

      // Sizing — risk-first, lot-based
      const sizing = computeRstSize({
        side: sig.direction,
        entryPrice: sig.entryPrice,
        atr,
        equityUsd: account.equity,
        spec,
        assetClass: entry.assetClass,
      });
      if (!sizing.ok) {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'size',
          errorCode: sizing.reason,
          errorMsg: `${sig.pair} (${entry.symbol}) ${sizing.reason ?? 'sizing_failed'}`,
        });
        continue;
      }

      // Reject locally when stop is within broker's minimum stop distance
      const stopDist = Math.abs(sizing.stopPrice - sig.entryPrice);
      if (stopDist < spec.minStopDistance) {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'size',
          errorCode: 'stop_too_close',
          errorMsg: `stopDist=${stopDist.toFixed(spec.digits)} < minStopDistance=${spec.minStopDistance}`,
        });
        continue;
      }

      // Place bracket (entry + attached SL + attached TP in one call)
      const ids = buildClientIds(sig.id);
      const placeResult = await bridge.placeOrder({
        symbol: entry.symbol,
        side: sig.direction,
        type: 'MARKET',
        qty: sizing.qty,
        stopLoss: sizing.stopPrice,
        takeProfit: sizing.tp1Price,
        clientRef: ids.entry,
        comment: `tradeclaw:${sig.id}`,
      });

      if (placeResult.status === 'rejected') {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'place_entry',
          errorCode: 'broker_rejected',
          errorMsg: placeResult.rejectReason ?? 'rejected',
        });
        continue;
      }

      await rstPersistExecution({
        signalId: sig.id,
        symbol: entry.symbol,
        side: sig.direction,
        qty: sizing.qty,
        entryPrice: placeResult.avgFillPrice ?? sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        leverage: 1,                  // CFD/FX: leverage embedded in lot sizing
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        clientOrderId: ids.entry,
        exchangeOrderId: placeResult.brokerOrderId || null,
        status: placeResult.status === 'filled' ? 'filled' : 'pending',
        mode: mode === 'live' ? 'live' : 'testnet',
      });

      result.executed++;
      liveOpen++;
      inTickSymbols.add(entry.symbol);

      console.log(`[pilot/executor/rst] placed ${sig.direction} ${sizing.qty} ${entry.symbol} entry=${sig.entryPrice} sl=${sizing.stopPrice} tp1=${sizing.tp1Price} risk=${sizing.riskUsd.toFixed(2)}`);
    } catch (err) {
      result.errors++;
      await rstLogError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/executor/rst] tick: ${JSON.stringify(result)}`);
  return result;
}

// ─── R StocksTrader sizing ────────────────────────────────────────────────

const cfgPct = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

interface RstSizingResult {
  ok: true;
  qty: number;
  stopPrice: number;
  tp1Price: number;
  riskUsd: number;
  notionalUsd: number;
}
interface RstSizingFail {
  ok: false;
  reason: string;
}

/**
 * Risk-first lot sizing for R StocksTrader CFD/FX/stock positions.
 *
 * Formula: qty = riskBudget / (stopDistance * contractSize * quoteToUsd)
 *
 * quoteToUsd handles cross-currency pairs (USD/JPY, USD/CAD) where the
 * quote is not USD. For those pairs, we divide by entryPrice to convert
 * the quoted P&L to USD. For USD-quoted majors (EUR/USD, XAU/USD, stock.US)
 * quoteToUsd = 1.
 */
function computeRstSize(params: {
  side: OrderSide;
  entryPrice: number;
  atr: number;
  equityUsd: number;
  spec: RStocksTraderInstrumentSpec;
  assetClass: string | undefined;
}): RstSizingResult | RstSizingFail {
  const { side, entryPrice, atr, equityUsd, spec } = params;

  const riskPct = cfgPct('EXEC_RISK_PCT', 1);
  const riskBudget = equityUsd * riskPct / 100;
  const stopDistance = atr * ATR_STOP_MULT;
  const tp1Distance = atr * ATR_TP1_MULT;

  // For USD/XXX pairs the quote is not USD — divide by price to get USD per pip.
  // Symbol format in R StocksTrader: "USD/JPY", "USD/CHF", "USD/CAD" etc.
  const sym = spec.symbol.toUpperCase();
  const isUsdBase = sym.startsWith('USD/');
  const quoteToUsd = isUsdBase ? 1 / entryPrice : 1;

  const riskPerUnit = stopDistance * spec.contractSize * quoteToUsd;
  if (riskPerUnit <= 0) return { ok: false, reason: 'risk_per_unit_zero' };

  // Raw qty from risk budget
  let qty = riskBudget / riskPerUnit;

  // Notional cap per asset class
  const capPct = getNotionalCapPct(params.assetClass);
  const maxNotional = equityUsd * capPct / 100;
  const notionalPerUnit = entryPrice * spec.contractSize;
  if (notionalPerUnit > 0 && qty * notionalPerUnit > maxNotional) {
    qty = maxNotional / notionalPerUnit;
  }

  // Round down to qtyStep
  if (spec.qtyStep > 0) qty = Math.floor(qty / spec.qtyStep) * spec.qtyStep;
  qty = parseFloat(qty.toFixed(Math.max(0, spec.digits)));

  if (qty < spec.minQty) {
    return { ok: false, reason: 'qty_below_min' };
  }
  if (qty <= 0) {
    return { ok: false, reason: 'qty_zero' };
  }

  const stopPrice = side === 'BUY'
    ? parseFloat((entryPrice - stopDistance).toFixed(spec.digits))
    : parseFloat((entryPrice + stopDistance).toFixed(spec.digits));

  const tp1Price = side === 'BUY'
    ? parseFloat((entryPrice + tp1Distance).toFixed(spec.digits))
    : parseFloat((entryPrice - tp1Distance).toFixed(spec.digits));

  const riskUsd = qty * riskPerUnit;
  const notionalUsd = qty * notionalPerUnit;

  if (notionalUsd < MIN_NOTIONAL_USD) return { ok: false, reason: 'notional_too_small' };

  return { ok: true, qty, stopPrice, tp1Price, riskUsd, notionalUsd };
}

function getNotionalCapPct(assetClass?: string): number {
  switch (assetClass) {
    case 'crypto-cfd': return cfgPct('EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT', 50);
    case 'us-stock':
    case 'us-etf':    return cfgPct('EXEC_STOCK_PER_TRADE_NOTIONAL_PCT', 100);
    default:          return cfgPct('EXEC_FX_PER_TRADE_NOTIONAL_PCT', 100);
  }
}

// ─── R StocksTrader DB helpers ────────────────────────────────────────────

async function getRstOpenExecutionCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1
          AND status IN ('pending','filled','partially_filled')`,
      [BROKER_RST],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

interface RstPersistArgs {
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

async function rstPersistExecution(a: RstPersistArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status,
         filled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        a.signalId, BROKER_RST, a.mode, a.symbol, a.side, a.qty,
        a.entryPrice, a.stopPrice, a.tp1Price, a.leverage,
        a.notionalUsd, a.riskUsd, a.clientOrderId, a.exchangeOrderId, a.status,
        a.status === 'filled' ? new Date() : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[pilot/executor/rst] migration 018 not applied — execution not persisted (', a.clientOrderId, ')');
      return;
    }
    throw err;
  }
}

interface RstErrorLogArgs {
  signalId?: string;
  stage: 'size' | 'filter' | 'place_entry' | 'handshake';
  errorCode?: string;
  errorMsg: string;
}

async function rstLogError(a: RstErrorLogArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1, $2, $3, $4, $5)`,
      [a.signalId ?? null, BROKER_RST, a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000)],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') console.error('[pilot/executor/rst] failed to persist error:', err);
  }
}

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

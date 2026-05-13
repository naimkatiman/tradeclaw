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
import { concurrencyFilter, runEntryFilters, universeFilter } from './filters';
import { checkLossKillSwitch } from './risk-rails';
import {
  createRStocksTraderBridge,
  readRStocksTraderEnvOrNull,
  type RStocksTraderBridge,
  type RStocksTraderInstrumentSpec,
} from './rstockstrader-bridge';
import { toRStocksTraderSymbol, RSTOCKSTRADER_SYMBOLS } from './rstockstrader-symbols';
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
const BROKER = 'binance-futures';
const TP1_FRACTION = 0.5;          // half qty at TP1, runner = the rest

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

  // Broker dispatch — keep per-broker code paths completely separate.
  // No shared abstract interface on Phase 2 first pass: Binance futures qty ≠
  // R StocksTrader lots, and attached vs separate SL/TP leak other asymmetries.
  const broker = (process.env.EXECUTION_BROKER ?? 'binance').toLowerCase();
  if (broker === 'r-stockstrader') {
    return runRStocksTraderTick(mode, result);
  }

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

function getMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ═══════════════════════════════════════════════════════════════════════════
// R StocksTrader executor tick
// ═══════════════════════════════════════════════════════════════════════════

const RST_BROKER = 'r-stockstrader';

/**
 * Entry executor for the R StocksTrader (RoboForex) broker path.
 *
 * Keeps a strict separation from the Binance path:
 *   - Uses `toRStocksTraderSymbol` for symbol mapping.
 *   - Uses lot-based sizing (contractSize from instrument spec).
 *   - Places bracket orders with attached SL/TP via `bridge.placeOrder`.
 *   - Applies universe + concurrency filters only; EMA/ADX deferred (no
 *     R StocksTrader klines endpoint confirmed yet — use signal ATR instead).
 *
 * Persists to the same `executions` / `execution_errors` tables as Binance
 * with broker = 'r-stockstrader' so the reconciliation SQL covers both.
 */
async function runRStocksTraderTick(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    console.warn('[rst/executor] RSTOCKSTRADER_BASE_URL / TOKEN / ACCOUNT_ID not set — tick skipped');
    return result;
  }

  const bridge = createRStocksTraderBridge(env);

  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  // Build the R StocksTrader universe from the static symbol map.
  // Unlike Binance (which screens on 24h volume daily), R StocksTrader
  // eligibility is determined by whether the symbol is listed in
  // RSTOCKSTRADER_SYMBOLS. The daily Binance universe screen is not used here.
  const universe = new Set(Object.keys(RSTOCKSTRADER_SYMBOLS));

  let accountInfo;
  let openCount: number;
  try {
    [accountInfo, openCount] = await Promise.all([
      bridge.getAccountInfo(),
      getRstOpenExecutionCount(),
    ]);
  } catch (err) {
    await rstLogError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  const equity = accountInfo.equity || accountInfo.balance;
  if (equity <= 0) {
    result.halted = 'equity_zero';
    await rstLogError({ stage: 'handshake', errorCode: 'equity_zero', errorMsg: `equity=${equity}` });
    return result;
  }

  // Open positions from broker (for concurrency filter).
  let livePositions: Awaited<ReturnType<RStocksTraderBridge['listOpenPositions']>> = [];
  try {
    livePositions = await bridge.listOpenPositions();
  } catch (err) {
    // Non-fatal — concurrency filter will rely on DB count alone.
    console.warn('[rst/executor] listOpenPositions failed:', getMsg(err));
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openCount;
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      // Map TwelveData canonical pair → R StocksTrader symbol.
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
      const rstSymbol = entry.symbol;

      if (inTickSymbols.has(rstSymbol)) {
        result.filtered++;
        await rstLogError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_already_entered_in_tick',
          errorMsg: `${rstSymbol} already entered earlier in this tick`,
        });
        continue;
      }

      // Universe filter: all symbols in RSTOCKSTRADER_SYMBOLS are eligible;
      // the check is on the TwelveData pair (the key).
      const uf = universeFilter(sig.pair, universe);
      if (!uf.passed) {
        result.filtered++;
        await rstLogError({ signalId: sig.id, stage: 'filter', errorCode: uf.reason, errorMsg: uf.reason });
        continue;
      }

      // Concurrency filter: adapt R StocksTrader positions to the filter shape
      // by fabricating minimal BinancePosition-like objects.
      const fakeLivePositions = livePositions.map((p) => ({
        symbol: p.symbol,
        positionAmt: p.side === 'BUY' ? p.qty : -p.qty,
        entryPrice: p.openPrice,
        markPrice: p.openPrice,
        unrealizedProfit: p.unrealizedPnl,
        leverage: 1,
        isolated: false,
        positionSide: 'BOTH' as const,
      }));
      const cf = concurrencyFilter(rstSymbol, {
        livePositions: fakeLivePositions,
        openExecutionCount: liveOpen,
        maxPositions,
      });
      if (!cf.passed) {
        result.filtered++;
        await rstLogError({ signalId: sig.id, stage: 'filter', errorCode: cf.reason, errorMsg: cf.detail ?? cf.reason });
        continue;
      }

      // Instrument spec (cached 1h).
      let spec: RStocksTraderInstrumentSpec;
      try {
        spec = await bridge.getInstrumentSpec(rstSymbol);
      } catch (err) {
        result.rejected++;
        await rstLogError({ signalId: sig.id, stage: 'size', errorCode: 'instrument_spec_failed', errorMsg: getMsg(err) });
        continue;
      }

      // ATR — prefer signal's pre-computed value; avoids needing R StocksTrader klines.
      const atr = sig.entryAtr;
      if (!atr || atr <= 0) {
        result.rejected++;
        await rstLogError({ signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `signal=${sig.id} pair=${sig.pair}` });
        continue;
      }

      // Lot sizing.
      const sizing = computeRStSizeLots({
        side: sig.direction,
        entryPrice: sig.entryPrice,
        atr,
        equity,
        spec,
        pair: sig.pair,
      });
      if (!sizing.ok) {
        result.rejected++;
        await rstLogError({ signalId: sig.id, stage: 'size', errorCode: sizing.reason, errorMsg: sizing.detail });
        continue;
      }

      // Place bracket (entry + attached SL + TP in single REST call).
      const ids = buildClientIds(sig.id);
      const placeResult = await bridge.placeOrder({
        symbol: rstSymbol,
        side: sig.direction,
        type: 'MARKET',
        qty: sizing.lots,
        stopLoss: sizing.stopPrice,
        takeProfit: sizing.tp1Price,
        clientRef: ids.entry,
        comment: `tc-${ids.base}`,
      });

      if (placeResult.status === 'rejected') {
        result.rejected++;
        await rstLogError({
          signalId: sig.id,
          stage: 'place_entry',
          errorCode: 'broker_rejected',
          errorMsg: placeResult.rejectReason ?? 'broker rejected',
        });
        continue;
      }

      // Persist execution row.
      const execStatus = placeResult.status === 'filled' ? 'filled' : 'pending';
      await persistRstExecution({
        signalId: sig.id,
        symbol: rstSymbol,
        side: sig.direction,
        qty: sizing.lots,
        entryPrice: placeResult.avgFillPrice ?? sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        leverage: 1,
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        clientOrderId: ids.entry,
        exchangeOrderId: placeResult.brokerOrderId,
        status: execStatus,
        slOrderId: null,
        tpOrderId: null,
        mode: 'testnet',
      });

      result.executed++;
      liveOpen++;
      inTickSymbols.add(rstSymbol);

      void notifyEntryFilled({
        signalId: sig.id,
        symbol: rstSymbol,
        side: sig.direction,
        qty: sizing.lots,
        entryPrice: placeResult.avgFillPrice ?? sig.entryPrice,
        stopPrice: sizing.stopPrice,
        tp1Price: sizing.tp1Price,
        notionalUsd: sizing.notionalUsd,
        riskUsd: sizing.riskUsd,
        leverage: 1,
      });
    } catch (err) {
      result.errors++;
      await rstLogError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[rst/executor] tick: ${JSON.stringify(result)}`);
  return result;
}

// ─── R StocksTrader lot sizing ────────────────────────────────────────────────

interface RStSizingResult {
  ok: true;
  lots: number;
  notionalUsd: number;
  riskUsd: number;
  stopDistance: number;
  stopPrice: number;
  tp1Price: number;
}
interface RStSizingRejection {
  ok: false;
  reason: string;
  detail: string;
}

/**
 * Lot-based risk-first sizing for R StocksTrader.
 *
 * Formula: lots = riskBudget / riskPerLot
 *   USD-quoted pairs (EUR/USD, XAU/USD, BTC/USD, stocks):
 *     riskPerLot = stopDistance × contractSize
 *   USD-base FX pairs (USD/JPY, USD/CAD, USD/CHF):
 *     riskPerLot = stopDistance × contractSize / entryPrice
 *     (entry price is quote-per-USD, so dividing converts back to USD)
 *
 * Notional is in USD for display; per-trade notional cap is applied via
 * EXEC_FX_PER_TRADE_NOTIONAL_PCT / EXEC_STOCK_PER_TRADE_NOTIONAL_PCT /
 * EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT env vars.
 */
function computeRStSizeLots(input: {
  side: OrderSide;
  entryPrice: number;
  atr: number;
  equity: number;
  spec: RStocksTraderInstrumentSpec;
  pair: string;           // TwelveData pair e.g. EURUSD, USDJPY
}): RStSizingResult | RStSizingRejection {
  const { side, entryPrice, atr, equity, spec, pair } = input;

  if (atr <= 0 || entryPrice <= 0 || equity <= 0) {
    return { ok: false, reason: 'invalid_input', detail: `atr=${atr} entry=${entryPrice} equity=${equity}` };
  }

  const riskPct = cfgNum('EXEC_RISK_PCT', 1);
  const maxLeverage = cfgInt('EXEC_MAX_LEVERAGE', 5);

  // Per-asset notional cap env vars (different defaults per asset class).
  const notionalPct = getNotionalPct(spec.assetClass);

  const atrMult = 1.5;
  const tpR = 1.5;

  const stopDistance = atr * atrMult;
  const stopPrice = side === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
  const tp1Price = side === 'BUY' ? entryPrice + stopDistance * tpR : entryPrice - stopDistance * tpR;

  // Minimum stop distance enforcement.
  if (spec.minStopDistance > 0 && stopDistance < spec.minStopDistance) {
    return {
      ok: false,
      reason: 'stop_too_close',
      detail: `stopDist=${stopDistance.toFixed(spec.digits)} minStopDist=${spec.minStopDistance}`,
    };
  }

  // Risk in USD per lot.
  const isUsdBase = isUsdBasePair(pair);
  const riskPerLot = isUsdBase
    ? (stopDistance * spec.contractSize) / entryPrice
    : stopDistance * spec.contractSize;

  if (riskPerLot <= 0) {
    return { ok: false, reason: 'risk_per_lot_zero', detail: `contractSize=${spec.contractSize} stopDist=${stopDistance}` };
  }

  const riskBudget = equity * (riskPct / 100);
  const notionalCap = equity * (notionalPct / 100);

  // Lot count from risk budget, capped by notional limit.
  const lotsFromRisk = riskBudget / riskPerLot;

  // Notional in USD.
  const notionalPerLot = isUsdBase
    ? spec.contractSize           // 1 lot USD/JPY = contractSize USD
    : spec.contractSize * entryPrice; // 1 lot EUR/USD = contractSize * price USD
  const lotsFromNotional = notionalCap / notionalPerLot;

  let rawLots = Math.min(lotsFromRisk, lotsFromNotional);

  // Leverage cap: notional ÷ equity ≤ maxLeverage.
  const maxLotsFromLeverage = (equity * maxLeverage) / notionalPerLot;
  rawLots = Math.min(rawLots, maxLotsFromLeverage);

  // Round down to qtyStep.
  const lots = roundDownToStep(rawLots, spec.qtyStep, Math.max(2, spec.digits - 3));

  if (lots < spec.minQty) {
    return { ok: false, reason: 'below_min_qty', detail: `lots=${lots} minQty=${spec.minQty}` };
  }

  const notionalUsd = lots * notionalPerLot;
  const riskUsd = lots * riskPerLot;

  // Round stop and TP to tickSize.
  const roundedStop = roundPrice(stopPrice, spec.tickSize, spec.digits);
  const roundedTp = roundPrice(tp1Price, spec.tickSize, spec.digits);

  return {
    ok: true,
    lots,
    notionalUsd,
    riskUsd,
    stopDistance,
    stopPrice: roundedStop,
    tp1Price: roundedTp,
  };
}

/**
 * True for TwelveData pairs where USD is the BASE (USDJPY, USDCAD, USDCHF).
 * All other TwelveData pairs end in "USD" and are USD-quoted.
 */
function isUsdBasePair(pair: string): boolean {
  return pair.startsWith('USD') && !pair.endsWith('USD');
}

function getNotionalPct(assetClass: RStocksTraderInstrumentSpec['assetClass']): number {
  if (assetClass === 'fx' || assetClass === 'metal') {
    return cfgNum('EXEC_FX_PER_TRADE_NOTIONAL_PCT', 100);
  }
  if (assetClass === 'us-stock' || assetClass === 'us-etf') {
    return cfgNum('EXEC_STOCK_PER_TRADE_NOTIONAL_PCT', 100);
  }
  // crypto-cfd, energy-cfd, index-cfd
  return cfgNum('EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT', 50);
}

function roundPrice(price: number, tickSize: number, digits: number): number {
  if (tickSize <= 0) return Number(price.toFixed(digits));
  return Number((Math.round(price / tickSize) * tickSize).toFixed(digits));
}

const cfgNum = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// ─── R StocksTrader DB helpers ────────────────────────────────────────────────

async function getRstOpenExecutionCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1 AND status IN ('pending','filled','partially_filled')`,
      [RST_BROKER],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

async function persistRstExecution(a: PersistExecArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status,
         filled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        a.signalId, RST_BROKER, a.mode, a.symbol, a.side, a.qty,
        a.entryPrice, a.stopPrice, a.tp1Price, a.leverage,
        a.notionalUsd, a.riskUsd, a.clientOrderId, a.exchangeOrderId, a.status,
        a.status === 'filled' ? new Date() : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[rst/executor] migration 018 not applied — execution not persisted (', a.clientOrderId, ')');
      return;
    }
    throw err;
  }
}

async function rstLogError(a: {
  signalId?: string;
  stage: 'size' | 'filter' | 'place_entry' | 'place_sl' | 'place_tp' | 'manage' | 'cancel' | 'handshake';
  errorCode?: string;
  errorMsg: string;
}): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1, $2, $3, $4, $5)`,
      [a.signalId ?? null, RST_BROKER, a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000)],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') console.error('[rst/executor] failed to persist error:', err);
  }
}

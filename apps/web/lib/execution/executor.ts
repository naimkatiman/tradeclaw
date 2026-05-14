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
  type RStocksTraderBridge,
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

// ─── R StocksTrader tick ────────────────────────────────────────────────────

const RST_BROKER = 'r-stockstrader';
const RST_H1_LIMIT = 100;

/**
 * Per-asset-class notional cap as % of equity. Callers pass the env var name;
 * defaults are conservative until verified against the demo account's leverage.
 */
function rstNotionalPct(assetClass: string): number {
  const map: Record<string, string> = {
    'crypto-cfd': 'EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT',
    'fx': 'EXEC_FX_PER_TRADE_NOTIONAL_PCT',
    'metal': 'EXEC_FX_PER_TRADE_NOTIONAL_PCT',
    'energy-cfd': 'EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT',
    'us-stock': 'EXEC_STOCK_PER_TRADE_NOTIONAL_PCT',
    'us-etf': 'EXEC_STOCK_PER_TRADE_NOTIONAL_PCT',
    'index-cfd': 'EXEC_STOCK_PER_TRADE_NOTIONAL_PCT',
  };
  const envName = map[assetClass] ?? 'EXEC_FX_PER_TRADE_NOTIONAL_PCT';
  const v = Number(process.env[envName] ?? '100');
  return Number.isFinite(v) && v > 0 ? v : 100;
}

async function runRStocksTraderTick(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    console.error('[pilot/rst] RSTOCKSTRADER_BASE_URL / TOKEN / ACCOUNT_ID not set — tick skipped');
    result.errors++;
    return result;
  }
  const bridge: RStocksTraderBridge = createRStocksTraderBridge(env);

  const signals = await fetchPendingSignals();
  result.processed = signals.length;
  if (signals.length === 0) return result;

  // Prefetch account once per tick
  let account: Awaited<ReturnType<RStocksTraderBridge['getAccountInfo']>>;
  let openPositions: Awaited<ReturnType<RStocksTraderBridge['listOpenPositions']>>;
  let universe: ReadonlySet<string>;
  let openExecutionCount: number;
  try {
    [account, openPositions, universe, openExecutionCount] = await Promise.all([
      bridge.getAccountInfo(),
      bridge.listOpenPositions(),
      getTodayUniverse().then((s) => new Set(s) as ReadonlySet<string>),
      getRstOpenExecutionCount(),
    ]);
  } catch (err) {
    await logRstError({ stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  // Loss kill switch — compare equity to balance; halt if drawdown exceeds daily cap
  const drawdownPct = account.balance > 0 ? ((account.balance - account.equity) / account.balance) * 100 : 0;
  const dailyLossCap = cfgInt('EXEC_DAILY_LOSS_PCT', 5);
  if (drawdownPct > dailyLossCap) {
    result.halted = `daily_loss_cap: drawdown=${drawdownPct.toFixed(2)}% cap=${dailyLossCap}%`;
    console.warn(`[pilot/rst] HALT: ${result.halted}`);
    return result;
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openExecutionCount;
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      const entry = toRStocksTraderSymbol(sig.pair);
      if (!entry) {
        result.filtered++;
        await logRstError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_not_rstockstrader_eligible',
          errorMsg: `${sig.pair} has no R StocksTrader mapping`,
        });
        continue;
      }
      const { symbol, assetClass } = entry;

      if (inTickSymbols.has(symbol)) {
        result.filtered++;
        await logRstError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_already_entered_in_tick',
          errorMsg: `${symbol} already entered earlier in this tick`,
        });
        continue;
      }

      // Universe + concurrency filters. R StocksTrader positions shape is different,
      // so we check open position list directly without BinancePosition typing.
      if (!universe.has(symbol) && !universe.has(sig.pair)) {
        result.filtered++;
        await logRstError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'not_in_universe',
          errorMsg: `${symbol} not in today's universe`,
        });
        continue;
      }
      const hasOpenPosition = openPositions.some((p) => p.symbol === symbol);
      if (hasOpenPosition || liveOpen >= maxPositions) {
        result.filtered++;
        await logRstError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: hasOpenPosition ? 'symbol_has_open_position' : 'max_positions_reached',
          errorMsg: `${symbol} open=${hasOpenPosition} liveOpen=${liveOpen}/${maxPositions}`,
        });
        continue;
      }

      // H1 candles → EMA direction + ADX regime filter
      const candles = await bridge.getCandles(symbol, RST_H1_LIMIT);
      // BinanceKline and RStocksTraderCandle share the same OHLCV fields
      const klinesH1 = candles as unknown as BinanceKline[];
      const filterVerdict = runEntryFilters({
        symbol,
        side: sig.direction,
        todayUniverse: universe,
        concurrencyState: {
          livePositions: [],            // already checked above via openPositions
          openExecutionCount: liveOpen,
          maxPositions,
        },
        klinesH1,
      });
      if (!filterVerdict.passed) {
        result.filtered++;
        await logRstError({
          signalId: sig.id,
          stage: 'filter',
          errorCode: filterVerdict.reason,
          errorMsg: filterVerdict.detail ?? filterVerdict.reason,
        });
        continue;
      }

      // Instrument spec + sizing
      let spec: Awaited<ReturnType<RStocksTraderBridge['getInstrumentSpec']>>;
      try {
        spec = await bridge.getInstrumentSpec(symbol);
      } catch (err) {
        result.rejected++;
        await logRstError({ signalId: sig.id, stage: 'size', errorCode: 'instrument_spec_failed', errorMsg: getMsg(err) });
        continue;
      }

      const atr = sig.entryAtr ?? computeATR(klinesH1);
      if (!atr || atr <= 0) {
        result.rejected++;
        await logRstError({ signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `signal=${sig.id}` });
        continue;
      }

      const riskPct = cfgInt('EXEC_RISK_PCT', 1);
      const notionalPct = rstNotionalPct(assetClass);
      const riskUsdBudget = account.equity * (riskPct / 100);
      const notionalCap = account.equity * (notionalPct / 100);

      const stopDistance = atr * 1.5;
      // Qty in base units: risk / (stop distance per unit in USD)
      // Per unit USD risk = stopDistance * contractSize (for FX: 1 lot = 100k units; stop in price)
      const stopDistanceUsd = stopDistance * spec.contractSize;
      const rawQty = stopDistanceUsd > 0 ? riskUsdBudget / stopDistanceUsd : 0;

      // Notional cap: notional = qty * entryPrice * contractSize (for non-FX)
      // For FX, notional = qty * contractSize * entryPrice (same formula)
      const notionalPerLot = sig.entryPrice * spec.contractSize;
      const notionalCapQty = notionalPerLot > 0 ? notionalCap / notionalPerLot : rawQty;
      const cappedQty = Math.min(rawQty, notionalCapQty);

      // Round DOWN to qtyStep
      const qtyStep = spec.qtyStep > 0 ? spec.qtyStep : 0.01;
      const digits = spec.digits > 0 ? spec.digits : 5;
      const qty = Number((Math.floor(cappedQty / qtyStep) * qtyStep).toFixed(8));

      if (qty < spec.minQty || qty <= 0) {
        result.rejected++;
        await logRstError({
          signalId: sig.id,
          stage: 'size',
          errorCode: 'qty_below_minimum',
          errorMsg: `qty=${qty} minQty=${spec.minQty}`,
        });
        continue;
      }

      // SL / TP prices
      const sideSign = sig.direction === 'BUY' ? 1 : -1;
      const tickSize = spec.tickSize > 0 ? spec.tickSize : Math.pow(10, -digits);
      const roundToTick = (p: number) => Number((Math.round(p / tickSize) * tickSize).toFixed(digits));
      const stopPrice = roundToTick(sig.entryPrice - sideSign * stopDistance);
      const tp1Price = roundToTick(sig.entryPrice + sideSign * stopDistance * 1.5);

      // Min stop distance guard (reject locally before posting)
      if (Math.abs(sig.entryPrice - stopPrice) < spec.minStopDistance) {
        result.rejected++;
        await logRstError({
          signalId: sig.id,
          stage: 'size',
          errorCode: 'stop_too_close',
          errorMsg: `stopDist=${Math.abs(sig.entryPrice - stopPrice)} min=${spec.minStopDistance}`,
        });
        continue;
      }

      const ids = buildClientIds(sig.id);
      const orderResult = await bridge.placeOrder({
        symbol,
        side: sig.direction,
        qty,
        stopLoss: stopPrice,
        takeProfit: tp1Price,
        clientRef: ids.entry,
        comment: `hmm-top3:${sig.id}`,
      });

      if (orderResult.status === 'rejected') {
        result.rejected++;
        await logRstError({
          signalId: sig.id,
          stage: 'place_entry',
          errorCode: 'broker_rejected',
          errorMsg: orderResult.rejectReason ?? 'unknown rejection',
        });
        continue;
      }

      const notionalUsd = qty * notionalPerLot;
      const riskUsdActual = qty * stopDistanceUsd;
      await persistRstExecution({
        signalId: sig.id,
        symbol,
        side: sig.direction,
        qty,
        entryPrice: orderResult.avgFillPrice ?? sig.entryPrice,
        stopPrice,
        tp1Price,
        notionalUsd,
        riskUsd: riskUsdActual,
        clientOrderId: ids.entry,
        exchangeOrderId: orderResult.brokerOrderId || null,
        status: orderResult.status === 'filled' ? 'filled' : 'pending',
        mode: mode === 'live' ? 'live' : 'testnet',
      });

      result.executed++;
      liveOpen++;
      inTickSymbols.add(symbol);

      void notifyEntryFilled({
        signalId: sig.id,
        symbol,
        side: sig.direction,
        qty,
        entryPrice: orderResult.avgFillPrice ?? sig.entryPrice,
        stopPrice,
        tp1Price,
        notionalUsd,
        riskUsd: riskUsdActual,
        leverage: 1,
      });
    } catch (err) {
      result.errors++;
      await logRstError({ signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/rst] tick: ${JSON.stringify(result)}`);
  return result;
}

async function getRstOpenExecutionCount(): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1
          AND status IN ('pending','filled','partially_filled')`,
      [RST_BROKER],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

interface PersistRstExecArgs {
  signalId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  notionalUsd: number;
  riskUsd: number;
  clientOrderId: string;
  exchangeOrderId: string | null;
  status: 'pending' | 'filled';
  mode: 'testnet' | 'live';
}

async function persistRstExecution(a: PersistRstExecArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO executions
        (signal_id, broker, mode, symbol, side, qty, entry_price, stop_price, tp1_price,
         leverage, notional_usd, risk_usd, client_order_id, exchange_order_id, status, filled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (client_order_id) DO NOTHING`,
      [
        a.signalId, RST_BROKER, a.mode, a.symbol, a.side, a.qty,
        a.entryPrice, a.stopPrice, a.tp1Price, 1,  // leverage not applicable for R StocksTrader CFDs
        a.notionalUsd, a.riskUsd, a.clientOrderId, a.exchangeOrderId, a.status,
        a.status === 'filled' ? new Date() : null,
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') {
      console.warn('[pilot/rst] migration 018 not applied — execution not persisted (', a.clientOrderId, ')');
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

async function logRstError(a: RstErrorLogArgs): Promise<void> {
  try {
    await execute(
      `INSERT INTO execution_errors
        (signal_id, broker, stage, error_code, error_msg)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        a.signalId ?? null, RST_BROKER,
        a.stage, a.errorCode ?? null, a.errorMsg.slice(0, 2000),
      ],
    );
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') console.error('[pilot/rst] failed to persist error:', err);
  }
}

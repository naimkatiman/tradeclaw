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
 *
 * Broker dispatch: EXECUTION_BROKER env var selects the active broker.
 *   'binance'         (default) — Binance USDT-M Futures
 *   'r-stockstrader'            — RoboForex R StocksTrader (MetaApi)
 *
 * Per-broker code paths are kept separate — do not introduce a shared
 * abstract broker interface until both paths work end-to-end in production.
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
import { toRStocksTraderSymbol, type RStocksTraderAssetClass } from './rstockstrader-symbols';
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
const BINANCE_BROKER = 'binance-futures';
const RST_BROKER = 'r-stockstrader';
const TP1_FRACTION = 0.5;          // half qty at TP1, runner = the rest
const DEFAULT_ATR_MULTIPLIER = 1.5;
const DEFAULT_TP_R_MULTIPLE = 1.5;

const cfgInt = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const cfgFloat = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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

  // Broker dispatch — per-broker code paths stay separate.
  const broker = (process.env.EXECUTION_BROKER ?? 'binance').toLowerCase().trim();
  if (broker === 'r-stockstrader') {
    return runRStocksTraderExecutorTick(mode, result);
  }

  // Default: Binance USDT-M Futures path

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
      return await runBinanceExecutorTickLocked(mode, result);
    } finally {
      await releaseExecutorLock(lockClient);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BINANCE PATH
// ═══════════════════════════════════════════════════════════════════════════

async function runBinanceExecutorTickLocked(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  // 1. Pull pending signals (broker-scoped join so RST executions don't block)
  const signals = await fetchPendingSignals(BINANCE_BROKER);
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
      getOpenExecutionCount(BINANCE_BROKER),
    ]);
  } catch (err) {
    await logError({ broker: BINANCE_BROKER, stage: 'handshake', errorMsg: getMsg(err) });
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
        broker: BINANCE_BROKER,
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
    result.halted = 'kill_switch_check_failed';
    await logError({ broker: BINANCE_BROKER, stage: 'handshake', errorCode: 'loss_kill_switch_error', errorMsg: getMsg(err) });
    console.error('[pilot/executor] kill switch check failed — halting tick:', getMsg(err));
    return result;
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openExecutionCount;
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
          broker: BINANCE_BROKER,
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
          broker: BINANCE_BROKER,
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
          broker: BINANCE_BROKER,
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
        await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'size', errorCode: 'symbol_not_in_exchange_info', errorMsg: `${sig.pair} (${binancePair})` });
        continue;
      }
      const atr = sig.entryAtr ?? computeATR(klinesH1);
      if (!atr || atr <= 0) {
        result.rejected++;
        await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'size', errorCode: 'atr_unavailable', errorMsg: `signal=${sig.id} pair=${sig.pair}` });
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
        await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'size', errorCode: sizing.reason, errorMsg: sizing.detail });
        continue;
      }

      // 3c. Place bracket.
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
        await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'place_sl', errorMsg: getMsg(err) });
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
            await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'place_tp', errorMsg: getMsg(err) });
            return null;
          })
        : null;

      // 3d. If SL failed but entry filled, cancel entry to avoid naked exposure
      if (entryOrder && !slOrder) {
        try {
          await cancelOrder(binancePair, entryOrder.orderId);
        } catch (err) {
          await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'cancel', errorMsg: getMsg(err) });
        }
        result.rejected++;
        continue;
      }

      // 3e. Persist execution row.
      const status = !entryOrder ? 'pending' : (entryOrder.status?.toLowerCase() ?? 'pending');
      await persistExecution({
        broker: BINANCE_BROKER,
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
      await logError({ broker: BINANCE_BROKER, signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/executor] binance tick: ${JSON.stringify(result)}`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// R STOCKSTRADER PATH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RST sizing — lot-based, using tickValue for USD-risk derivation.
 *
 * Formula: lots = riskUsd / (stopPips * tickValue)
 *   where stopPips = |entry - stop| / tickSize
 *         riskUsd  = equity * EXEC_RISK_PCT / 100
 *
 * This is the canonical MetaTrader lot-sizing formula and works correctly
 * for all asset classes (FX, metals, CFDs) because `tickValue` is already
 * in the account currency.
 *
 * The notional cap (EXEC_FX_PER_TRADE_NOTIONAL_PCT etc.) is applied after
 * risk-first sizing as a secondary safety limit.
 */
interface RSTSizingInput {
  side: OrderSide;
  entryPrice: number;
  atr: number;
  equityUsd: number;
  spec: RStocksTraderInstrumentSpec;
  assetClass: RStocksTraderAssetClass;
}

interface RSTSizingOk {
  ok: true;
  lots: number;
  stopPrice: number;
  tp1Price: number;
  riskUsd: number;
  notionalUsd: number;
}

interface RSTSizingFail {
  ok: false;
  reason: string;
  detail: string;
}

function computeRSTLots(input: RSTSizingInput): RSTSizingOk | RSTSizingFail {
  const riskPct = cfgFloat('EXEC_RISK_PCT', 1);
  const atrMult = DEFAULT_ATR_MULTIPLIER;
  const tpR = DEFAULT_TP_R_MULTIPLE;

  if (input.atr <= 0 || input.entryPrice <= 0 || input.equityUsd <= 0) {
    return { ok: false, reason: 'invalid_input', detail: `atr=${input.atr} entry=${input.entryPrice} equity=${input.equityUsd}` };
  }

  const stopDistance = input.atr * atrMult;
  const rawStopPrice = input.side === 'BUY'
    ? input.entryPrice - stopDistance
    : input.entryPrice + stopDistance;
  const rawTp1Price = input.side === 'BUY'
    ? input.entryPrice + stopDistance * tpR
    : input.entryPrice - stopDistance * tpR;

  if (input.spec.minStopDistance > 0 && stopDistance < input.spec.minStopDistance) {
    return {
      ok: false,
      reason: 'stop_too_close',
      detail: `stopDistance=${stopDistance} minStopDistance=${input.spec.minStopDistance}`,
    };
  }

  // Risk-first lot sizing via tickValue
  const stopPips = stopDistance / input.spec.tickSize;
  const riskPerLot = stopPips * input.spec.tickValue;
  if (riskPerLot <= 0) {
    return { ok: false, reason: 'invalid_tick_value', detail: `tickValue=${input.spec.tickValue} tickSize=${input.spec.tickSize}` };
  }

  const riskBudget = input.equityUsd * (riskPct / 100);
  let lots = riskBudget / riskPerLot;

  // Notional cap per asset class (secondary safety limit)
  const notionalPct = rstNotionalPct(input.assetClass);
  const notionalCap = input.equityUsd * (notionalPct / 100);
  const notionalUnrounded = lots * input.spec.contractSize * input.entryPrice;
  if (notionalUnrounded > notionalCap) {
    lots = notionalCap / (input.spec.contractSize * input.entryPrice);
  }

  // Round DOWN to qtyStep
  lots = Math.floor(lots / input.spec.qtyStep) * input.spec.qtyStep;
  lots = Number(lots.toFixed(2));

  if (lots <= 0 || lots < input.spec.minQty) {
    return { ok: false, reason: 'below_min_qty', detail: `lots=${lots} minQty=${input.spec.minQty}` };
  }

  const roundToTick = (p: number) =>
    Number((Math.round(p / input.spec.tickSize) * input.spec.tickSize).toFixed(input.spec.digits));

  return {
    ok: true,
    lots,
    stopPrice: roundToTick(rawStopPrice),
    tp1Price: roundToTick(rawTp1Price),
    riskUsd: lots * riskPerLot,
    notionalUsd: lots * input.spec.contractSize * input.entryPrice,
  };
}

function rstNotionalPct(assetClass: RStocksTraderAssetClass): number {
  const raw =
    assetClass === 'fx' || assetClass === 'metal'
      ? process.env.EXEC_FX_PER_TRADE_NOTIONAL_PCT
      : assetClass === 'us-stock' || assetClass === 'us-etf' || assetClass === 'index-cfd'
      ? process.env.EXEC_STOCK_PER_TRADE_NOTIONAL_PCT
      : process.env.EXEC_CRYPTO_CFD_PER_TRADE_NOTIONAL_PCT;
  const n = Number(raw ?? '100');
  return Number.isFinite(n) && n > 0 ? n : 100;
}

async function runRStocksTraderExecutorTick(
  mode: ReturnType<typeof currentMode>,
  result: ExecutorTickResult,
): Promise<ExecutorTickResult> {
  const env = readRStocksTraderEnvOrNull();
  if (!env) {
    result.errors++;
    await logError({
      broker: RST_BROKER,
      stage: 'handshake',
      errorMsg: 'RSTOCKSTRADER_BASE_URL / TOKEN / ACCOUNT_ID missing — cannot start RST tick',
    });
    console.error('[pilot/executor] r-stockstrader env vars missing');
    return result;
  }

  const bridge = createRStocksTraderBridge(env);

  const signals = await fetchPendingSignals(RST_BROKER);
  result.processed = signals.length;
  if (signals.length === 0) return result;

  let accountInfo;
  let openCount: number;
  let openPositions;
  try {
    [accountInfo, openCount, openPositions] = await Promise.all([
      bridge.getAccountInfo(),
      getOpenExecutionCount(RST_BROKER),
      bridge.listOpenPositions(),
    ]);
  } catch (err) {
    await logError({ broker: RST_BROKER, stage: 'handshake', errorMsg: getMsg(err) });
    result.errors++;
    return result;
  }

  const maxPositions = cfgInt('EXEC_MAX_POSITIONS', 4);
  let liveOpen = openCount;
  // Symbols opened in this tick — prevents double-entry on same symbol when
  // account state was snapshotted before this tick started.
  const inTickSymbols = new Set<string>();

  for (const sig of signals) {
    try {
      // Map TwelveData canonical pair → RST symbol
      const rstEntry = toRStocksTraderSymbol(sig.pair);
      if (!rstEntry) {
        result.filtered++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_not_rstockstrader_eligible',
          errorMsg: `${sig.pair} has no R StocksTrader mapping`,
        });
        continue;
      }

      const rstSymbol = rstEntry.symbol;

      if (inTickSymbols.has(rstSymbol)) {
        result.filtered++;
        continue;
      }

      // Concurrency: reject if already have a live RST position on this symbol
      if (openPositions.some((p) => p.symbol === rstSymbol)) {
        result.filtered++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'symbol_has_open_position',
          errorMsg: `${rstSymbol} already open on RST`,
        });
        continue;
      }

      if (liveOpen >= maxPositions) {
        result.filtered++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'filter',
          errorCode: 'max_positions_reached',
          errorMsg: `open=${liveOpen} >= max=${maxPositions}`,
        });
        break;
      }

      // ATR — required for sizing; RST has no kline source so we rely on the
      // value written by the signal generator at signal time.
      const atr = sig.entryAtr;
      if (!atr || atr <= 0) {
        result.rejected++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'size',
          errorCode: 'atr_unavailable',
          errorMsg: `entry_atr null/zero for signal=${sig.id} pair=${sig.pair}`,
        });
        continue;
      }

      // Instrument spec (cached 1h)
      let spec: RStocksTraderInstrumentSpec;
      try {
        spec = await bridge.getInstrumentSpec(rstSymbol);
        // Overlay the asset class from our symbol map (MetaApi spec doesn't include it)
        spec = { ...spec, assetClass: rstEntry.assetClass };
      } catch (err) {
        result.rejected++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'size',
          errorCode: 'instrument_spec_failed',
          errorMsg: getMsg(err),
        });
        continue;
      }

      // Sizing
      const sizing = computeRSTLots({
        side: sig.direction,
        entryPrice: sig.entryPrice,
        atr,
        equityUsd: accountInfo.equity,
        spec,
        assetClass: rstEntry.assetClass,
      });
      if (!sizing.ok) {
        result.rejected++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'size',
          errorCode: sizing.reason,
          errorMsg: sizing.detail,
        });
        continue;
      }

      // Place bracket order (entry + attached SL + TP in one call)
      const clientRef = buildClientIds(sig.id).entry;
      let placeResult;
      try {
        placeResult = await bridge.placeOrder({
          symbol: rstSymbol,
          side: sig.direction,
          type: 'MARKET',
          qty: sizing.lots,
          stopLoss: sizing.stopPrice,
          takeProfit: sizing.tp1Price,
          clientRef,
          comment: `TC:${sig.id.slice(0, 8)}`,
        });
      } catch (err) {
        result.errors++;
        await logError({ broker: RST_BROKER, signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
        continue;
      }

      if (placeResult.status === 'rejected') {
        result.rejected++;
        await logError({
          broker: RST_BROKER,
          signalId: sig.id,
          stage: 'place_entry',
          errorCode: 'broker_rejected',
          errorMsg: placeResult.rejectReason ?? 'broker rejected order',
        });
        continue;
      }

      // Persist to executions (leverage=1 for RST; margin is implicit)
      await persistExecution({
        broker: RST_BROKER,
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
        clientOrderId: clientRef,
        exchangeOrderId: placeResult.brokerOrderId,
        status: placeResult.status === 'filled' ? 'filled' : 'pending',
        slOrderId: null,
        tpOrderId: null,
        mode: 'testnet', // RST demo accounts are always testnet for Phase 2
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
      await logError({ broker: RST_BROKER, signalId: sig.id, stage: 'place_entry', errorMsg: getMsg(err) });
    }
  }

  console.log(`[pilot/executor] r-stockstrader tick: ${JSON.stringify(result)}`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Concurrency helpers ──────────────────────────────────────────────

async function tryAcquireExecutorLock(client: PoolClient): Promise<boolean> {
  try {
    const r = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS acquired`,
      [ADVISORY_LOCK_KEY],
    );
    return r.rows[0]?.acquired === true;
  } catch (err) {
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

/**
 * Fetch pending signals not yet executed by `broker`. The JOIN is
 * broker-scoped so Binance and RST executions are independent — a signal
 * executed on Binance won't block RST from also trading it (and vice versa).
 */
async function fetchPendingSignals(broker: string): Promise<PendingSignal[]> {
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
         LEFT JOIN executions e ON e.signal_id = sh.id AND e.broker = $3
        WHERE sh.strategy_id = $1
          AND sh.created_at > NOW() - ($2 || ' minutes')::INTERVAL
          AND (sh.gate_blocked IS NULL OR sh.gate_blocked = FALSE)
          AND e.id IS NULL
        ORDER BY sh.created_at ASC
        LIMIT 50`,
      [STRATEGY_ID, String(SIGNAL_LOOKBACK_MINUTES), broker],
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
      console.warn('[pilot/executor] schema not ready — skipping tick');
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

async function getOpenExecutionCount(broker: string): Promise<number> {
  try {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::TEXT AS n FROM executions
        WHERE broker = $1
          AND status IN ('pending','filled','partially_filled')`,
      [broker],
    );
    return rows.length > 0 ? Number(rows[0].n) : 0;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === '42P01') return 0;
    throw err;
  }
}

interface PersistExecArgs {
  broker: string;
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
        a.signalId, a.broker, a.mode, a.symbol, a.side, a.qty,
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
  broker: string;
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
        a.signalId ?? null, a.executionId ?? null, a.broker,
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

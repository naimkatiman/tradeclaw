/**
 * Position sizing — pure math.
 *
 * Risk-first sizing: stop distance comes from ATR, position size derived
 * from desired risk in USD divided by per-unit risk. Hard caps on:
 *   - leverage (env: EXEC_MAX_LEVERAGE)
 *   - per-trade notional as % of equity (env: EXEC_PER_TRADE_NOTIONAL_PCT)
 *   - Binance LOT_SIZE / PRICE_FILTER / MIN_NOTIONAL filters
 *
 * Plan: docs/plans/2026-05-01-tradeclaw-pilot-binance-futures.md
 */

import { ATR } from 'trading-signals';
import type { BinanceKline, OrderSide } from './binance-futures';

// ─── ATR ─────────────────────────────────────────────────────────────────

export const DEFAULT_ATR_PERIOD = 14;
export const DEFAULT_ATR_MULTIPLIER = 1.5;
export const DEFAULT_TP_R_MULTIPLE = 1.5;

/**
 * Wilder ATR over the last `period` candles. Returns the most recent ATR
 * value, or null if there are not enough candles.
 */
export function computeATR(klines: BinanceKline[], period = DEFAULT_ATR_PERIOD): number | null {
  if (klines.length < period + 1) return null;
  const indicator = new ATR(period);
  for (const k of klines) {
    indicator.update({ high: k.high, low: k.low, close: k.close }, false);
  }
  const result = indicator.getResult();
  if (result === null || result === undefined) return null;
  return Number(result);
}

// ─── Symbol filters (LOT_SIZE / PRICE_FILTER / MIN_NOTIONAL) ────────────

export interface SymbolFilters {
  stepSize: number;       // LOT_SIZE: qty must be a multiple of this
  tickSize: number;       // PRICE_FILTER: price must be a multiple of this
  minQty: number;         // LOT_SIZE.minQty
  minNotional: number;    // MIN_NOTIONAL.notional
  quantityPrecision: number;
  pricePrecision: number;
}

interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters: Array<Record<string, unknown>>;
}

export function extractFilters(symbolInfo: ExchangeInfoSymbol): SymbolFilters {
  const lotSize = symbolInfo.filters.find((f) => f.filterType === 'LOT_SIZE') as Record<string, string> | undefined;
  const priceFilter = symbolInfo.filters.find((f) => f.filterType === 'PRICE_FILTER') as Record<string, string> | undefined;
  const minNotional = symbolInfo.filters.find((f) => f.filterType === 'MIN_NOTIONAL') as Record<string, string> | undefined;

  return {
    stepSize: lotSize ? Number(lotSize.stepSize) : 0,
    tickSize: priceFilter ? Number(priceFilter.tickSize) : 0,
    minQty: lotSize ? Number(lotSize.minQty) : 0,
    minNotional: minNotional ? Number(minNotional.notional) : 5, // futures default
    quantityPrecision: symbolInfo.quantityPrecision,
    pricePrecision: symbolInfo.pricePrecision,
  };
}

// ─── Rounding ────────────────────────────────────────────────────────────

/** Round qty DOWN to the nearest stepSize multiple, then to quantityPrecision. */
export function roundQty(qty: number, filters: SymbolFilters): number {
  if (filters.stepSize <= 0) return Number(qty.toFixed(filters.quantityPrecision));
  const stepped = Math.floor(qty / filters.stepSize) * filters.stepSize;
  return Number(stepped.toFixed(filters.quantityPrecision));
}

/** Round price to the nearest tickSize multiple, then to pricePrecision. */
export function roundPrice(price: number, filters: SymbolFilters): number {
  if (filters.tickSize <= 0) return Number(price.toFixed(filters.pricePrecision));
  const ticked = Math.round(price / filters.tickSize) * filters.tickSize;
  return Number(ticked.toFixed(filters.pricePrecision));
}

// ─── Sizing ──────────────────────────────────────────────────────────────

export interface SizingInput {
  side: OrderSide;
  entryPrice: number;
  atr: number;
  equityUsd: number;
  filters: SymbolFilters;
  riskPct?: number;                    // default from env EXEC_RISK_PCT
  perTradeNotionalPct?: number;        // default from env EXEC_PER_TRADE_NOTIONAL_PCT
  maxLeverage?: number;                // default from env EXEC_MAX_LEVERAGE
  atrMultiplier?: number;              // stop = atr * mult
  tpRMultiple?: number;                // tp1 = stop * mult
}

export interface SizingResult {
  ok: true;
  qty: number;
  notionalUsd: number;
  leverage: number;
  riskUsd: number;
  stopDistance: number;
  stopPrice: number;
  tp1Price: number;
}

export interface SizingRejection {
  ok: false;
  reason: 'qty_zero' | 'below_min_notional' | 'below_min_qty' | 'invalid_input';
  detail: string;
}

const cfgFromEnv = (name: string, fallback: number): number => {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function computeSize(input: SizingInput): SizingResult | SizingRejection {
  const riskPct = input.riskPct ?? cfgFromEnv('EXEC_RISK_PCT', 1);
  const notionalPct = input.perTradeNotionalPct ?? cfgFromEnv('EXEC_PER_TRADE_NOTIONAL_PCT', 25);
  const maxLeverage = Math.floor(input.maxLeverage ?? cfgFromEnv('EXEC_MAX_LEVERAGE', 5));
  const atrMult = input.atrMultiplier ?? DEFAULT_ATR_MULTIPLIER;
  const tpR = input.tpRMultiple ?? DEFAULT_TP_R_MULTIPLE;

  if (input.atr <= 0 || input.entryPrice <= 0 || input.equityUsd <= 0) {
    return { ok: false, reason: 'invalid_input', detail: `atr=${input.atr} entry=${input.entryPrice} equity=${input.equityUsd}` };
  }

  const stopDistance = input.atr * atrMult;
  const riskUsdBudget = input.equityUsd * (riskPct / 100);
  const notionalCap = input.equityUsd * (notionalPct / 100);

  // Risk-derived notional: lose riskUsdBudget if price moves stopDistance from entry
  const notionalFromRisk = (riskUsdBudget * input.entryPrice) / stopDistance;
  const notionalTarget = Math.min(notionalFromRisk, notionalCap);

  // Round qty down to stepSize
  const rawQty = notionalTarget / input.entryPrice;
  let qty = roundQty(rawQty, input.filters);

  if (qty <= 0) {
    return { ok: false, reason: 'qty_zero', detail: `rawQty=${rawQty} stepSize=${input.filters.stepSize}` };
  }
  if (qty < input.filters.minQty) {
    return { ok: false, reason: 'below_min_qty', detail: `qty=${qty} minQty=${input.filters.minQty}` };
  }

  const notionalActual = qty * input.entryPrice;
  if (notionalActual < input.filters.minNotional) {
    return { ok: false, reason: 'below_min_notional', detail: `notional=${notionalActual} minNotional=${input.filters.minNotional}` };
  }

  const stopPriceRaw = input.side === 'BUY' ? input.entryPrice - stopDistance : input.entryPrice + stopDistance;
  const tp1PriceRaw = input.side === 'BUY' ? input.entryPrice + stopDistance * tpR : input.entryPrice - stopDistance * tpR;

  const stopPrice = roundPrice(stopPriceRaw, input.filters);
  const tp1Price = roundPrice(tp1PriceRaw, input.filters);

  // Actual risk after rounding
  const realStopDistance = Math.abs(input.entryPrice - stopPrice);
  const riskUsdActual = qty * realStopDistance;

  return {
    ok: true,
    qty,
    notionalUsd: notionalActual,
    leverage: maxLeverage,
    riskUsd: riskUsdActual,
    stopDistance: realStopDistance,
    stopPrice,
    tp1Price,
  };
}

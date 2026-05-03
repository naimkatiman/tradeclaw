/**
 * Pure-function tests for sizing math. No network, no DB.
 *
 * Covers: ATR computation, qty rounding, leverage cap, min-notional reject,
 * BUY/SELL stop+TP geometry, and the rounding-after-floor behavior that
 * caused the partial-entry breakeven bug to surface in position-manager.
 */

import type { BinanceKline } from './binance-futures';
import {
  computeATR,
  computeSize,
  extractFilters,
  roundPrice,
  roundQty,
  type SymbolFilters,
} from './sizing';

const FILTERS: SymbolFilters = {
  stepSize: 0.001,
  tickSize: 0.01,
  minQty: 0.001,
  minNotional: 5,
  quantityPrecision: 3,
  pricePrecision: 2,
};

function k(open: number, high: number, low: number, close: number): BinanceKline {
  return { openTime: 0, open, high, low, close, volume: 0, closeTime: 0 };
}

describe('computeATR', () => {
  test('returns null when not enough candles', () => {
    expect(computeATR([k(1, 2, 0.5, 1.5)], 14)).toBeNull();
  });

  test('returns a positive number for a 15-candle series', () => {
    const series: BinanceKline[] = [];
    for (let i = 0; i < 20; i++) {
      series.push(k(100 + i, 102 + i, 99 + i, 101 + i));
    }
    const atr = computeATR(series, 14);
    expect(atr).not.toBeNull();
    expect(atr!).toBeGreaterThan(0);
  });
});

describe('roundQty / roundPrice', () => {
  test('roundQty floors to stepSize multiple', () => {
    expect(roundQty(0.0019, FILTERS)).toBe(0.001);
    expect(roundQty(0.0021, FILTERS)).toBe(0.002);
  });

  test('roundQty handles zero stepSize as plain precision rounding', () => {
    const f: SymbolFilters = { ...FILTERS, stepSize: 0 };
    expect(roundQty(0.123456, f)).toBe(0.123);
  });

  test('roundPrice rounds to nearest tick (NOT floor — important for SL/TP)', () => {
    expect(roundPrice(100.014, FILTERS)).toBe(100.01);
    expect(roundPrice(100.016, FILTERS)).toBe(100.02);
  });
});

describe('extractFilters', () => {
  test('reads LOT_SIZE / PRICE_FILTER / MIN_NOTIONAL', () => {
    const out = extractFilters({
      symbol: 'BTCUSDT',
      status: 'TRADING',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      filters: [
        { filterType: 'LOT_SIZE', stepSize: '0.001', minQty: '0.001' },
        { filterType: 'PRICE_FILTER', tickSize: '0.10' },
        { filterType: 'MIN_NOTIONAL', notional: '10' },
      ],
    });
    expect(out.stepSize).toBe(0.001);
    expect(out.tickSize).toBe(0.1);
    expect(out.minQty).toBe(0.001);
    expect(out.minNotional).toBe(10);
  });

  test('falls back to minNotional=5 (futures default) when filter missing', () => {
    const out = extractFilters({
      symbol: 'X',
      status: 'TRADING',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      filters: [],
    });
    expect(out.minNotional).toBe(5);
  });
});

describe('computeSize — happy path', () => {
  test('LONG: stop below entry, tp above, qty respects step', () => {
    const r = computeSize({
      side: 'BUY',
      entryPrice: 100,
      atr: 2,
      equityUsd: 1000,
      filters: FILTERS,
      riskPct: 1,                       // $10 risk
      perTradeNotionalPct: 25,          // $250 cap
      maxLeverage: 5,
      atrMultiplier: 1.5,               // stop = $3 away
      tpRMultiple: 1.5,                 // tp = $4.50 above entry
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stopPrice).toBeLessThan(100);
    expect(r.tp1Price).toBeGreaterThan(100);
    // Float-safe "qty is an integer multiple of stepSize" check.
    const steps = r.qty / FILTERS.stepSize;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    // Notional capped at 25% of equity = $250 well below risk-derived
    // $10*100/$3 ≈ $333, so the cap binds.
    expect(r.notionalUsd).toBeLessThanOrEqual(250 + 1e-6);
    expect(r.leverage).toBe(5);
  });

  test('SHORT: stop above entry, tp below', () => {
    const r = computeSize({
      side: 'SELL',
      entryPrice: 100,
      atr: 2,
      equityUsd: 1000,
      filters: FILTERS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stopPrice).toBeGreaterThan(100);
    expect(r.tp1Price).toBeLessThan(100);
  });
});

describe('computeSize — rejection paths', () => {
  test('invalid_input: zero equity', () => {
    const r = computeSize({
      side: 'BUY', entryPrice: 100, atr: 2, equityUsd: 0, filters: FILTERS,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('invalid_input');
  });

  test('invalid_input: zero ATR', () => {
    const r = computeSize({
      side: 'BUY', entryPrice: 100, atr: 0, equityUsd: 1000, filters: FILTERS,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('invalid_input');
  });

  test('below_min_notional: tiny equity ends up under min', () => {
    const f: SymbolFilters = { ...FILTERS, minNotional: 1000 };
    const r = computeSize({
      side: 'BUY', entryPrice: 100, atr: 2, equityUsd: 100, filters: f,
      riskPct: 1, perTradeNotionalPct: 25,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('below_min_notional');
  });

  test('qty_zero: stepSize larger than required qty', () => {
    const f: SymbolFilters = { ...FILTERS, stepSize: 1, minQty: 1 };
    const r = computeSize({
      side: 'BUY', entryPrice: 1000, atr: 50, equityUsd: 100, filters: f,
      riskPct: 1, perTradeNotionalPct: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(['qty_zero', 'below_min_qty']).toContain(r.reason);
  });
});

describe('computeSize — leverage cap binds', () => {
  test('riskPct large enough to imply >5x stays capped at 5x', () => {
    const r = computeSize({
      side: 'BUY',
      entryPrice: 100,
      atr: 0.5,                         // tight stop = high notional
      equityUsd: 1000,
      filters: FILTERS,
      riskPct: 1,
      perTradeNotionalPct: 200,         // disable notional cap
      maxLeverage: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.leverage).toBe(5);
  });
});

describe('computeSize — risk after rounding', () => {
  test('actual riskUsd derived from rounded stop, not raw', () => {
    const r = computeSize({
      side: 'BUY',
      entryPrice: 100,
      atr: 2,
      equityUsd: 1000,
      filters: FILTERS,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const expected = r.qty * Math.abs(100 - r.stopPrice);
    expect(r.riskUsd).toBeCloseTo(expected, 6);
  });
});

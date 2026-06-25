/**
 * Cost-model + geometry options on runBacktest (engine-makeover Phase 2).
 * The no-options path must stay byte-identical to legacy behavior — that is
 * pinned by the existing suite + integration snapshot. These tests pin the
 * opt-in paths.
 */

import { runBacktest } from '../run-backtest';
import { CRYPTO_PERP_COSTS, LIVE_GEOMETRY, ZERO_COSTS } from '../backtest-options';
import type { Strategy } from '../types';
import type { OHLCV } from '@tradeclaw/core';

/** Strategy stub that fires exactly one BUY at the given bar. */
function oneShotStrategy(barIndex: number, price: number): Strategy {
  return {
    id: 'classic',
    name: 'one-shot',
    description: 'test stub',
    entry: {
      id: 'one-shot',
      generateSignals: () => [{ barIndex, direction: 'BUY', price, confidence: 0.8 }],
    },
    allocation: { kind: 'flat' },
    risk: { kind: 'none' },
  };
}

/** Flat candles at `price` with controlled excursions. */
function flatCandles(n: number, price: number): OHLCV[] {
  return Array.from({ length: n }, (_, i) => ({
    timestamp: 1_700_000_000_000 + i * 3_600_000,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 1,
  }));
}

describe('runBacktest cost model', () => {
  it('charges fees + slippage + funding against an otherwise-identical trade', () => {
    // 100 flat bars at 100; bar 30 fires BUY; bar 35 spikes to TP (fixed 2%).
    const candles = flatCandles(100, 100);
    candles[35] = { ...candles[35], high: 102.5 };
    const strategy = oneShotStrategy(30, 100);

    const free = runBacktest(candles, strategy);
    const costed = runBacktest(candles, strategy, { costs: CRYPTO_PERP_COSTS, barHours: 1 });

    expect(free.totalTrades).toBe(1);
    expect(costed.totalTrades).toBe(1);
    expect(free.trades[0].exitReason).toBe('TP');
    expect(costed.trades[0].exitReason).toBe('TP');

    // Held 5 bars (entry bar 30 → exit bar 35) = 5h → funding 0.01 * 5/8.
    const expectedCostPct = 2 * 0.05 + 2 * 0.15 + 0.01 * (5 / 8);
    expect(costed.trades[0].costPct).toBeCloseTo(expectedCostPct, 4);
    expect(costed.trades[0].pnlPct).toBeCloseTo(free.trades[0].pnlPct - expectedCostPct / 100, 8);
    expect(costed.endBalance).toBeLessThan(free.endBalance);
    // The free run carries no costPct field (snapshot back-compat).
    expect(free.trades[0].costPct).toBeUndefined();
  });

  it('ZERO_COSTS produces identical numbers to no options (explicit zero is still opt-in metadata)', () => {
    const candles = flatCandles(100, 100);
    candles[35] = { ...candles[35], high: 102.5 };
    const strategy = oneShotStrategy(30, 100);

    const free = runBacktest(candles, strategy);
    const zero = runBacktest(candles, strategy, { costs: ZERO_COSTS });

    expect(zero.trades[0].pnlPct).toBeCloseTo(free.trades[0].pnlPct, 12);
    expect(zero.trades[0].costPct).toBe(0);
    expect(zero.endBalance).toBeCloseTo(free.endBalance, 8);
  });

  it('costs can flip a small gross winner into a net loser', () => {
    // TP at 0.2% gross — under crypto costs (0.4%+ round trip) this is a net loss.
    const candles = flatCandles(100, 100);
    candles[32] = { ...candles[32], high: 100.5 };
    const strategy = oneShotStrategy(30, 100);

    const free = runBacktest(candles, strategy, { geometry: { mode: 'fixed', tpPct: 0.002, slPct: 0.01 } });
    const costed = runBacktest(candles, strategy, {
      geometry: { mode: 'fixed', tpPct: 0.002, slPct: 0.01 },
      costs: CRYPTO_PERP_COSTS,
    });

    expect(free.trades[0].win).toBe(true);
    expect(costed.trades[0].win).toBe(false);
  });
});

describe('runBacktest ATR (live) geometry', () => {
  it('places stops at slMult × ATR and targets at tpRMultiple × risk', () => {
    // Constant true range of 2 (high-low) on every bar → ATR(14) = 2.
    const price = 100;
    const candles: OHLCV[] = Array.from({ length: 120 }, (_, i) => ({
      timestamp: 1_700_000_000_000 + i * 3_600_000,
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1,
    }));
    // Risk = 2.5 * 2 = 5 → SL 95, TP (2R) 110. Bar 60 wicks to 110.5 → TP.
    candles[60] = { ...candles[60], high: 110.5 };
    const strategy = oneShotStrategy(50, price);

    const result = runBacktest(candles, strategy, { geometry: LIVE_GEOMETRY });

    expect(result.totalTrades).toBe(1);
    expect(result.trades[0].exitReason).toBe('TP');
    expect(result.trades[0].exit).toBeCloseTo(110, 8);
    expect(result.trades[0].pnlPct).toBeCloseTo(0.10, 8);
  });

  it('skips signals inside the ATR warmup window instead of trading blind', () => {
    const candles = flatCandles(60, 100);
    const strategy = oneShotStrategy(5, 100); // bar 5 < period 14

    const result = runBacktest(candles, strategy, { geometry: LIVE_GEOMETRY });

    expect(result.totalTrades).toBe(0);
    expect(result.reason).toBe('no-signals');
  });
});

describe('runBacktest review-fix regressions', () => {
  it('charges nothing on a zero-duration last-bar trade', () => {
    const candles = flatCandles(50, 100);
    const strategy = oneShotStrategy(49, 100); // final bar — exit loop never runs

    const result = runBacktest(candles, strategy, { costs: CRYPTO_PERP_COSTS });

    expect(result.totalTrades).toBe(1);
    expect(result.trades[0].costPct).toBe(0);
    expect(result.trades[0].pnlPct).toBe(0);
    expect(result.endBalance).toBe(result.startBalance);
  });

  it('threads options.context through to the entry module (regime models resolve by symbol)', () => {
    const seen: Array<{ symbol: string; timeframe: string }> = [];
    const strategy: Strategy = {
      id: 'classic',
      name: 'ctx-probe',
      description: 'test stub',
      entry: {
        id: 'ctx-probe',
        generateSignals: (_c, ctx) => { seen.push(ctx); return []; },
      },
      allocation: { kind: 'flat' },
      risk: { kind: 'none' },
    };

    runBacktest(flatCandles(30, 100), strategy);
    runBacktest(flatCandles(30, 100), strategy, { context: { symbol: 'BTCUSD', timeframe: 'H4' } });

    expect(seen[0]).toEqual({ symbol: 'BACKTEST', timeframe: 'H1' });
    expect(seen[1]).toEqual({ symbol: 'BTCUSD', timeframe: 'H4' });
  });
});

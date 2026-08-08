import type { OHLCV } from '@tradeclaw/core';
import {
  D1_SLOW_GATE_MAX_COST_R,
  D1_SLOW_GATE_STOP_FLOOR_PCT,
  maxRollingDirectionChanges,
  runD1SlowGate,
} from '../d1-slow-gate';

const DAY_MS = 86_400_000;
const START = Date.parse('2020-01-01T00:00:00Z');

function candlesFromCloses(
  closes: number[],
  overrides: Record<number, Partial<OHLCV>> = {},
): OHLCV[] {
  return closes.map((close, index) => ({
    timestamp: START + index * DAY_MS,
    open: close,
    high: close + 0.1,
    low: close - 0.1,
    close,
    volume: 1,
    ...overrides[index],
  }));
}

const CTX = { symbol: 'BTCUSD', timeframe: 'D1' } as const;

describe('runD1SlowGate', () => {
  it('fails closed outside the approved BTC/ETH D1 universe', () => {
    const candles = candlesFromCloses(Array.from({ length: 220 }, () => 100));

    expect(() => runD1SlowGate(candles, { symbol: 'SOLUSD', timeframe: 'D1' }))
      .toThrow('unsupported symbol');
    expect(() => runD1SlowGate(candles, { symbol: 'BTCUSD', timeframe: 'H4' }))
      .toThrow('requires D1');
  });

  it('rejects malformed or non-chronological candles before computing a signal', () => {
    const malformed = candlesFromCloses(Array.from({ length: 220 }, () => 100));
    malformed[10] = { ...malformed[10], low: 101, high: 99 };
    expect(() => runD1SlowGate(malformed, CTX)).toThrow('invalid OHLC range');

    const duplicate = candlesFromCloses(Array.from({ length: 220 }, () => 100));
    duplicate[20] = { ...duplicate[20], timestamp: duplicate[19].timestamp };
    expect(() => runD1SlowGate(duplicate, CTX)).toThrow('strictly increasing');
  });

  it('stays flat through EMA200 warmup, then emits long and flat transitions only', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
      90,
    ];
    const run = runD1SlowGate(candlesFromCloses(closes), CTX);

    expect(run.transitions.map((t) => t.action)).toEqual([
      'ENTER_LONG',
      'EXIT_STOP',
    ]);
    expect(run.transitions[0]).toEqual(expect.objectContaining({
      barIndex: 199,
      direction: 'BUY',
      state: 'LONG',
    }));
    expect(run.transitions[1]).toEqual(expect.objectContaining({
      barIndex: 200,
      direction: 'SELL',
      state: 'FLAT',
    }));
    expect(run.exposure.slice(0, 199).every((value) => value === 0)).toBe(true);
  });

  it('derives a stop floor that keeps production round-trip cost at or below 0.10R', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
    ];
    const run = runD1SlowGate(candlesFromCloses(closes), CTX);
    const entry = run.transitions[0];

    expect(entry.action).toBe('ENTER_LONG');
    expect(entry.stopDistance).toBeCloseTo(entry.price * D1_SLOW_GATE_STOP_FLOOR_PCT, 10);
    expect(entry.stopLoss).toBeCloseTo(entry.price - entry.stopDistance!, 10);
    expect(entry.costR).toBeLessThanOrEqual(D1_SLOW_GATE_MAX_COST_R + 1e-12);
    expect(entry.atrMultiplier).toBeGreaterThanOrEqual(2.5);
  });

  it('uses the wider ATR stop when ATR14x2.5 exceeds the cost-derived floor', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
    ];
    const candles = candlesFromCloses(
      closes,
      Object.fromEntries(closes.map((close, index) => [index, { high: close + 10, low: close - 10 }])),
    );
    const entry = runD1SlowGate(candles, CTX).transitions[0];

    expect(entry.entryAtr).toBeCloseTo(20, 10);
    expect(entry.stopDistance).toBeCloseTo(50, 10);
    expect(entry.atrMultiplier).toBeCloseTo(2.5, 10);
    expect(entry.costR).toBeLessThan(D1_SLOW_GATE_MAX_COST_R);
  });

  it('fills a stop gap at the bar open and waits for a flat-then-long cycle before re-entry', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
      120,
      121,
      80,
      130,
    ];
    const candles = candlesFromCloses(closes, {
      200: { open: 100, low: 99, high: 121, close: 120 },
    });
    const run = runD1SlowGate(candles, CTX);

    expect(run.transitions.map((t) => t.action)).toEqual([
      'ENTER_LONG',
      'EXIT_STOP',
      'ENTER_LONG',
    ]);
    expect(run.transitions[1].price).toBe(100);
    expect(run.transitions[1].reason).toBe('d1-slow-gate-stop-exit');
    expect(run.transitions[2].barIndex).toBe(203);
  });

  it('counts emitted entries and exits in the rolling cap and fails the gate when exceeded', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
      90,
      110,
    ];
    const run = runD1SlowGate(candlesFromCloses(closes), CTX, {
      maxDirectionChanges: 2,
    });

    expect(run.transitions).toHaveLength(3);
    expect(run.maxRollingDirectionChanges).toBe(3);
    expect(run.frequencyCapPassed).toBe(false);
    expect(maxRollingDirectionChanges(run.transitions, 365 * DAY_MS)).toBe(3);
  });

  it('is prefix-invariant: future candles cannot rewrite earlier transitions or equity', () => {
    const closes = [
      ...Array.from({ length: 199 }, () => 100),
      110,
      90,
      110,
      115,
      80,
    ];
    const all = candlesFromCloses(closes);
    const prefixLength = 202;
    const prefix = runD1SlowGate(all.slice(0, prefixLength), CTX);
    const full = runD1SlowGate(all, CTX);

    expect(full.transitions.filter((t) => t.barIndex < prefixLength))
      .toEqual(prefix.transitions);
    expect(full.equity.slice(0, prefixLength)).toEqual(prefix.equity);
  });
});

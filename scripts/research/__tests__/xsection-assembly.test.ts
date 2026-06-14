/**
 * Unit tests for the Phase 5 Track B cross-sectional assembly
 * (xsection-assembly.ts). Synthetic daily series only — no disk/DB/network.
 * Pins: grid alignment + eligibility, trailing-return ranking, the rotation
 * accounting (weights, turnover cost, no look-ahead), the basket benchmark,
 * Sharpe, folds, the frozen gates, determinism.
 */

import {
  buildGrid,
  runXsection,
  runBasket,
  btcHold,
  dailySharpe,
  splitGridFolds,
  xsectionGates,
  XS_SIDE_COST,
  type DailySeries,
} from '../xsection-assembly';

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);

/** Daily closes from a starting price and per-day growth factor. */
function series(symbol: string, start: number, dailyFactor: number, days: number, offsetDays = 0): DailySeries {
  return {
    symbol,
    bars: Array.from({ length: days }, (_, i) => ({
      ts: T0 + (offsetDays + i) * DAY,
      close: start * Math.pow(dailyFactor, i),
    })),
  };
}

const OPTS = { topK: 1, lookback: 2, rebalanceEvery: 2, mode: 'long-only' as const };

describe('buildGrid', () => {
  it('unions timestamps and nulls missing bars', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 5), series('BBB', 100, 1.0, 3, 2)]);
    expect(grid.ts).toHaveLength(5);
    expect(grid.closes['BBB'][0]).toBeNull();
    expect(grid.closes['BBB'][2]).toBeCloseTo(100, 10);
    expect(grid.closes['AAA'][4]).toBeCloseTo(100 * 1.01 ** 4, 10);
  });
});

describe('runXsection (long-only)', () => {
  it('picks the strongest trailing return and compounds its daily returns', () => {
    // AAA +1%/day, BBB flat, CCC −1%/day, 9 days; lookback 2, rebalance every 2.
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runXsection(grid, OPTS);
    // every rebalance ranks AAA first
    for (const reb of r.rebalances) expect(Object.keys(reb.weights)).toEqual(['AAA']);
    // first rebalance at index 2 (lookback satisfied); cost charged once there
    // (subsequent rebalances have zero turnover — same single holding)
    expect(r.totalTurnoverCost).toBeCloseTo(1 * XS_SIDE_COST, 10);
    // equity: cash through index 2, then (1 − cost) × 1.01^(indices 3..8 = 6 daily returns)
    expect(r.finalEquity).toBeCloseTo((1 - XS_SIDE_COST) * Math.pow(1.01, 6), 8);
    // daily returns array covers indices 1..8 (8 entries), zeros before first rebalance takes effect
    expect(r.dailyReturns).toHaveLength(8);
    expect(r.dailyReturns[0]).toBe(0);
  });

  it('does not look ahead: the rebalance-day return is not earned', () => {
    // AAA jumps +50% exactly on a rebalance day; the strategy must NOT capture it
    const flat = series('AAA', 100, 1.0, 9);
    flat.bars = flat.bars.map((b, i) => ({ ...b, close: i === 2 ? 150 : 100 }));
    const grid = buildGrid([flat, series('BBB', 100, 1.0, 9)]);
    const r = runXsection(grid, OPTS);
    // AAA ranked top at index 2 (its close just spiked) — but the +50% happened AT index 2;
    // from index 3 AAA drops back to 100 (−33%), which the position DOES eat.
    expect(r.finalEquity).toBeLessThan(1);
  });

  it('holds fewer than topK when eligibility is short (all eligible, equal-weight)', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9)]);
    const r = runXsection(grid, { ...OPTS, topK: 5 });
    // SPEC: fewer than topK eligible → hold ALL eligible at equal weight (1/count). One symbol → weight 1.
    for (const reb of r.rebalances) expect(Object.values(reb.weights)).toEqual([1]);
  });
});

describe('runXsection (long-short)', () => {
  it('is dollar-neutral with gross 1.0 and earns the spread', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runXsection(grid, { ...OPTS, mode: 'long-short' });
    const reb = r.rebalances[0];
    expect(reb.weights['AAA']).toBeCloseTo(0.5, 10);
    expect(reb.weights['CCC']).toBeCloseTo(-0.5, 10);
    expect(Object.values(reb.weights).reduce((s, w) => s + Math.abs(w), 0)).toBeCloseTo(1.0, 10);
    expect(r.finalEquity).toBeGreaterThan(1); // long the riser, short the faller
  });
});

describe('runBasket', () => {
  it('equal-weights ALL eligible symbols through the same accounting', () => {
    const grid = buildGrid([series('AAA', 100, 1.01, 9), series('BBB', 100, 1.0, 9), series('CCC', 100, 0.99, 9)]);
    const r = runBasket(grid, { lookback: 2, rebalanceEvery: 2 });
    expect(Object.values(r.rebalances[0].weights)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
});

describe('btcHold', () => {
  it('compounds BTCUSD close-to-close from the first rebalance-effective index', () => {
    const grid = buildGrid([series('BTCUSD', 100, 1.01, 9), series('BBB', 100, 1.0, 9)]);
    const r = btcHold(grid, { lookback: 2, rebalanceEvery: 2 });
    expect(r.finalEquity).toBeCloseTo((1 - XS_SIDE_COST) * Math.pow(1.01, 6), 8);
  });
});

describe('dailySharpe', () => {
  it('mean/sd(N−1)·√365; zero sd → 0', () => {
    expect(dailySharpe([0.01, 0.01, 0.01])).toBe(0);
    const rs = [0.01, -0.01, 0.02, 0.0];
    const mean = rs.reduce((s, x) => s + x, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / (rs.length - 1));
    expect(dailySharpe(rs)).toBeCloseTo((mean / sd) * Math.sqrt(365), 10);
  });
});

describe('splitGridFolds', () => {
  it('4 contiguous index ranges covering the grid', () => {
    const grid = buildGrid([series('AAA', 100, 1.0, 100)]);
    const folds = splitGridFolds(grid, 4);
    expect(folds).toHaveLength(4);
    expect(folds[0].from).toBe(0);
    expect(folds[3].to).toBe(99);
    expect(folds[1].from).toBe(folds[0].to + 1);
  });
});

describe('xsectionGates (the FROZEN spec gates)', () => {
  const pass = { strategyReturn: 0.30, basketReturn: 0.20, strategySharpe: 1.2, basketSharpe: 0.8, foldsExcessPositive: 3, foldsTotal: 4 };
  it('passes only when return AND sharpe beat the basket AND folds hold', () => {
    expect(xsectionGates(pass).pass).toBe(true);
  });
  it.each([
    ['return ≤ basket', { ...pass, strategyReturn: 0.20 }],
    ['sharpe ≤ basket', { ...pass, strategySharpe: 0.8 }],
    ['folds', { ...pass, foldsExcessPositive: 2 }],
  ])('fails on %s', (_l, input) => {
    expect(xsectionGates(input).pass).toBe(false);
  });
  it('folds threshold adapts below 3 total folds', () => {
    expect(xsectionGates({ ...pass, foldsTotal: 2, foldsExcessPositive: 2 }).pass).toBe(true);
    expect(xsectionGates({ ...pass, foldsTotal: 2, foldsExcessPositive: 1 }).pass).toBe(false);
  });
});

describe('determinism', () => {
  it('identical inputs → byte-identical serialized results', () => {
    const mk = () => buildGrid([series('AAA', 100, 1.012, 60), series('BBB', 100, 0.997, 60), series('CCC', 100, 1.004, 60)]);
    const a = JSON.stringify(runXsection(mk(), { topK: 1, lookback: 14, rebalanceEvery: 7, mode: 'long-only' }));
    const b = JSON.stringify(runXsection(mk(), { topK: 1, lookback: 14, rebalanceEvery: 7, mode: 'long-only' }));
    expect(a).toBe(b);
  });
});

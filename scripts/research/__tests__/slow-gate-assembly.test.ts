/**
 * Unit tests for the slow regime-gate sandbox assembly (pure functions).
 *
 * Written FIRST (TDD) against the pre-registered spec in
 * docs/plans/2026-07-18-slow-regime-gate-sandbox.md. Synthetic series only —
 * no candle dumps, no HMM model, no I/O.
 */

import {
  emaSeries,
  trendGateSeries,
  hmmSizeForRegime,
  volTargetSeries,
  simulateDaily,
  computeMetrics,
  dailyRegimeSeries,
  type DailyBar,
  type SlowGateCosts,
} from '../slow-gate-assembly';

const ZERO: SlowGateCosts = { feePctPerSide: 0, slippagePctPerSide: 0, fundingPctPer8h: 0 };

const DAY = 86_400_000;

function days(closes: number[], startTs = Date.parse('2020-01-01T00:00:00Z')): DailyBar[] {
  return closes.map((close, i) => ({ timestamp: startTs + i * DAY, close }));
}

describe('emaSeries', () => {
  it('is null before the period is filled, then equals the price on a constant series', () => {
    const out = emaSeries([5, 5, 5, 5, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBeCloseTo(5, 10);
    expect(out[4]).toBeCloseTo(5, 10);
  });

  it('lags a rising series from below', () => {
    const prices = [1, 2, 3, 4, 5, 6];
    const out = emaSeries(prices, 3);
    expect(out[5]).not.toBeNull();
    expect(out[5]!).toBeLessThan(6);
    expect(out[5]!).toBeGreaterThan(3);
  });
});

describe('trendGateSeries', () => {
  it('is long in a sustained uptrend and flat in a sustained downtrend after warmup', () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    const gUp = trendGateSeries(up, 10);
    const gDown = trendGateSeries(down, 10);
    expect(gUp[29]).toBe(true);
    expect(gDown[29]).toBe(false);
    // warmup: gate must be false (flat), never null-crash
    expect(gUp[3]).toBe(false);
  });
});

describe('hmmSizeForRegime', () => {
  it('uses the shipped allocator ratios 15/8/6 normalized to trend=1', () => {
    expect(hmmSizeForRegime('trend')).toBeCloseTo(1.0, 10);
    expect(hmmSizeForRegime('volatile')).toBeCloseTo(8 / 15, 10);
    expect(hmmSizeForRegime('range')).toBeCloseTo(6 / 15, 10);
  });

  it('falls back to range sizing for unknown/null (plan D1 conservative fallback)', () => {
    expect(hmmSizeForRegime(null)).toBeCloseTo(6 / 15, 10);
  });
});

describe('volTargetSeries', () => {
  it('caps exposure at 1 when realized vol is below target and shrinks it when above', () => {
    // ~zero-vol series: exposure capped at 1
    const quietReturns = Array.from({ length: 40 }, () => 0.0001);
    const quiet = volTargetSeries(quietReturns, 0.4, 20);
    expect(quiet[39]).toBeCloseTo(1, 6);
    // wild alternating ±10% daily: ann vol >> 40% target → exposure well below 1
    const wildReturns = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    const wild = volTargetSeries(wildReturns, 0.4, 20);
    expect(wild[39]).not.toBeNull();
    expect(wild[39]!).toBeLessThan(0.5);
  });

  it('is null during the lookback warmup', () => {
    const r = Array.from({ length: 25 }, () => 0.01);
    const out = volTargetSeries(r, 0.4, 20);
    expect(out[5]).toBeNull();
  });
});

describe('simulateDaily', () => {
  it('with full exposure and zero costs the equity curve equals buy-and-hold', () => {
    const bars = days([100, 110, 121, 133.1]);
    const exposures = [1, 1, 1, 1];
    const sim = simulateDaily(bars, exposures, ZERO);
    expect(sim.equity[sim.equity.length - 1]).toBeCloseTo(133.1 / 100, 10);
  });

  it('with zero exposure equity stays flat', () => {
    const bars = days([100, 50, 200, 25]);
    const sim = simulateDaily(bars, [0, 0, 0, 0], ZERO);
    for (const e of sim.equity) expect(e).toBeCloseTo(1, 10);
  });

  it('charges one side of fee+slippage per unit of exposure change', () => {
    const bars = days([100, 100, 100]);
    const costs: SlowGateCosts = { feePctPerSide: 0.1, slippagePctPerSide: 0.15, fundingPctPer8h: 0 };
    // enter full on day0, hold, no exit — one 0->1 change = 0.25% once
    const sim = simulateDaily(bars, [1, 1, 1], costs);
    expect(sim.equity[sim.equity.length - 1]).toBeCloseTo(1 - 0.0025, 10);
    expect(sim.totalCostPct).toBeCloseTo(0.25, 10);
    expect(sim.flips).toBe(1);
  });

  it('charges funding per day held in the perp cost model', () => {
    const bars = days([100, 100, 100]);
    const costs: SlowGateCosts = { feePctPerSide: 0, slippagePctPerSide: 0, fundingPctPer8h: 0.01 };
    // 2 exposure-days at 0.03%/day funding
    const sim = simulateDaily(bars, [1, 1, 1], costs);
    expect(sim.equity[sim.equity.length - 1]).toBeCloseTo((1 - 0.0003) * (1 - 0.0003), 8);
  });

  it('null exposure is treated as flat (warmup)', () => {
    const bars = days([100, 200, 400]);
    const sim = simulateDaily(bars, [null, 1, 1], ZERO);
    // day0 flat, day1->day2 return captured
    expect(sim.equity[sim.equity.length - 1]).toBeCloseTo(2, 10);
  });
});

describe('computeMetrics', () => {
  it('computes CAGR from the timestamp span', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const timestamps = [ts0, ts0 + 365 * DAY, ts0 + 730 * DAY];
    const m = computeMetrics([1, 1.5, 2.25], timestamps);
    expect(m.cagr).toBeCloseTo(0.5, 2); // 2.25 over 2y = 50%/yr
  });

  it('computes max drawdown', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const timestamps = [0, 1, 2, 3].map((i) => ts0 + i * DAY);
    const m = computeMetrics([1, 1.2, 0.6, 0.9], timestamps);
    expect(m.maxDrawdown).toBeCloseTo(0.5, 10); // 1.2 -> 0.6
  });
});

describe('dailyRegimeSeries', () => {
  it('classifies each day using only H1 bars that opened within or before that day', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1, 2, 3], d0);
    // 3 days x 24 hourly bars
    const h1 = Array.from({ length: 72 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const seen: number[] = [];
    const stub = (bars: { timestamp: number }[]) => {
      seen.push(bars.length);
      const last = bars[bars.length - 1].timestamp;
      expect(last).toBeLessThanOrEqual(d0 + seen.length * 24 * 3_600_000 - 3_600_000);
      return 'trend' as const;
    };
    const out = dailyRegimeSeries(dayBars, h1, stub, 48);
    expect(out).toEqual(['trend', 'trend', 'trend']);
    // window cap respected: never more than 48 bars handed to the classifier
    expect(Math.max(...seen)).toBeLessThanOrEqual(48);
  });

  it('returns null when the classifier throws (insufficient warmup)', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1], d0);
    const out = dailyRegimeSeries(dayBars, [], () => {
      throw new Error('insufficient data');
    }, 48);
    expect(out).toEqual([null]);
  });
});

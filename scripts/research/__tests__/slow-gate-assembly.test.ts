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
  it('rejects malformed indicator inputs before EMA math', () => {
    const cases: Array<{ label: string; values: number[]; period: number; expected: RegExp }> = [
      {
        label: 'NaN price',
        values: [1, Number.NaN, 2],
        period: 2,
        expected: /values\[1\] must be a finite number; got NaN\./,
      },
      {
        label: 'zero period',
        values: [1, 2, 3],
        period: 0,
        expected: /period must be a safe integer greater than 0; got 0\./,
      },
      {
        label: 'fractional period',
        values: [1, 2, 3],
        period: 1.5,
        expected: /period must be a safe integer greater than 0; got 1\.5\./,
      },
      {
        label: 'unsafe period',
        values: [1, 2, 3],
        period: Number.MAX_SAFE_INTEGER + 1,
        expected: /period must be a safe integer greater than 0; got 9007199254740992\./,
      },
    ];

    for (const { label, values, period, expected } of cases) {
      expect(() => emaSeries(values, period)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

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
  it('rejects non-finite or non-positive closes before trend-gate comparisons', () => {
    const cases: Array<{ label: string; closes: number[]; expected: RegExp }> = [
      {
        label: 'zero close',
        closes: [100, 0, 101],
        expected: /closes\[1\] must be a finite positive number; got 0\./,
      },
      {
        label: 'negative close',
        closes: [100, -1, 101],
        expected: /closes\[1\] must be a finite positive number; got -1\./,
      },
      {
        label: 'NaN close',
        closes: [100, Number.NaN, 101],
        expected: /closes\[1\] must be a finite positive number; got NaN\./,
      },
    ];

    for (const { label, closes, expected } of cases) {
      expect(() => trendGateSeries(closes, 2)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

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

  it('falls back to range sizing for null/unknown warmup (plan D1 conservative fallback)', () => {
    expect(hmmSizeForRegime(null)).toBeCloseTo(6 / 15, 10);
  });

  it('rejects invalid regime labels before conservative size fallback', () => {
    expect(() => hmmSizeForRegime('breakout' as unknown as 'trend')).toThrow(
      /regime must be "trend", "volatile", "range", or null; got "breakout"\./,
    );
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

  it('rejects malformed inputs before exposure sizing', () => {
    const goodReturns = Array.from({ length: 25 }, () => 0.01);
    const cases: Array<{
      label: string;
      dailyReturns: number[];
      targetAnnVol: number;
      lookback: number;
      expected: RegExp;
    }> = [
      {
        label: 'NaN return',
        dailyReturns: [0, Number.NaN, 0.01],
        targetAnnVol: 0.4,
        lookback: 2,
        expected: /dailyReturns\[1\] must be a finite return greater than -1; got NaN\./,
      },
      {
        label: 'below -100% return',
        dailyReturns: [0, -1.01, 0.01],
        targetAnnVol: 0.4,
        lookback: 2,
        expected: /dailyReturns\[1\] must be a finite return greater than -1; got -1\.01\./,
      },
      {
        label: 'zero target volatility',
        dailyReturns: goodReturns,
        targetAnnVol: 0,
        lookback: 20,
        expected: /targetAnnVol must be a finite positive annualized volatility target; got 0\./,
      },
      {
        label: 'fractional lookback',
        dailyReturns: goodReturns,
        targetAnnVol: 0.4,
        lookback: 2.5,
        expected: /lookback must be a safe integer greater than 1; got 2\.5\./,
      },
    ];

    for (const { label, dailyReturns, targetAnnVol, lookback, expected } of cases) {
      expect(() => volTargetSeries(dailyReturns, targetAnnVol, lookback)).toThrow(expected);
      expect(label).toBeTruthy();
    }
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

  it('rejects empty or single-bar series before equity math', () => {
    const cases: Array<{ label: string; bars: DailyBar[]; exposures: (number | null)[]; expected: RegExp }> = [
      {
        label: 'empty series',
        bars: [],
        exposures: [],
        expected: /bars and exposures must align with length >= 2; got bars=0 exposures=0\./,
      },
      {
        label: 'single-bar series',
        bars: days([100]),
        exposures: [1],
        expected: /bars and exposures must align with length >= 2; got bars=1 exposures=1\./,
      },
    ];

    for (const { label, bars, exposures, expected } of cases) {
      expect(() => simulateDaily(bars, exposures, ZERO)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects malformed cost assumptions before equity math', () => {
    const bars = days([100, 101, 102]);
    const cases: Array<{ label: string; costs: SlowGateCosts; expected: RegExp }> = [
      {
        label: 'negative fee',
        costs: { feePctPerSide: -0.1, slippagePctPerSide: 0, fundingPctPer8h: 0 },
        expected: /costs\.feePctPerSide must be a finite non-negative percentage; got -0\.1\./,
      },
      {
        label: 'NaN slippage',
        costs: { feePctPerSide: 0, slippagePctPerSide: Number.NaN, fundingPctPer8h: 0 },
        expected: /costs\.slippagePctPerSide must be a finite non-negative percentage; got NaN\./,
      },
      {
        label: 'negative funding',
        costs: { feePctPerSide: 0, slippagePctPerSide: 0, fundingPctPer8h: -0.01 },
        expected: /costs\.fundingPctPer8h must be a finite non-negative percentage; got -0\.01\./,
      },
    ];

    for (const { label, costs, expected } of cases) {
      expect(() => simulateDaily(bars, [1, 1, 1], costs)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('null exposure is treated as flat (warmup)', () => {
    const bars = days([100, 200, 400]);
    const sim = simulateDaily(bars, [null, 1, 1], ZERO);
    // day0 flat, day1->day2 return captured
    expect(sim.equity[sim.equity.length - 1]).toBeCloseTo(2, 10);
  });

  it('rejects malformed bar timestamp series before return math', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const cases: Array<{ label: string; bars: DailyBar[]; expected: RegExp }> = [
      {
        label: 'fractional timestamp',
        bars: [{ timestamp: ts0, close: 100 }, { timestamp: ts0 + 0.5, close: 101 }, { timestamp: ts0 + DAY, close: 102 }],
        expected: /bars\[1\]\.timestamp must be a safe integer millisecond timestamp; got 1577836800000\.5\./,
      },
      {
        label: 'duplicate timestamp',
        bars: [{ timestamp: ts0, close: 100 }, { timestamp: ts0, close: 101 }, { timestamp: ts0 + DAY, close: 102 }],
        expected: /bars\[1\]\.timestamp must be greater than bars\[0\]\.timestamp \(1577836800000\); got 1577836800000\./,
      },
      {
        label: 'out-of-order timestamp',
        bars: [{ timestamp: ts0, close: 100 }, { timestamp: ts0 - 1, close: 101 }, { timestamp: ts0 + DAY, close: 102 }],
        expected: /bars\[1\]\.timestamp must be greater than bars\[0\]\.timestamp \(1577836800000\); got 1577836799999\./,
      },
    ];

    for (const { label, bars, expected } of cases) {
      expect(() => simulateDaily(bars, [1, 1, 1], ZERO)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects non-daily bar cadence before funding and equity math', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const cases: Array<{ label: string; bars: DailyBar[]; expected: RegExp }> = [
      {
        label: 'intraday gap',
        bars: [{ timestamp: ts0, close: 100 }, { timestamp: ts0 + 3_600_000, close: 101 }, { timestamp: ts0 + DAY, close: 102 }],
        expected: /bars\[1\]\.timestamp must be exactly 86400000ms after bars\[0\]\.timestamp; got 3600000ms\./,
      },
      {
        label: 'multi-day gap',
        bars: [{ timestamp: ts0, close: 100 }, { timestamp: ts0 + DAY, close: 101 }, { timestamp: ts0 + 3 * DAY, close: 102 }],
        expected: /bars\[2\]\.timestamp must be exactly 86400000ms after bars\[1\]\.timestamp; got 172800000ms\./,
      },
    ];

    for (const { label, bars, expected } of cases) {
      expect(() => simulateDaily(bars, [1, 1, 1], ZERO)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects non-finite or non-positive closes before return math', () => {
    const cases: Array<{ label: string; bars: DailyBar[]; expected: RegExp }> = [
      {
        label: 'zero close',
        bars: days([100, 0, 101]),
        expected: /bars\[1\]\.close must be a finite positive number; got 0\./,
      },
      {
        label: 'negative close',
        bars: days([100, -1, 101]),
        expected: /bars\[1\]\.close must be a finite positive number; got -1\./,
      },
      {
        label: 'NaN close',
        bars: days([100, Number.NaN, 101]),
        expected: /bars\[1\]\.close must be a finite positive number; got NaN\./,
      },
    ];

    for (const { label, bars, expected } of cases) {
      expect(() => simulateDaily(bars, [1, 1, 1], ZERO)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects exposures outside the long-only unit interval', () => {
    const bars = days([100, 101, 102]);
    const cases: Array<{ label: string; exposures: (number | null)[]; expected: RegExp }> = [
      {
        label: 'negative exposure',
        exposures: [0, -0.1, 1],
        expected: /exposures\[1\] must be null or a finite number between 0 and 1; got -0\.1\./,
      },
      {
        label: 'leveraged exposure',
        exposures: [0, 1.1, 1],
        expected: /exposures\[1\] must be null or a finite number between 0 and 1; got 1\.1\./,
      },
      {
        label: 'NaN exposure',
        exposures: [0, Number.NaN, 1],
        expected: /exposures\[1\] must be null or a finite number between 0 and 1; got NaN\./,
      },
    ];

    for (const { label, exposures, expected } of cases) {
      expect(() => simulateDaily(bars, exposures, ZERO)).toThrow(expected);
      expect(label).toBeTruthy();
    }
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

  it('rejects malformed metric series before metric math', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const goodTimestamps = [ts0, ts0 + DAY, ts0 + 2 * DAY];
    const cases: Array<{ label: string; equity: number[]; timestamps: number[]; expected: RegExp }> = [
      {
        label: 'NaN equity',
        equity: [1, Number.NaN, 1.1],
        timestamps: goodTimestamps,
        expected: /equity\[1\] must be a finite positive number; got NaN\./,
      },
      {
        label: 'zero equity',
        equity: [1, 0, 1.1],
        timestamps: goodTimestamps,
        expected: /equity\[1\] must be a finite positive number; got 0\./,
      },
      {
        label: 'fractional timestamp',
        equity: [1, 1.05, 1.1],
        timestamps: [ts0, ts0 + 0.5, ts0 + DAY],
        expected: /timestamps\[1\] must be a safe integer millisecond timestamp; got 1577836800000\.5\./,
      },
      {
        label: 'duplicate timestamp',
        equity: [1, 1.05, 1.1],
        timestamps: [ts0, ts0, ts0 + DAY],
        expected: /timestamps\[1\] must be greater than timestamps\[0\] \(1577836800000\); got 1577836800000\./,
      },
    ];

    for (const { label, equity, timestamps, expected } of cases) {
      expect(() => computeMetrics(equity, timestamps)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects sub-daily or non-uniform metric timestamp cadence before annualized metric math', () => {
    const ts0 = Date.parse('2020-01-01T00:00:00Z');
    const cases: Array<{ label: string; timestamps: number[]; expected: RegExp }> = [
      {
        label: 'intraday metric gap',
        timestamps: [ts0, ts0 + 3_600_000, ts0 + DAY],
        expected: /timestamps\[1\] must be at least 86400000ms after timestamps\[0\]; got 3600000ms\./,
      },
      {
        label: 'non-uniform metric gap',
        timestamps: [ts0, ts0 + DAY, ts0 + 3 * DAY],
        expected: /timestamps\[2\] must repeat the prior 86400000ms cadence after timestamps\[1\]; got 172800000ms\./,
      },
    ];

    for (const { label, timestamps, expected } of cases) {
      expect(() => computeMetrics([1, 1.05, 1.1], timestamps)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });
});

describe('dailyRegimeSeries', () => {
  it('rejects malformed classifier window sizes before downsampling', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1, 2], d0);
    const h1 = Array.from({ length: 48 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const cases: Array<{ label: string; windowBars: number; expected: RegExp }> = [
      {
        label: 'zero window',
        windowBars: 0,
        expected: /windowBars must be a safe integer greater than 0; got 0\./,
      },
      {
        label: 'fractional window',
        windowBars: 1.5,
        expected: /windowBars must be a safe integer greater than 0; got 1\.5\./,
      },
      {
        label: 'unsafe window',
        windowBars: Number.MAX_SAFE_INTEGER + 1,
        expected: /windowBars must be a safe integer greater than 0; got 9007199254740992\./,
      },
    ];

    for (const { label, windowBars, expected } of cases) {
      expect(() => dailyRegimeSeries(dayBars, h1, () => 'trend', windowBars)).toThrow(expected);
      expect(label).toBeTruthy();
    }
  });

  it('rejects non-daily day-bar cadence before downsampling', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const h1 = Array.from({ length: 72 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const cases: Array<{ label: string; dayBars: DailyBar[]; expected: RegExp }> = [
      {
        label: 'intraday day gap',
        dayBars: [{ timestamp: d0, close: 1 }, { timestamp: d0 + 3_600_000, close: 2 }, { timestamp: d0 + DAY, close: 3 }],
        expected: /dayBars\[1\]\.timestamp must be exactly 86400000ms after dayBars\[0\]\.timestamp; got 3600000ms\./,
      },
      {
        label: 'multi-day day gap',
        dayBars: [{ timestamp: d0, close: 1 }, { timestamp: d0 + DAY, close: 2 }, { timestamp: d0 + 3 * DAY, close: 3 }],
        expected: /dayBars\[2\]\.timestamp must be exactly 86400000ms after dayBars\[1\]\.timestamp; got 172800000ms\./,
      },
    ];

    for (const { label, dayBars, expected } of cases) {
      const classify = jest.fn(() => 'trend' as const);
      expect(() => dailyRegimeSeries(dayBars, h1, classify, 24)).toThrow(expected);
      expect(classify).not.toHaveBeenCalled();
      expect(label).toBeTruthy();
    }
  });

  it('rejects irregular H1 cadence before downsampling', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1, 2], d0);
    const cases: Array<{
      label: string;
      h1Bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>;
      expected: RegExp;
    }> = [
      {
        label: 'missing hour',
        h1Bars: [
          { timestamp: d0, open: 1, high: 1, low: 1, close: 1, volume: 0 },
          { timestamp: d0 + 7_200_000, open: 1, high: 1, low: 1, close: 1, volume: 0 },
        ],
        expected: /h1Bars\[1\]\.timestamp must be exactly 3600000ms after h1Bars\[0\]\.timestamp; got 7200000ms\./,
      },
      {
        label: 'half-hour bar',
        h1Bars: [
          { timestamp: d0, open: 1, high: 1, low: 1, close: 1, volume: 0 },
          { timestamp: d0 + 1_800_000, open: 1, high: 1, low: 1, close: 1, volume: 0 },
        ],
        expected: /h1Bars\[1\]\.timestamp must be exactly 3600000ms after h1Bars\[0\]\.timestamp; got 1800000ms\./,
      },
    ];

    for (const { label, h1Bars, expected } of cases) {
      const classify = jest.fn(() => 'trend' as const);
      expect(() => dailyRegimeSeries(dayBars, h1Bars, classify, 24)).toThrow(expected);
      expect(classify).not.toHaveBeenCalled();
      expect(label).toBeTruthy();
    }
  });

  it('rejects malformed H1 bar values before classifier input', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1, 2], d0);
    const goodH1 = Array.from({ length: 48 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1,
      high: 2,
      low: 1,
      close: 1.5,
      volume: 0,
    }));
    const cases: Array<{
      label: string;
      h1Bars: typeof goodH1;
      expected: RegExp;
    }> = [
      {
        label: 'NaN close',
        h1Bars: goodH1.map((bar, index) => (index === 1 ? { ...bar, close: Number.NaN } : bar)),
        expected: /h1Bars\[1\]\.close must be a finite positive number; got NaN\./,
      },
      {
        label: 'negative volume',
        h1Bars: goodH1.map((bar, index) => (index === 1 ? { ...bar, volume: -1 } : bar)),
        expected: /h1Bars\[1\]\.volume must be a finite non-negative number; got -1\./,
      },
      {
        label: 'close above high',
        h1Bars: goodH1.map((bar, index) => (index === 1 ? { ...bar, close: 3 } : bar)),
        expected: /h1Bars\[1\] must satisfy low <= open\/close <= high and high >= low\./,
      },
    ];

    for (const { label, h1Bars, expected } of cases) {
      const classify = jest.fn(() => 'trend' as const);
      expect(() => dailyRegimeSeries(dayBars, h1Bars, classify, 24)).toThrow(expected);
      expect(classify).not.toHaveBeenCalled();
      expect(label).toBeTruthy();
    }
  });

  it('rejects partial day-close H1 coverage before classifier input', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1], d0);
    const h1 = Array.from({ length: 23 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 0,
    }));
    const classify = jest.fn(() => 'trend' as const);

    expect(() => dailyRegimeSeries(dayBars, h1, classify, 48)).toThrow(
      /Insufficient H1 coverage for dayBars\[0\]: expected latest H1 bar 2021-01-01 23:00 before classifier input; got 2021-01-01 22:00\./,
    );
    expect(classify).not.toHaveBeenCalled();
  });

  it('rejects malformed regime timestamp series before downsampling', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const goodDayBars = days([1, 2], d0);
    const goodH1 = Array.from({ length: 48 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const cases: Array<{
      label: string;
      dayBars: DailyBar[];
      h1Bars: typeof goodH1;
      expected: RegExp;
    }> = [
      {
        label: 'fractional day timestamp',
        dayBars: [{ ...goodDayBars[0] }, { ...goodDayBars[1], timestamp: d0 + 0.5 }],
        h1Bars: goodH1,
        expected: /dayBars\[1\]\.timestamp must be a safe integer millisecond timestamp; got 1609459200000\.5\./,
      },
      {
        label: 'duplicate day timestamp',
        dayBars: [{ ...goodDayBars[0] }, { ...goodDayBars[1], timestamp: d0 }],
        h1Bars: goodH1,
        expected: /dayBars\[1\]\.timestamp must be greater than dayBars\[0\]\.timestamp \(1609459200000\); got 1609459200000\./,
      },
      {
        label: 'NaN H1 timestamp',
        dayBars: goodDayBars,
        h1Bars: [{ ...goodH1[0] }, { ...goodH1[1], timestamp: Number.NaN }],
        expected: /h1Bars\[1\]\.timestamp must be a safe integer millisecond timestamp; got NaN\./,
      },
      {
        label: 'non-increasing H1 timestamp',
        dayBars: goodDayBars,
        h1Bars: [{ ...goodH1[0] }, { ...goodH1[1], timestamp: d0 }],
        expected: /h1Bars\[1\]\.timestamp must be greater than h1Bars\[0\]\.timestamp \(1609459200000\); got 1609459200000\./,
      },
    ];

    for (const { label, dayBars, h1Bars, expected } of cases) {
      const classify = jest.fn(() => 'trend' as const);
      expect(() => dailyRegimeSeries(dayBars, h1Bars, classify, 24)).toThrow(expected);
      expect(classify).not.toHaveBeenCalled();
      expect(label).toBeTruthy();
    }
  });

  it('rejects invalid classifier regime labels before returning the regime series', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1, 2], d0);
    const h1 = Array.from({ length: 48 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const classify = jest.fn(() => 'breakout' as unknown as 'trend');

    expect(() => dailyRegimeSeries(dayBars, h1, classify, 24)).toThrow(
      /classifier returned invalid regime label at dayBars\[0\]: "breakout"\./,
    );
    expect(classify).toHaveBeenCalledTimes(1);
  });

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

  it('returns null when the classifier throws for insufficient warmup data', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1], d0);
    const h1 = Array.from({ length: 24 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const classify = jest.fn(() => {
      throw new Error('insufficient data for regime classification: need >= 8 feature vectors');
    });

    const out = dailyRegimeSeries(dayBars, h1, classify, 48);

    expect(out).toEqual([null]);
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it('rethrows unexpected classifier failures instead of returning a poisoned regime series', () => {
    const d0 = Date.parse('2021-01-01T00:00:00Z');
    const dayBars = days([1], d0);
    const h1 = Array.from({ length: 24 }, (_, i) => ({
      timestamp: d0 + i * 3_600_000,
      open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    const classify = jest.fn(() => {
      throw new Error('model state label table is corrupt');
    });

    expect(() => dailyRegimeSeries(dayBars, h1, classify, 48)).toThrow(
      /model state label table is corrupt/,
    );
    expect(classify).toHaveBeenCalledTimes(1);
  });
});

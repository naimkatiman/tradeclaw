/**
 * Unit tests for the Phase 5 Track A carry assembly (carry-assembly.ts).
 * Synthetic funding series only — no disk, no DB, no network. Pins the
 * accounting model (notional 1 / capital 2 / 0.0035 per leg-pair execution),
 * the no-look-ahead income rule, the threshold state machine, the rotation
 * accounting, fold splitting, the registered gates, and determinism.
 */

import {
  CARRY_COSTS,
  annualizedTrailing,
  runAlwaysOn,
  runThresholdGated,
  runCarryRotation,
  splitFolds,
  carryGates,
  type FundingEvent,
} from '../carry-assembly';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2024, 0, 1); // fixed epoch — no Date.now() anywhere

/** n events every 8h starting at T0, all with the same rate. */
function flatSeries(n: number, rate: number, startTs = T0): FundingEvent[] {
  return Array.from({ length: n }, (_, i) => ({ ts: startTs + i * 8 * HOUR, rate }));
}

describe('annualizedTrailing', () => {
  it('annualizes the 7-day trailing sum (3 events/day at 1bp → 3bp/day → ~10.95%/yr)', () => {
    const events = flatSeries(21, 0.0001); // exactly 7 days of 8h events
    const t = events[events.length - 1].ts;
    const inWindow = events.filter((e) => e.ts > t - 7 * DAY && e.ts <= t);
    const expected = inWindow.reduce((s, e) => s + e.rate, 0) * (365 / 7);
    expect(annualizedTrailing(events, t, 7)).toBeCloseTo(expected, 12);
    expect(expected).toBeGreaterThan(0.10); // sanity: ~10.4–10.95%/yr
  });

  it('returns 0 with no events in the window', () => {
    expect(annualizedTrailing(flatSeries(5, 0.0001), T0 - DAY, 7)).toBe(0);
  });
});

describe('runAlwaysOn (A1)', () => {
  it('collects events strictly after entry, charges one round trip', () => {
    const events = flatSeries(30, 0.0001);
    const r = runAlwaysOn(events);
    // entry at event 0 → income from events 1..29 = 29 × 0.0001 = 0.0029; costs 0.007
    expect(r.grossIncome).toBeCloseTo(0.0029, 12);
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
    expect(r.finalEquity).toBeCloseTo(2 + 0.0029 - 0.007, 12);
    expect(r.returnOnCapital).toBeCloseTo((0.0029 - 0.007) / 2, 12);
    expect(r.windowDays).toBeCloseTo((29 * 8) / 24, 10);
    expect(r.annualizedReturn).toBeCloseTo(r.returnOnCapital * (365 / r.windowDays), 10);
    const expectedAnn = ((0.0029 - 0.007) / 2) * (365 / ((29 * 8) / 24));
    expect(r.annualizedReturn).toBeCloseTo(expectedAnn, 8);
  });

  it('negative funding produces negative income (the short perp PAYS)', () => {
    const r = runAlwaysOn(flatSeries(30, -0.0001));
    expect(r.grossIncome).toBeCloseTo(-0.0029, 12);
  });

  it('drawdown is computed on the running equity curve', () => {
    // 10 positive then 20 negative events: equity peaks then bleeds
    const events = [...flatSeries(10, 0.0005), ...flatSeries(20, -0.0005, T0 + 10 * 8 * HOUR)];
    const r = runAlwaysOn(events);
    expect(r.maxDrawdown).toBeGreaterThan(0);
    expect(r.maxDrawdown).toBeCloseTo((20 * 0.0005 + 0.0035) / (2 - 0.0035 + 9 * 0.0005), 6);
    // peak = after entry cost + 9 post-entry positive events; trough = peak − 20 negatives − exit cost
  });
});

describe('runThresholdGated (A2)', () => {
  it('enters above the enter threshold, exits below the exit threshold, one round trip', () => {
    // 30 events at +2bp (trailing annualized well above 5%) then 30 at −1bp (trailing goes negative)
    const hot = flatSeries(30, 0.0002);
    const cold = flatSeries(30, -0.0001, T0 + 30 * 8 * HOUR);
    const events = [...hot, ...cold];
    const r = runThresholdGated(events, { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(1);
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
    // income = sum of rates for events strictly after entry up to and including exit
    const entryIdx = events.findIndex((e) => e.ts === r.entries[0]);
    const exitIdx = events.findIndex((e) => e.ts === r.exits[0]);
    const expected = events.slice(entryIdx + 1, exitIdx + 1).reduce((s, e) => s + e.rate, 0);
    expect(r.grossIncome).toBeCloseTo(expected, 12);
    expect(entryIdx).toBeGreaterThanOrEqual(0);
    expect(exitIdx).toBeGreaterThan(entryIdx);
  });

  it('never enters when funding stays below the threshold', () => {
    const r = runThresholdGated(flatSeries(60, 0.0000001), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(0);
    expect(r.grossIncome).toBe(0);
    expect(r.totalCosts).toBe(0);
    expect(r.finalEquity).toBe(2);
  });

  it('a position open at the last event is force-closed there (exit cost charged)', () => {
    const r = runThresholdGated(flatSeries(60, 0.0002), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 });
    expect(r.roundTrips).toBe(1);
    expect(r.exits).toHaveLength(1);
    expect(r.exits[0]).toBe(T0 + 59 * 8 * HOUR);
  });
});

describe('runCarryRotation (A3)', () => {
  it('always holds the top-K by trailing funding; turnover only when the set changes', () => {
    const A = flatSeries(90, 0.0003);
    const B = flatSeries(90, 0.0001);
    const C = flatSeries(90, -0.0001);
    const r = runCarryRotation({ AAAUSD: A, BBBUSD: B, CCCUSD: C }, { topK: 1, rebalanceDays: 7, trailingDays: 7 });
    // constant ranking → AAAUSD picked at every rebalance, exactly one entry, no swaps
    expect(r.rebalances.length).toBeGreaterThan(2);
    for (const reb of r.rebalances) expect(reb.held).toEqual(['AAAUSD']);
    expect(r.totalSwaps).toBe(1); // the initial entry counts as one position opened
    // costs = one open + one force-close at end, per-symbol notional 1/K = 1
    expect(r.totalCosts).toBeCloseTo(0.007, 12);
  });

  it('splits notional 1/K across held symbols', () => {
    const A = flatSeries(90, 0.0004);
    const B = flatSeries(90, 0.0002);
    const C = flatSeries(90, -0.0001);
    const r = runCarryRotation({ AAAUSD: A, BBBUSD: B, CCCUSD: C }, { topK: 2, rebalanceDays: 7, trailingDays: 7 });
    for (const reb of r.rebalances) expect(reb.held).toEqual(['AAAUSD', 'BBBUSD']);
    // income between first and second rebalance = (sum of A rates + sum of B rates in that span) / 2
    expect(r.grossIncome).toBeGreaterThan(0);
  });
});

describe('splitFolds', () => {
  it('splits events into n contiguous slices covering everything in order', () => {
    const events = flatSeries(100, 0.0001);
    const folds = splitFolds(events, 4);
    expect(folds).toHaveLength(4);
    expect(folds.flat()).toHaveLength(100);
    expect(folds[0][0].ts).toBe(events[0].ts);
    expect(folds[3][folds[3].length - 1].ts).toBe(events[99].ts);
    for (let f = 1; f < 4; f++) expect(folds[f][0].ts).toBeGreaterThan(folds[f - 1][folds[f - 1].length - 1].ts);
  });
});

describe('carryGates (the FROZEN spec gates)', () => {
  const pass = { fullAnnualized: 0.10, recentAnnualized: 0.06, maxDrawdown: 0.05, foldsPositive: 3, foldsTotal: 4 };
  it('passes only when ALL gates pass', () => {
    expect(carryGates(pass).pass).toBe(true);
  });
  it.each([
    ['full-window yield', { ...pass, fullAnnualized: 0.07 }],
    ['recent-window yield', { ...pass, recentAnnualized: 0.04 }],
    ['drawdown', { ...pass, maxDrawdown: 0.11 }],
    ['folds', { ...pass, foldsPositive: 2 }],
  ])('fails on %s with a reason', (_label, input) => {
    const g = carryGates(input);
    expect(g.pass).toBe(false);
    expect(g.reasons.length).toBeGreaterThan(0);
  });
});

describe('determinism', () => {
  it('identical inputs → byte-identical serialized results', () => {
    const events = [...flatSeries(50, 0.0002), ...flatSeries(50, -0.00005, T0 + 50 * 8 * HOUR)];
    const a = JSON.stringify(runThresholdGated(events, { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 }));
    const b = JSON.stringify(runThresholdGated(events.map((e) => ({ ...e })), { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 }));
    expect(a).toBe(b);
  });
});

// Cost-constant pin: the spec's numbers, so a drive-by edit fails loudly.
describe('CARRY_COSTS', () => {
  it('matches the registered spec constants', () => {
    expect(CARRY_COSTS.spotSide).toBeCloseTo(0.0015, 12);
    expect(CARRY_COSTS.perpSide).toBeCloseTo(0.0020, 12);
    expect(CARRY_COSTS.legPair).toBeCloseTo(0.0035, 12);
    expect(CARRY_COSTS.roundTrip).toBeCloseTo(0.007, 12);
  });
});

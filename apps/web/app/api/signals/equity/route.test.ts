import { NextRequest } from 'next/server';
import type { SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice } from '../../../../lib/signal-slice';

jest.mock('../../../../lib/signal-history', () => {
  const realOutcome = (outcome: SignalHistoryRecord['outcomes']['24h']) =>
    Boolean(outcome && (outcome.pnlPct !== 0 || outcome.hit));

  return {
    isCountedResolved: jest.fn((record: SignalHistoryRecord) =>
      !record.isSimulated
      && !record.gateBlocked
      && realOutcome(record.outcomes['24h']),
    ),
  };
});

jest.mock('../../../../lib/signal-slice', () => ({
  parseScope: jest.fn((raw: string | null | undefined) => raw === 'free' ? 'free' : raw === 'broadcast' ? 'broadcast' : 'pro'),
  getResolvedSlice: jest.fn(),
}));

import { GET } from './route';

const mockedGetResolvedSlice = getResolvedSlice as jest.MockedFunction<typeof getResolvedSlice>;

function record(overrides: Partial<SignalHistoryRecord>): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 75,
    entryPrice: 100,
    sl: 98,
    timestamp: 1_717_000_000_000,
    gateBlocked: false,
    isSimulated: false,
    outcomes: {
      '4h': { price: 101, pnlPct: 1, hit: true },
      '24h': { price: 102, pnlPct: 2, hit: true },
    },
    ...overrides,
  };
}

function primeSlice(records: SignalHistoryRecord[]): void {
  mockedGetResolvedSlice.mockResolvedValueOnce({
    sourceRecordsLoaded: records.length,
    sourceReadLimit: 10_000,
    sourceWindowPotentiallyTruncated: false,
    scopedRecords: records,
    periodFiltered: records,
    resolved: records.filter((r) => !r.isSimulated && !r.gateBlocked && r.outcomes['24h'] !== null),
    cutoffTs: null,
    earliestTimestamp: records.length > 0 ? Math.min(...records.map((r) => r.timestamp)) : null,
  });
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe('GET /api/signals/equity rolling win rates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 7d / 30d / 90d rolling win-rate snapshots alongside the main summary', async () => {
    const now = Date.now();
    primeSlice([
      record({
        id: '3d-win',
        timestamp: now - (3 * 24 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 101, pnlPct: 1, hit: true }, '24h': { price: 103, pnlPct: 3, hit: true } },
      }),
      record({
        id: '10d-loss',
        timestamp: now - (10 * 24 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 99, pnlPct: -1, hit: false }, '24h': { price: 97, pnlPct: -3, hit: false } },
      }),
      record({
        id: '40d-win',
        timestamp: now - (40 * 24 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 101, pnlPct: 1, hit: true }, '24h': { price: 102, pnlPct: 2, hit: true } },
      }),
      record({
        id: '100d-loss',
        timestamp: now - (100 * 24 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 99, pnlPct: -1, hit: false }, '24h': { price: 96, pnlPct: -4, hit: false } },
      }),
    ]);

    const res = await GET(makeReq('/api/signals/equity'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rollingWinRates).toEqual({
      '7d': { totalSignals: 1, resolvedSignals: 1, winRate: 100 },
      '30d': { totalSignals: 2, resolvedSignals: 2, winRate: 50 },
      '90d': { totalSignals: 3, resolvedSignals: 3, winRate: 66.7 },
    });
    expect(body.summary.totalSignals).toBe(4);
    expect(body.summary.winRate).toBe(50);
  });
});

describe('GET /api/signals/equity summary metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins fixed-fractional sizing constants and caps single-trade equity at HARD_R_CAP', async () => {
    // entry 100, SL 99 → riskPct = 1% → a +19% close is a raw +19R outlier.
    primeSlice([
      record({
        id: 'cap-19R',
        entryPrice: 100,
        sl: 99,
        outcomes: { '4h': null, '24h': { price: 119, pnlPct: 19, hit: true } },
      }),
    ]);

    const res = await GET(makeReq('/api/signals/equity'));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Sizing methodology must not silently loosen (the prior 100%-bankroll
    // blowup is what produced the unrunnable +800%/-69% curve).
    expect(body.summary.riskPerTradePct).toBe(1.0);
    expect(body.summary.hardRCap).toBe(8);
    // BTCUSD with no recorded cost → model fallback: crypto RT = 0.40% notional.
    // riskPct = 1% (entry 100, SL 99), so cost in R = 0.40 / 1 = 0.40R.
    expect(body.summary.roundTripCostPct).toBe(0.4);
    expect(body.summary.avgCostR).toBe(0.4);
    // R-stats keep the RAW 19R (engine quality is undistorted)…
    expect(body.summary.avgRWin).toBe(19);
    // …but the equity path is bounded: (8R − 0.40R) × 1% = +7.60% on one trade.
    expect(body.summary.totalReturn).toBeCloseTo(7.60, 2);
  });

  it("deducts each row's real recorded round-trip cost, not a flat rate", async () => {
    // Identical +2R win (entry 100, SL 99 → riskPct 1%), differing only in the
    // recorded cost. Cost in R = cost%_notional ÷ riskPct, so the curve diverges.
    primeSlice([
      record({ id: 'cheap-fx', pair: 'EURUSD', entryPrice: 100, sl: 99, costEstimatePct: 0.04, outcomes: { '4h': null, '24h': { price: 102, pnlPct: 2, hit: true } } }),
    ]);
    let res = await GET(makeReq('/api/signals/equity'));
    let body = await res.json();
    expect(body.summary.avgCostR).toBe(0.04);
    expect(body.summary.totalReturn).toBeCloseTo(1.96, 2); // (2 − 0.04) × 1%

    primeSlice([
      record({ id: 'pricey-crypto', pair: 'BTCUSD', entryPrice: 100, sl: 99, costEstimatePct: 0.4, outcomes: { '4h': null, '24h': { price: 102, pnlPct: 2, hit: true } } }),
    ]);
    res = await GET(makeReq('/api/signals/equity'));
    body = await res.json();
    expect(body.summary.avgCostR).toBe(0.4);
    expect(body.summary.totalReturn).toBeCloseTo(1.60, 2); // (2 − 0.40) × 1%
  });

  it('computes expectancyR from the sized-trade population, not the full-population win-rate', async () => {
    // A + B are sized (have SL); C is a legacy null-SL resolved row that counts
    // toward the headline win-rate but not toward sizing or R-stats.
    primeSlice([
      record({ id: 'sized-win', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 102, pnlPct: 2, hit: true } } }),
      record({ id: 'sized-loss', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 99, pnlPct: -1, hit: false } } }),
      record({ id: 'nullsl-win', entryPrice: 100, sl: undefined, outcomes: { '4h': null, '24h': { price: 105, pnlPct: 5, hit: true } } }),
    ]);

    const res = await GET(makeReq('/api/signals/equity'));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Headline win-rate is full-population (2 wins / 3 resolved) to stay
    // byte-matched with /api/signals/history.
    expect(body.summary.winRate).toBe(66.7);
    expect(body.summary.sizedTrades).toBe(2);
    expect(body.summary.avgRWin).toBe(2);
    expect(body.summary.avgRLoss).toBe(-1);
    // Coherent expectancy uses the sized population: 0.5*(+2R) + 0.5*(-1R) = +0.5R.
    // The old full-population formula would have returned 0.667*2 + 0.333*-1 = +1.0R.
    expect(body.summary.expectancyR).toBe(0.5);
    // Net expectancy subtracts the real per-trade cost (BTCUSD model = 0.40R):
    // +0.50R gross − 0.40R cost = +0.10R net.
    expect(body.summary.netExpectancyR).toBe(0.1);
  });

  it('net expectancy subtracts real cost, exposing a gross-positive engine as net-negative', async () => {
    // Gross expectancy is a thin +0.25R, but BTCUSD's real round-trip cost
    // (0.40R at a 1% stop) drags net expectancy below zero — the engine-has-no-
    // net-edge reality the public equity curve must reflect.
    primeSlice([
      record({ id: 'win-1R', pair: 'BTCUSD', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 101, pnlPct: 1, hit: true } } }),
      record({ id: 'loss-half-R', pair: 'BTCUSD', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 99.5, pnlPct: -0.5, hit: false } } }),
    ]);

    const res = await GET(makeReq('/api/signals/equity'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.expectancyR).toBe(0.25);     // gross: 0.5*(+1R) + 0.5*(-0.5R)
    expect(body.summary.avgCostR).toBe(0.4);          // BTCUSD model cost
    expect(body.summary.netExpectancyR).toBe(-0.15);  // 0.25 − 0.40 → net-negative
  });

  it('summaryOnly=1 drops the points array but keeps summary + rollingWinRates', async () => {
    primeSlice([
      record({ id: 'a', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 102, pnlPct: 2, hit: true } } }),
      record({ id: 'b', entryPrice: 100, sl: 99, outcomes: { '4h': null, '24h': { price: 99, pnlPct: -1, hit: false } } }),
    ]);

    const res = await GET(makeReq('/api/signals/equity?summaryOnly=1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Curve omitted for summary-only consumers…
    expect(body.points).toEqual([]);
    // …but the aggregate stats the callout reads are intact.
    expect(body.summary.totalSignals).toBe(2);
    expect(body.summary.sizedTrades).toBe(2);
    expect(body.rollingWinRates).toBeDefined();
  });
});

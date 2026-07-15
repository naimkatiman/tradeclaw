import { NextRequest } from 'next/server';
import type { SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice } from '../../../../lib/signal-slice';
import { costModelFor } from '@tradeclaw/strategies';

jest.mock('../../../../lib/signal-slice', () => ({
  parseScope: jest.fn((raw: string | null | undefined) => (raw === 'broadcast' ? 'broadcast' : 'pro')),
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
    resolved: records,
    cutoffTs: null,
    earliestTimestamp: records.length > 0 ? Math.min(...records.map((r) => r.timestamp)) : null,
  });
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe('GET /api/research/cost-field', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parallel per-trade arrays with gross R, cost R and asset class', async () => {
    // entry 100, SL 98 → riskPct 2%. pnl +2% → grossR = 1. Recorded cost
    // 0.5% notional → costR = 0.25.
    primeSlice([
      record({ id: 'crypto-row', pair: 'BTCUSD', costEstimatePct: 0.5, timestamp: 1_000 }),
      record({
        id: 'metals-row',
        pair: 'XAUUSD',
        costEstimatePct: 0.1,
        timestamp: 2_000,
        outcomes: { '4h': null, '24h': { price: 96, pnlPct: -4, hit: false } },
      }),
      record({ id: 'fx-row', pair: 'EURUSD', costEstimatePct: 0.04, timestamp: 3_000 }),
    ]);

    const res = await GET(makeReq('/api/research/cost-field'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.classes).toEqual(['crypto', 'metals', 'fx_or_fallback']);
    expect(body.count).toBe(3);
    expect(body.ids).toEqual(['crypto-row', 'metals-row', 'fx-row']);
    expect(body.t).toEqual([1_000, 2_000, 3_000]);
    expect(body.grossR).toEqual([1, -2, 1]);
    expect(body.costR).toEqual([0.25, 0.05, 0.02]);
    expect(body.cls).toEqual([0, 1, 2]);
    expect(body.methodology.costBasis).toContain('modeled');
    expect(body.methodology.outcomeBasis).toContain('not broker fills');
    expect(body.window).toEqual(expect.objectContaining({
      startTimestamp: 1_000,
      endTimestamp: 3_000,
      sourceRecordsLoaded: 3,
      sourceReadLimit: 10_000,
      potentiallyTruncatedBeforeStart: false,
    }));
    expect(body.provenance).toBeUndefined();
  });

  it('falls back to the modeled cost when a row has no recorded cost', async () => {
    primeSlice([record({ id: 'legacy-row', pair: 'BTCUSD', costEstimatePct: undefined })]);

    const res = await GET(makeReq('/api/research/cost-field'));
    const body = await res.json();

    const c = costModelFor('BTCUSD');
    const riskPct = 2; // entry 100, SL 98
    const expectedCostR = +((2 * (c.feePctPerSide + c.slippagePctPerSide)) / riskPct).toFixed(3);
    expect(body.costR).toEqual([expectedCostR]);
    expect(expectedCostR).toBeGreaterThan(0);
  });

  it('skips rows that cannot be sized (no SL) but keeps the resolved count honest', async () => {
    primeSlice([
      record({ id: 'sized', costEstimatePct: 0.5, timestamp: 1_000 }),
      record({ id: 'unsized', sl: null as unknown as number, timestamp: 2_000 }),
    ]);

    const res = await GET(makeReq('/api/research/cost-field'));
    const body = await res.json();

    expect(body.count).toBe(1);
    expect(body.resolvedTotal).toBe(2);
    expect(body.t).toEqual([1_000]);
  });

  it('skips a malformed resolved row with no 24h outcome instead of failing the endpoint', async () => {
    primeSlice([
      record({ id: 'sized', timestamp: 1_000 }),
      record({
        id: 'missing-outcome',
        timestamp: 2_000,
        outcomes: {
          '4h': { price: 101, pnlPct: 1, hit: true },
        } as unknown as SignalHistoryRecord['outcomes'],
      }),
    ]);

    const res = await GET(makeReq('/api/research/cost-field'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.resolvedTotal).toBe(2);
    expect(body.t).toEqual([1_000]);
  });

  it('orders trades by timestamp regardless of slice order', async () => {
    primeSlice([
      record({ id: 'later', costEstimatePct: 0.5, timestamp: 5_000 }),
      record({ id: 'earlier', costEstimatePct: 0.5, timestamp: 1_000 }),
    ]);

    const res = await GET(makeReq('/api/research/cost-field'));
    const body = await res.json();

    expect(body.t).toEqual([1_000, 5_000]);
    expect(body.ids).toEqual(['earlier', 'later']);
  });

  it('returns reconstructable row provenance only when requested', async () => {
    primeSlice([
      record({
        id: 'close-row',
        pair: 'SPYUSD',
        strategyId: 'hmm-top3',
        costEstimatePct: 0.04,
        broadcastBlocked: false,
        outcomes: {
          '4h': null,
          '24h': {
            price: 101,
            pnlPct: 1,
            hit: true,
            target: 'expired',
            resolvedAt: '2026-07-15T00:00:00.000Z',
            source: 'stooq',
          },
        },
      }),
    ]);

    const res = await GET(makeReq('/api/research/cost-field?include=provenance'));
    const body = await res.json();

    expect(body.provenance).toEqual([
      expect.objectContaining({
        id: 'close-row',
        pair: 'SPYUSD',
        strategyId: 'hmm-top3',
        outcomePnlPct: 1,
        outcomeTarget: 'expired',
        outcomeSource: 'stooq',
        riskPct: 2,
        grossR: 0.5,
        modeledCostNotionalPct: 0.04,
        modeledCostR: 0.02,
        modeledNetR: 0.48,
        modeledCostSource: 'emission-time-model',
        broadcastDecision: 'approved',
      }),
    ]);
  });
});

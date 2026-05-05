import { NextRequest } from 'next/server';
import type { SignalHistoryRecord } from '../../../../../lib/signal-history';
import * as tier from '../../../../../lib/tier';

function countsAsRealOutcome(outcome: SignalHistoryRecord['outcomes']['24h']): boolean {
  return Boolean(outcome && (outcome.pnlPct !== 0 || outcome.hit));
}

jest.mock('../../../../../lib/signal-history', () => {
  const realOutcome = (outcome: SignalHistoryRecord['outcomes']['24h']) =>
    Boolean(outcome && (outcome.pnlPct !== 0 || outcome.hit));

  return {
    resolveRealOutcomes: jest.fn().mockResolvedValue(undefined),
    isRealOutcome: jest.fn(realOutcome),
    isCountedResolved: jest.fn((record: SignalHistoryRecord) =>
      !record.isSimulated
      && !record.gateBlocked
      && realOutcome(record.outcomes['24h']),
    ),
  };
});

jest.mock('../../../../../lib/signal-slice', () => ({
  parseScope: jest.fn((raw: string | null | undefined) => raw === 'free' ? 'free' : 'pro'),
  getResolvedSlice: jest.fn(),
}));

import { getResolvedSlice } from '../../../../../lib/signal-slice';
import { GET, signalHistoryToCsv } from '../route';

const mockedGetResolvedSlice = getResolvedSlice as jest.MockedFunction<typeof getResolvedSlice>;

function record(overrides: Partial<SignalHistoryRecord>): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 75,
    entryPrice: 100,
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
    scopedRecords: records,
    periodFiltered: records,
    resolved: records.filter(r => countsAsRealOutcome(r.outcomes['24h'])),
    cutoffTs: null,
    earliestTimestamp: records.length > 0 ? Math.min(...records.map(r => r.timestamp)) : null,
  });
}

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe('GET /api/signals/history category filtering', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns only thematic records for category=thematic', async () => {
    primeSlice([
      record({ id: 'btc-1', pair: 'BTCUSD' }),
      record({ id: 'doge-1', pair: 'DOGEUSD', outcomes: { '4h': null, '24h': { price: 0.18, pnlPct: -1, hit: false } } }),
    ]);

    const res = await GET(makeReq('/api/signals/history?category=thematic'));
    const body = await res.json();

    expect(body.records.map((r: SignalHistoryRecord) => r.pair)).toEqual(['DOGEUSD']);
    expect(body.stats.totalSignals).toBe(1);
    expect(body.stats.resolved).toBe(1);
    expect(body.stats.winRate).toBe(0);
  });

  it('lets pair filter win over a conflicting category', async () => {
    primeSlice([
      record({ id: 'btc-1', pair: 'BTCUSD' }),
      record({ id: 'doge-1', pair: 'DOGEUSD' }),
    ]);

    const res = await GET(makeReq('/api/signals/history?pair=BTCUSD&category=thematic'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.records.map((r: SignalHistoryRecord) => r.pair)).toEqual(['BTCUSD']);
    expect(body.stats.totalSignals).toBe(1);
  });

  it('requires Pro for CSV export', async () => {
    primeSlice([record({ id: 'btc-1', pair: 'BTCUSD' })]);

    const res = await GET(makeReq('/api/signals/history?format=csv'));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('upgrade_required');
    expect(body.reason).toContain('CSV export requires Pro');
  });

  it('exports filtered CSV for Pro callers', async () => {
    jest.spyOn(tier, 'getTierFromRequest').mockResolvedValueOnce('pro');
    primeSlice([
      record({ id: 'btc-1', pair: 'BTCUSD', strategyId: 'classic', gateReason: 'ok' }),
      record({ id: 'eth-1', pair: 'ETHUSD' }),
    ]);

    const res = await GET(makeReq('/api/signals/history?format=csv&pair=BTCUSD'));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(text).toContain('id,pair,timeframe,direction,confidence');
    expect(text).toContain('btc-1,BTCUSD,H1,BUY,75');
    expect(text).not.toContain('eth-1');
  });
});

describe('signalHistoryToCsv', () => {
  it('escapes commas and quotes in CSV cells', () => {
    const csv = signalHistoryToCsv([
      record({
        id: 'sig,quoted',
        gateReason: 'blocked "risk"',
      }),
    ]);

    expect(csv).toContain('"sig,quoted"');
    expect(csv).toContain('"blocked ""risk"""');
  });
});

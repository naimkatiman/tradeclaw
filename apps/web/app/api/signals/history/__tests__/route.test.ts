import { NextRequest } from 'next/server';
import type { SignalHistoryRecord } from '../../../../../lib/signal-history';

function countsAsRealOutcome(outcome: SignalHistoryRecord['outcomes']['24h']): boolean {
  return Boolean(outcome && (outcome.pnlPct !== 0 || outcome.hit));
}

jest.mock('../../../../../lib/signal-history', () => {
  const realOutcome = (outcome: SignalHistoryRecord['outcomes']['24h']) =>
    Boolean(outcome && (outcome.pnlPct !== 0 || outcome.hit));

  return {
    isRealOutcome: jest.fn(realOutcome),
    isCountedResolved: jest.fn((record: SignalHistoryRecord) =>
      !record.isSimulated
      && !record.gateBlocked
      && realOutcome(record.outcomes['24h']),
    ),
  };
});

jest.mock('../../../../../lib/signal-slice', () => ({
  parseScope: jest.fn((raw: string | null | undefined) => raw === 'broadcast' ? 'broadcast' : 'pro'),
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
    sourceRecordsLoaded: records.length,
    sourceReadLimit: 10_000,
    sourceWindowPotentiallyTruncated: false,
    scopedRecords: records,
    periodFiltered: records,
    resolved: records.filter(r =>
      !r.isSimulated
      && !r.gateBlocked
      && countsAsRealOutcome(r.outcomes['24h']),
    ),
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

  it('treats stale unresolved rows as expired instead of pending', async () => {
    const now = Date.now();
    primeSlice([
      record({
        id: 'recent-open',
        timestamp: now - (23 * 60 * 60 * 1000),
        outcomes: { '4h': null, '24h': null },
      }),
      record({
        id: 'stale-open',
        timestamp: now - (25 * 60 * 60 * 1000),
        outcomes: { '4h': null, '24h': null },
      }),
      record({
        id: 'auto-expired',
        timestamp: now - (49 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 100, pnlPct: 0, hit: false }, '24h': { price: 100, pnlPct: 0, hit: false } },
      }),
    ]);

    const res = await GET(makeReq('/api/signals/history'));
    const body = await res.json();

    expect(body.stats.totalSignals).toBe(3);
    expect(body.stats.pending).toBe(1);
    expect(body.stats.expired).toBe(2);
    expect(body.stats.resolved).toBe(0);
  });

  it('counts nonzero drift-expired closes as resolved, not expired', async () => {
    const now = Date.now();
    primeSlice([
      record({
        id: 'drift-win',
        timestamp: now - (25 * 60 * 60 * 1000),
        outcomes: {
          '4h': null,
          '24h': { price: 101, pnlPct: 1, hit: true, target: 'expired', source: 'binance' },
        },
      }),
      record({
        id: 'drift-loss',
        timestamp: now - (25 * 60 * 60 * 1000),
        outcomes: {
          '4h': null,
          '24h': { price: 99.5, pnlPct: -0.5, hit: false, target: 'expired', source: 'binance' },
        },
      }),
      record({
        id: 'force-expired',
        timestamp: now - (49 * 60 * 60 * 1000),
        outcomes: {
          '4h': null,
          '24h': { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' },
        },
      }),
    ]);

    const res = await GET(makeReq('/api/signals/history'));
    const body = await res.json();

    expect(body.stats.resolved).toBe(2);
    expect(body.stats.wins).toBe(1);
    expect(body.stats.losses).toBe(1);
    expect(body.stats.winRate).toBe(50);
    expect(body.stats.totalPnlPct).toBe(0.5);
    expect(body.stats.expired).toBe(1);
  });

  it.each([
    ['win', true],
    ['loss', false],
  ] as const)('outcome=%s returns only canonical counted records', async (filter, hit) => {
    const now = Date.now();
    const pnlPct = hit ? 1 : -1;
    primeSlice([
      record({
        id: `regular-${filter}`,
        timestamp: now - 1_000,
        outcomes: { '4h': null, '24h': { price: 100 + pnlPct, pnlPct, hit, target: hit ? 'TP1' : 'SL' } },
      }),
      record({
        id: `drift-${filter}`,
        timestamp: now - 2_000,
        outcomes: { '4h': null, '24h': { price: 100 + pnlPct / 2, pnlPct: pnlPct / 2, hit, target: 'expired' } },
      }),
      record({
        id: 'force-expired',
        timestamp: now - 3_000,
        outcomes: { '4h': null, '24h': { price: 100, pnlPct: 0, hit: false, target: 'expired' } },
      }),
      record({ id: `simulated-${filter}`, timestamp: now - 4_000, isSimulated: true, outcomes: { '4h': null, '24h': { price: 100 + pnlPct, pnlPct, hit } } }),
      record({ id: `gated-${filter}`, timestamp: now - 5_000, gateBlocked: true, outcomes: { '4h': null, '24h': { price: 100 + pnlPct, pnlPct, hit } } }),
    ]);

    const res = await GET(makeReq(`/api/signals/history?outcome=${filter}`));
    const body = await res.json();

    expect(body.records.map((r: SignalHistoryRecord) => r.id).sort()).toEqual([
      `drift-${filter}`,
      `regular-${filter}`,
    ]);
    expect(body.stats.totalSignals).toBe(2);
    expect(body.stats.resolved).toBe(2);
    expect(body.stats[filter === 'win' ? 'wins' : 'losses']).toBe(2);
  });

  it('excludes stale open rows from outcome=pending filters', async () => {
    const now = Date.now();
    primeSlice([
      record({
        id: 'recent-open',
        timestamp: now - (12 * 60 * 60 * 1000),
        outcomes: { '4h': null, '24h': null },
      }),
      record({
        id: 'stale-open',
        timestamp: now - (26 * 60 * 60 * 1000),
        outcomes: { '4h': null, '24h': null },
      }),
      record({
        id: 'resolved-win',
        timestamp: now - (26 * 60 * 60 * 1000),
        outcomes: { '4h': { price: 101, pnlPct: 1, hit: true }, '24h': { price: 102, pnlPct: 2, hit: true } },
      }),
    ]);

    const res = await GET(makeReq('/api/signals/history?outcome=pending'));
    const body = await res.json();

    expect(body.records.map((r: SignalHistoryRecord) => r.id)).toEqual(['recent-open']);
    expect(body.stats.totalSignals).toBe(1);
    expect(body.stats.pending).toBe(1);
    expect(body.stats.expired).toBe(0);
    expect(body.stats.resolved).toBe(0);
  });

  it('splits live vs simulated over full history, not the page slice', async () => {
    primeSlice([
      record({ id: 'live-1', pair: 'BTCUSD', isSimulated: false }),
      record({ id: 'live-2', pair: 'ETHUSD', isSimulated: false }),
      record({ id: 'seed-1', pair: 'SOLUSD', isSimulated: true }),
    ]);

    // limit=1 paginates so only one row is on the page; provenance counts must
    // still reflect all three rows (the bug this fixes mislabeled a clean page).
    const res = await GET(makeReq('/api/signals/history?limit=1'));
    const body = await res.json();

    expect(body.records).toHaveLength(1);
    expect(body.stats.totalSignals).toBe(3);
    expect(body.stats.live).toBe(2);
    expect(body.stats.simulated).toBe(1);
    expect(typeof body.latestTimestamp).toBe('number');
    expect(typeof body.stats.avgConfidenceResolved).toBe('number');
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

  it('exports filtered CSV for anonymous callers — no tier gate', async () => {
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

  it('exports outcome source and resolution timestamps for auditability', () => {
    const csv = signalHistoryToCsv([
      record({
        outcomes: {
          '4h': null,
          '24h': {
            price: 101,
            pnlPct: 1,
            hit: true,
            target: 'TP1',
            source: 'binance',
            resolvedAt: '2026-07-14T05:00:00.000Z',
          },
        },
      }),
    ]);

    expect(csv).toContain('outcome24hSource,outcome24hResolvedAt');
    expect(csv).toContain('binance,2026-07-14T05:00:00.000Z');
  });
});

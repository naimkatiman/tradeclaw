jest.mock('@/lib/signal-history', () => {
  const actual = jest.requireActual('@/lib/signal-history');
  return { ...actual, readHistoryAsync: jest.fn() };
});

import { GET, aggregateCalendarOutcomes } from './route';
import { readHistoryAsync, type SignalHistoryRecord } from '@/lib/signal-history';

const mockedHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;

function record(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 70,
    entryPrice: 50000,
    timestamp: Date.UTC(2026, 6, 10, 12),
    outcomes: {
      '4h': null,
      '24h': { price: 50500, pnlPct: 1, hit: true, target: 'TP1', source: 'binance' },
    },
    ...overrides,
  };
}

describe('calendar counted outcomes', () => {
  beforeEach(() => mockedHistory.mockReset());

  it('aggregates only canonical counted 24h outcomes', () => {
    const days = aggregateCalendarOutcomes([
      record({ id: 'hit' }),
      record({
        id: 'miss',
        pair: 'ETHUSD',
        outcomes: { '4h': null, '24h': { price: 49000, pnlPct: -2, hit: false, target: 'SL', source: 'binance' } },
      }),
      record({ id: 'simulated', isSimulated: true }),
      record({ id: 'blocked', gateBlocked: true }),
      record({
        id: 'force-expired',
        outcomes: { '4h': null, '24h': { price: 50000, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' } },
      }),
    ], new Date(Date.UTC(2026, 6, 15)));

    expect(days).toEqual([{
      date: '2026-07-10',
      hitRate: 50,
      countedOutcomes: 2,
      hits: 1,
      misses: 1,
      mostObservedPair: 'BTCUSD',
    }]);
  });

  it('returns an empty response instead of invented calendar values', async () => {
    mockedHistory.mockResolvedValue([]);
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.days).toEqual([]);
    expect(body.countedOutcomeCount).toBe(0);
    expect(body.methodology).toContain('OHLCV-resolved');
  });
});

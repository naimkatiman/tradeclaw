import type { SignalHistoryRecord } from '../../../../../lib/signal-history';

jest.mock('../../../../../lib/signal-history', () => ({
  readHistoryAsync: jest.fn(),
}));

import { readHistoryAsync } from '../../../../../lib/signal-history';
import { GET } from '../route';

const mockedReadHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;

function record(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'ETHUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    timestamp: Date.now() - 30 * 60 * 1000,
    outcomes: { '4h': null, '24h': null },
    ...overrides,
  };
}

describe('GET /api/live/stats truth boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('derives activity from recorded eligible rows and exposes persisted last-signal time', async () => {
    const latest = Date.now() - 10 * 60 * 1000;
    mockedReadHistory.mockResolvedValue([
      record({ timestamp: latest }),
      record({ id: 'older', pair: 'BTCUSD', timestamp: Date.now() - 2 * 60 * 60 * 1000 }),
      record({ id: 'simulated', isSimulated: true }),
      record({ id: 'blocked', gateBlocked: true }),
      record({ id: 'future', timestamp: Date.now() + 60 * 60 * 1000 }),
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.signalsLastHour).toBe(1);
    expect(body.signalsLast24h).toBe(2);
    expect(body.activeAssets).toBe(2);
    expect(body.lastSignalTime).toBe(new Date(latest).toISOString());
    expect(body.hourlyBuckets.reduce((sum: number, count: number) => sum + count, 0)).toBe(2);
  });

  it('uses nulls rather than a default asset or current signal timestamp for empty history', async () => {
    mockedReadHistory.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      available: false,
      signalsLastHour: 0,
      signalsLast24h: 0,
      activeAssets: 0,
      topPair: null,
      lastSignalTime: null,
    });
  });

  it('fails closed when recorded history is unavailable', async () => {
    mockedReadHistory.mockRejectedValue(new Error('db unavailable'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      available: false,
      signalsLastHour: null,
      topPair: null,
      lastSignalTime: null,
      error: 'recorded_signal_history_unavailable',
    });
  });
});

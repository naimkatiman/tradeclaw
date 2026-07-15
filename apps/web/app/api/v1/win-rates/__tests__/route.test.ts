import type { SignalHistoryRecord } from '../../../../../lib/signal-history';

jest.mock('../../../../../lib/signal-history', () => ({
  readHistoryAsync: jest.fn(),
  isCountedResolved: jest.fn((record: SignalHistoryRecord) => {
    const outcome = record.outcomes['24h'];
    return !record.isSimulated
      && !record.gateBlocked
      && Boolean(outcome)
      && outcome!.source === 'binance'
      && (outcome!.pnlPct !== 0 || outcome!.hit);
  }),
}));

import { readHistoryAsync } from '../../../../../lib/signal-history';
import { GET } from '../route';

const mockedReadHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;

function record(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    timestamp: Date.now() - 48 * 60 * 60 * 1000,
    outcomes: {
      '4h': null,
      '24h': {
        price: 101,
        pnlPct: 1,
        hit: true,
        source: 'binance',
        resolvedAt: '2026-07-14T12:00:00.000Z',
      },
    },
    ...overrides,
  };
}

describe('GET /api/v1/win-rates truth boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates only canonical observed-provenance 24h outcomes', async () => {
    mockedReadHistory.mockResolvedValue([
      record(),
      record({
        id: 'observed-loss',
        outcomes: {
          '4h': null,
          '24h': {
            price: 99,
            pnlPct: -1,
            hit: false,
            source: 'binance',
            resolvedAt: '2026-07-15T12:00:00.000Z',
          },
        },
      }),
      record({
        id: 'legacy-unproven',
        outcomes: {
          '4h': null,
          '24h': { price: 120, pnlPct: 20, hit: true },
        },
      }),
      record({ id: 'simulated', isSimulated: true }),
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.overall).toEqual({ total: 2, wins: 1, win_rate: 50 });
    expect(body.win_rates).toEqual([
      { symbol: 'BTCUSD', direction: 'BUY', total: 2, wins: 1, win_rate: 50 },
    ]);
    expect(body.generated_at).toBe('2026-07-15T12:00:00.000Z');
    expect(body.methodology.limitation).toMatch(/not broker fills/i);
  });

  it('does not manufacture a timestamp or win rate when no counted outcomes exist', async () => {
    mockedReadHistory.mockResolvedValue([
      record({
        outcomes: {
          '4h': null,
          '24h': { price: 101, pnlPct: 1, hit: true },
        },
      }),
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.available).toBe(false);
    expect(body.overall).toBeNull();
    expect(body.generated_at).toBeNull();
    expect(body.win_rates).toEqual([]);
  });

  it('returns 503 rather than zero-like success when history cannot be read', async () => {
    mockedReadHistory.mockRejectedValue(new Error('db unavailable'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      available: false,
      overall: null,
      generated_at: null,
      error: 'observed_history_unavailable',
    });
  });
});

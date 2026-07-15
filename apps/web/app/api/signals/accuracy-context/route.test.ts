jest.mock('@/lib/signal-history', () => {
  const actual = jest.requireActual('@/lib/signal-history');
  return { ...actual, readHistoryAsync: jest.fn() };
});

import { NextRequest } from 'next/server';
import { readHistoryAsync, type SignalHistoryRecord } from '@/lib/signal-history';
import { GET } from './route';

const mockedHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;

function record(id: string, overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id,
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 75,
    entryPrice: 100,
    timestamp: 1_700_000_000_000,
    isSimulated: false,
    gateBlocked: false,
    outcomes: {
      '4h': null,
      '24h': { price: 101, pnlPct: 1, hit: true, source: 'binance' },
    },
    ...overrides,
  };
}

describe('GET /api/signals/accuracy-context', () => {
  beforeEach(() => mockedHistory.mockReset());

  it('passes typed history through the canonical accuracy denominator', async () => {
    mockedHistory.mockResolvedValue([
      record('win'),
      record('drift-loss', {
        outcomes: { '4h': null, '24h': { price: 99, pnlPct: -1, hit: false, target: 'expired', source: 'binance' } },
      }),
      record('placeholder', {
        outcomes: { '4h': null, '24h': { price: 100, pnlPct: 0, hit: false, target: 'expired', source: 'force-expired' } },
      }),
      record('gated', { gateBlocked: true }),
    ]);

    const request = new NextRequest('http://localhost/api/signals/accuracy-context?symbol=BTCUSD&timeframe=H1');
    const response = await GET(request);
    const body = await response.json();

    expect(body.accuracy).toMatchObject({ sampleSize: 2, winRate: 50 });
  });
});

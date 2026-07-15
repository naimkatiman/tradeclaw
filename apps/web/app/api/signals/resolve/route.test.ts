jest.mock('../../../lib/ohlcv', () => ({ getOHLCV: jest.fn() }));
jest.mock('../../../../lib/cron-auth', () => ({ requireCronAuth: jest.fn().mockReturnValue(null) }));

jest.mock('../../../../lib/signal-history', () => ({
  getPendingRecordsAsync: jest.fn(),
  updateRecordsAsync: jest.fn(),
  resolveFromCandles: jest.fn(),
  getOutcomeResolutionTimeframe: jest.fn().mockReturnValue('H1'),
  isObservedOHLCVOutcomeSource: jest.fn((source: unknown) => (
    ['market-data-hub', 'binance', 'stooq', 'kraken', 'cryptocompare'].includes(String(source))
  )),
}));

import { getOHLCV } from '../../../lib/ohlcv';
import { requireCronAuth } from '../../../../lib/cron-auth';
import {
  getPendingRecordsAsync,
  resolveFromCandles,
  updateRecordsAsync,
  type SignalHistoryRecord,
} from '../../../../lib/signal-history';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';

const mockGetOHLCV = getOHLCV as jest.MockedFunction<typeof getOHLCV>;
const mockGetPendingRecords = getPendingRecordsAsync as jest.MockedFunction<typeof getPendingRecordsAsync>;
const mockResolveFromCandles = resolveFromCandles as jest.MockedFunction<typeof resolveFromCandles>;
const mockUpdateRecords = updateRecordsAsync as jest.MockedFunction<typeof updateRecordsAsync>;
const mockRequireCronAuth = requireCronAuth as jest.MockedFunction<typeof requireCronAuth>;

const NOW = Date.parse('2026-07-15T12:00:00.000Z');

function pendingRecord(): SignalHistoryRecord {
  return {
    id: 'pending-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    timestamp: NOW - 25 * 60 * 60 * 1000,
    tp1: 105,
    sl: 95,
    outcomes: { '4h': null, '24h': null },
  };
}

describe('/api/signals/resolve outcome provenance', () => {
  function request(): NextRequest {
    return new NextRequest('http://localhost/api/signals/resolve', { method: 'POST' });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockGetPendingRecords.mockResolvedValue([pendingRecord()]);
    mockRequireCronAuth.mockReturnValue(null);
    mockUpdateRecords.mockResolvedValue(1);
    mockResolveFromCandles.mockReturnValue({
      outcome: { price: 105, pnlPct: 5, hit: true, target: 'TP1' },
      maxAdverseExcursion: 1,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stamps observed provider provenance on real resolutions', async () => {
    mockGetOHLCV.mockResolvedValue({
      source: 'market-data-hub',
      candles: [{
        timestamp: pendingRecord().timestamp + 60 * 60 * 1000,
        open: 100,
        high: 106,
        low: 99,
        close: 105,
        volume: 10,
      }],
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    const updates = mockUpdateRecords.mock.calls[0][0];
    expect(updates[0].patch.outcomes?.['4h']).toEqual(expect.objectContaining({
      source: 'market-data-hub',
      resolvedAt: new Date(NOW).toISOString(),
    }));
    expect(updates[0].patch.outcomes?.['24h']).toEqual(expect.objectContaining({
      source: 'market-data-hub',
      resolvedAt: new Date(NOW).toISOString(),
    }));
  });

  it.each(['synthetic', 'unavailable', 'unknown'] as const)(
    'refuses %s candles and cannot write a counted 24h result',
    async (source) => {
      mockGetOHLCV.mockResolvedValue({
        source: source as 'synthetic',
        candles: [{
          timestamp: pendingRecord().timestamp + 60 * 60 * 1000,
          open: 100,
          high: 106,
          low: 99,
          close: 105,
          volume: 10,
        }],
      });

      const response = await POST(request());
      const body = await response.json();

      expect(mockResolveFromCandles).not.toHaveBeenCalled();
      const updates = mockUpdateRecords.mock.calls[0][0];
      expect(updates[0].patch.outcomes?.['4h']).toEqual(expect.objectContaining({
        source: 'force-expired',
        pnlPct: 0,
      }));
      expect(updates[0].patch.outcomes?.['24h']).toBeNull();
      expect(body.errors.join(' ')).toContain(`Refusing unobserved OHLCV source ${source}`);
    },
  );

  it('rejects an unauthenticated mutation before reading evidence rows', async () => {
    mockRequireCronAuth.mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mockGetPendingRecords).not.toHaveBeenCalled();
  });

  it('does not mutate evidence through GET', async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(mockGetPendingRecords).not.toHaveBeenCalled();
  });
});

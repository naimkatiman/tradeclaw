jest.mock('../../lib/ohlcv', () => ({
  getOHLCV: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getOHLCV } from '../../lib/ohlcv';
import { GET } from './route';

const mockedGetOHLCV = getOHLCV as jest.MockedFunction<typeof getOHLCV>;

const candle = {
  timestamp: 1_700_000_000_000,
  open: 100,
  high: 101,
  low: 99,
  close: 100.5,
  volume: 1_000,
};

describe('/api/backtest observed-data boundary', () => {
  it.each([
    {
      name: 'an unavailable provider result',
      result: { candles: [], source: 'unavailable' as const },
      reason: 'source-empty',
    },
    {
      name: 'legacy synthetic candles',
      result: { candles: [candle], source: 'synthetic' as const },
      reason: 'synthetic-source-rejected',
    },
  ])('fails closed for $name', async ({ result, reason }) => {
    mockedGetOHLCV.mockResolvedValue(result);

    const response = await GET(
      new NextRequest('http://localhost/api/backtest?symbol=XAUUSD&timeframe=H1'),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      available: false,
      error: 'No observed OHLCV data available for XAUUSD H1',
      reason,
    });
    expect(body).not.toHaveProperty('candles');
  });
});

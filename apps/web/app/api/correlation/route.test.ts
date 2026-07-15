jest.mock('../../lib/ohlcv', () => ({
  getMultiOHLCV: jest.fn(),
}));

import { getMultiOHLCV } from '../../lib/ohlcv';
import { GET } from './route';

const mockedGetMultiOHLCV = getMultiOHLCV as jest.MockedFunction<typeof getMultiOHLCV>;

function candles(multiplier: number) {
  return Array.from({ length: 35 }, (_, index) => ({
    timestamp: 1_700_000_000_000 + index * 3_600_000,
    open: 100 + index * multiplier,
    high: 101 + index * multiplier,
    low: 99 + index * multiplier,
    close: 100 + index * multiplier + (index % 3) * 0.2,
    volume: 1_000,
  }));
}

describe('/api/correlation observed-data boundary', () => {
  it('returns unavailable instead of a zero-filled matrix', async () => {
    mockedGetMultiOHLCV.mockResolvedValue(new Map([
      ['BTCUSD', { candles: [], source: 'synthetic' }],
    ]) as Awaited<ReturnType<typeof getMultiOHLCV>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ available: false, matrix: [] });
  });

  it('computes returns only on common observed timestamps and exposes provenance', async () => {
    mockedGetMultiOHLCV.mockResolvedValue(new Map([
      ['BTCUSD', { candles: candles(1), source: 'binance' }],
      ['ETHUSD', { candles: candles(0.7), source: 'market-data-hub' }],
    ]) as Awaited<ReturnType<typeof getMultiOHLCV>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: true,
      assets: ['BTCUSD', 'ETHUSD'],
      sampleSize: 34,
      method: 'pearson-log-returns-common-hourly-timestamps',
      sources: { BTCUSD: 'binance', ETHUSD: 'market-data-hub' },
    });
    expect(body.matrix).toHaveLength(2);
  });
});

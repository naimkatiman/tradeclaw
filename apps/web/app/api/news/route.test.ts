import { NextRequest } from 'next/server';
import { GET } from './route';

jest.mock('../../../lib/tracked-signals', () => ({
  getTrackedSignalsForRequest: jest.fn(),
}));

describe('news source integrity', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fails closed without generated market prices when CoinGecko is degraded', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const response = await GET(new NextRequest('http://localhost/api/news'));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.available).toBe(false);
    expect(body.trending).toEqual([]);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

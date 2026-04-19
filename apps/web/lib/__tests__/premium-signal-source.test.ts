import { fetchPremiumFromHttp } from '../premium-signal-source';

describe('premium-signal-source — graceful degradation', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PREMIUM_SIGNAL_SOURCE_URL;
    delete process.env.PREMIUM_SIGNAL_SOURCE_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns [] when neither env var is set (self-host default)', async () => {
    const result = await fetchPremiumFromHttp();
    expect(result).toEqual([]);
  });

  it('returns [] when URL is set but key is missing', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    const result = await fetchPremiumFromHttp();
    expect(result).toEqual([]);
  });

  it('returns [] when key is set but URL is missing', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const result = await fetchPremiumFromHttp();
    expect(result).toEqual([]);
  });

  it('returns [] and does not throw when the remote fetch rejects', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toEqual([]);
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns [] when remote returns a non-2xx', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () =>
      new Response('unauthorized', { status: 401 }),
    ) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toEqual([]);
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns parsed signals when remote responds 200 with a signals array', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          signals: [
            {
              id: 'r-1',
              strategyId: 'tv-zaky-classic',
              symbol: 'EURUSD',
              timeframe: 'H1',
              direction: 'BUY',
              confidence: 90,
              entry: 1.08,
              stopLoss: 1.07,
              takeProfit1: 1.09,
              timestamp: 1_700_000_000_000,
              source: 'real',
              dataQuality: 'real',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('EURUSD');
      expect(result[0]?.strategyId).toBe('tv-zaky-classic');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('sends the shared secret as a Bearer token', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret-abc';
    const origFetch = global.fetch;
    const spy = jest.fn(async () =>
      new Response(JSON.stringify({ signals: [] }), { status: 200 }),
    ) as unknown as typeof fetch;
    global.fetch = spy;
    try {
      await fetchPremiumFromHttp();
      const call = (spy as unknown as jest.Mock).mock.calls[0];
      const init = call[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer secret-abc');
      expect(headers.Accept).toBe('application/json');
    } finally {
      global.fetch = origFetch;
    }
  });

  it('returns [] when body is valid JSON but has no signals array', async () => {
    process.env.PREMIUM_SIGNAL_SOURCE_URL = 'https://example.com/feed';
    process.env.PREMIUM_SIGNAL_SOURCE_KEY = 'secret';
    const origFetch = global.fetch;
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ other: 'shape' }), { status: 200 }),
    ) as unknown as typeof fetch;
    try {
      const result = await fetchPremiumFromHttp();
      expect(result).toEqual([]);
    } finally {
      global.fetch = origFetch;
    }
  });
});

/**
 * URL-routing tests for binance-futures.ts.
 *
 * Goal: with BINANCE_BASE_URL=testnet and BINANCE_MARKET_DATA_URL=mainnet,
 *   - getKlines, getMarkPrice, get24hVolume hit mainnet
 *   - getExchangeInfo, getServerTime hit testnet
 *   - signed endpoints (getAccount, placeOrder…) hit testnet
 *
 * We intercept fetch and assert the URL the client called.
 */

const TESTNET = 'https://testnet.binancefuture.com';
const MAINNET = 'https://fapi.binance.com';

interface FetchCall {
  url: string;
}

function installFetchSpy(responseBody: unknown): FetchCall[] {
  const calls: FetchCall[] = [];
  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url });
    return new Response(JSON.stringify(responseBody), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}

describe('binance-futures URL routing — split market data', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BINANCE_BASE_URL = TESTNET;
    process.env.BINANCE_MARKET_DATA_URL = MAINNET;
    process.env.BINANCE_API_KEY = 'k';
    process.env.BINANCE_API_SECRET = 's';
  });

  test('getKlines hits market-data URL (mainnet)', async () => {
    const calls = installFetchSpy([]);
    const mod = await import('./binance-futures');
    await mod.getKlines('BTCUSDT', '1h', 10);
    expect(calls[0].url.startsWith(MAINNET)).toBe(true);
    expect(calls[0].url).not.toContain('testnet');
  });

  test('getMarkPrice hits market-data URL (mainnet)', async () => {
    const calls = installFetchSpy({ markPrice: '100' });
    const mod = await import('./binance-futures');
    await mod.getMarkPrice('BTCUSDT');
    expect(calls[0].url.startsWith(MAINNET)).toBe(true);
  });

  test('get24hVolume hits market-data URL (mainnet)', async () => {
    const calls = installFetchSpy([{ symbol: 'BTCUSDT', quoteVolume: '1000' }]);
    const mod = await import('./binance-futures');
    await mod.get24hVolume();
    expect(calls[0].url.startsWith(MAINNET)).toBe(true);
  });

  test('getExchangeInfo hits trading URL (testnet) — must match venue', async () => {
    const calls = installFetchSpy({ symbols: [] });
    const mod = await import('./binance-futures');
    await mod.getExchangeInfo();
    expect(calls[0].url.startsWith(TESTNET)).toBe(true);
  });

  test('getServerTime hits trading URL (testnet) — clock for signing', async () => {
    const calls = installFetchSpy({ serverTime: 1 });
    const mod = await import('./binance-futures');
    await mod.getServerTime();
    expect(calls[0].url.startsWith(TESTNET)).toBe(true);
  });

  test('isMarketDataSplit detects asymmetric URLs', async () => {
    const mod = await import('./binance-futures');
    expect(mod.isMarketDataSplit()).toBe(true);
  });
});

describe('binance-futures URL routing — single URL fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BINANCE_BASE_URL = TESTNET;
    delete process.env.BINANCE_MARKET_DATA_URL;
    process.env.BINANCE_API_KEY = 'k';
    process.env.BINANCE_API_SECRET = 's';
  });

  test('getKlines falls back to BINANCE_BASE_URL when market-data URL unset', async () => {
    const calls = installFetchSpy([]);
    const mod = await import('./binance-futures');
    await mod.getKlines('BTCUSDT', '1h', 10);
    expect(calls[0].url.startsWith(TESTNET)).toBe(true);
  });

  test('isMarketDataSplit returns false when URLs match (single-venue deploy)', async () => {
    const mod = await import('./binance-futures');
    expect(mod.isMarketDataSplit()).toBe(false);
  });

  test('isMarketDataSplit returns false when override equals base URL', async () => {
    process.env.BINANCE_MARKET_DATA_URL = TESTNET;
    const mod = await import('./binance-futures');
    expect(mod.isMarketDataSplit()).toBe(false);
  });
});

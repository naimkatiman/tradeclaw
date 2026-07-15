jest.mock('../../lib/data-providers', () => ({
  fetchBinancePrices: jest.fn(),
  fetchHubQuotes: jest.fn(),
  isHubEnabled: jest.fn(),
}));

import { GET } from './route';
import {
  fetchBinancePrices,
  fetchHubQuotes,
  isHubEnabled,
} from '../../lib/data-providers';
import fs from 'fs';
import path from 'path';

const mockedHub = fetchHubQuotes as jest.MockedFunction<typeof fetchHubQuotes>;
const mockedBinance = fetchBinancePrices as jest.MockedFunction<typeof fetchBinancePrices>;
const mockedHubEnabled = isHubEnabled as jest.MockedFunction<typeof isHubEnabled>;

describe('GET /api/prices', () => {
  beforeEach(() => {
    mockedHub.mockReset();
    mockedBinance.mockReset();
    mockedHubEnabled.mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  it('returns only provider-backed entries and preserves missing change as null', async () => {
    mockedHub.mockResolvedValue([
      { symbol: 'BTCUSD', price: 70000, change24h: 1.2, source: 'hub' },
    ] as Awaited<ReturnType<typeof fetchHubQuotes>>);
    mockedBinance.mockResolvedValue([
      { symbol: 'BTCUSD', price: 69999, change24h: 1.1, source: 'binance' },
      { symbol: 'ETHUSD', price: 2200, source: 'binance' },
    ] as Awaited<ReturnType<typeof fetchBinancePrices>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.prices).toEqual({
      BTCUSD: { price: 70000, change24h: 1.2, source: 'hub' },
      ETHUSD: { price: 2200, change24h: null, source: 'binance' },
    });
    expect(JSON.stringify(body)).not.toContain('fallback');
  });

  it('keeps successful Stooq symbols and omits unavailable symbols', async () => {
    mockedHub.mockRejectedValue(new Error('hub down'));
    mockedBinance.mockRejectedValue(new Error('binance down'));
    global.fetch = jest.fn().mockImplementation(async (url: string) => ({
      ok: url.includes('s=eurusd'),
      text: async () => 'Close\n1.0875\n',
    })) as jest.Mock;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.prices).toEqual({
      EURUSD: { price: 1.0875, change24h: null, source: 'stooq' },
    });
    expect(body.prices.GBPUSD).toBeUndefined();
    expect(body.partial).toBe(true);
  });

  it('returns a non-cacheable 503 with no prices when every provider is unavailable', async () => {
    mockedHub.mockRejectedValue(new Error('hub down'));
    mockedBinance.mockRejectedValue(new Error('binance down'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({ count: 0, prices: {}, unavailable: true });
  });
});

describe('price consumers', () => {
  function appSource(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
  }

  it('renders missing values as unavailable instead of entry-price or static defaults', () => {
    const paperTrading = appSource('paper-trading/page.tsx');
    const ticker = appSource('components/price-ticker.tsx');
    expect(paperTrading).not.toContain('INITIAL_PRICES');
    expect(paperTrading).not.toContain('?? pos.entryPrice');
    expect(paperTrading).toContain('Price unavailable');
    expect(ticker).toContain('Provider prices unavailable');
    expect(ticker).toContain('change unavailable');
  });
});

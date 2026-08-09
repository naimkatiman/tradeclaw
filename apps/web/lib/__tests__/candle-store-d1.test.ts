jest.mock('../db-pool', () => ({
  query: jest.fn(),
}));

import { query } from '../db-pool';
import { backfillDailyCandles, refreshDailyCandles } from '../candle-store';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const realFetch = global.fetch;
const DAY_MS = 86_400_000;

afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
  mockedQuery.mockReset();
});

describe('refreshDailyCandles', () => {
  it('appends only provably closed UTC-D1 Binance bars', async () => {
    const now = Date.UTC(2026, 7, 8, 12);
    const closedOpen = Date.UTC(2026, 7, 7);
    const openOpen = Date.UTC(2026, 7, 8);
    jest.spyOn(Date, 'now').mockReturnValue(now);
    mockedQuery.mockResolvedValue([{ ts: String(closedOpen) }]);
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [
        [closedOpen, '100', '110', '90', '105', '12'],
        [openOpen, '105', '115', '95', '111', '13'],
      ],
    })) as unknown as typeof fetch;

    await expect(refreshDailyCandles('BTCUSD')).resolves.toBe(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('symbol=BTCUSDT&interval=1d'),
      expect.any(Object),
    );
    const [sql, params] = mockedQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO candles');
    expect(params).toEqual([
      'BTCUSD', 'D1', closedOpen, 100, 110, 90, 105, 12, 'binance',
    ]);
    expect(openOpen + DAY_MS).toBeGreaterThan(now);
  });

  it('backfills paginated closed D1 history from an explicit UTC boundary', async () => {
    const start = Date.UTC(2017, 8, 1);
    const firstPageLast = start + 999 * DAY_MS;
    const secondPageOpen = firstPageLast + DAY_MS;
    jest.spyOn(Date, 'now').mockReturnValue(secondPageOpen + 2 * DAY_MS);
    mockedQuery
      .mockResolvedValueOnce(Array.from({ length: 1000 }, (_, index) => ({ ts: String(start + index * DAY_MS) })))
      .mockResolvedValueOnce([{ ts: String(secondPageOpen) }]);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => Array.from({ length: 1000 }, (_, index) => [
          start + index * DAY_MS, '100', '110', '90', '105', '12',
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[secondPageOpen, '105', '115', '95', '111', '13']],
      }) as unknown as typeof fetch;

    await expect(backfillDailyCandles('BTCUSD', start)).resolves.toBe(1001);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(`startTime=${start}`),
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`startTime=${secondPageOpen}`),
      expect.any(Object),
    );
    expect(mockedQuery).toHaveBeenCalledTimes(2);
  });
});

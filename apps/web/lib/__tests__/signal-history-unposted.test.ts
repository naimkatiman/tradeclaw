/**
 * Tests for getUnpostedProSignalsAsync — the catch-up query the cron uses
 * to broadcast tradable signals that the request-side writer recorded but
 * never broadcast (callerIsPaid was false).
 */

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
  getPool: jest.fn(),
}));

const ORIG_ENV = { ...process.env };

import { query } from '../db-pool';
import { getUnpostedProSignalsAsync } from '../signal-history';

const mockedQuery = query as jest.MockedFunction<typeof query>;

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  process.env.DATABASE_URL = 'postgres://stub';
  mockedQuery.mockReset();
});

afterAll(() => {
  process.env = ORIG_ENV;
});

const baseRow = {
  id: 'SIG-XAUUSD-H1-BUY-XYZ',
  pair: 'XAUUSD',
  timeframe: 'H1',
  direction: 'BUY',
  confidence: 75,
  entry_price: 2410.55,
  tp1: 2420,
  sl: 2400,
  is_simulated: false,
  outcome_4h: null,
  outcome_24h: null,
  telegram_posted_at: null,
  telegram_message_id: null,
  created_at: '2026-05-06T16:45:00.000Z',
  last_verified: null,
  strategy_id: 'classic',
  mode: 'intraday',
  entry_atr: null,
  atr_multiplier: null,
  max_adverse_excursion: null,
  gate_blocked: false,
  gate_reason: null,
};

describe('getUnpostedProSignalsAsync', () => {
  it('returns empty array when DATABASE_URL is unset (file-fallback path)', async () => {
    delete process.env.DATABASE_URL;
    const result = await getUnpostedProSignalsAsync(10 * 60 * 1000);
    expect(result).toEqual([]);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it('queries with the unposted + tradable + tp1/sl-present filter', async () => {
    mockedQuery.mockResolvedValueOnce([]);
    await getUnpostedProSignalsAsync(10 * 60 * 1000);
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toMatch(/telegram_pro_message_id IS NULL/);
    expect(sql).toMatch(/COALESCE\(gate_blocked,\s*false\)\s*=\s*false/);
    expect(sql).toMatch(/tp1 IS NOT NULL/);
    expect(sql).toMatch(/sl IS NOT NULL/);
    expect(sql).toMatch(/created_at\s*>=\s*\$1/);
    // The cutoff param is an ISO timestamp ~10 minutes ago
    const [cutoff] = params as [string];
    const cutoffMs = Date.parse(cutoff);
    const expected = Date.now() - 10 * 60 * 1000;
    expect(Math.abs(cutoffMs - expected)).toBeLessThan(1500);
  });

  it('maps rows into SignalHistoryRecord shape', async () => {
    mockedQuery.mockResolvedValueOnce([baseRow]);
    const result = await getUnpostedProSignalsAsync(10 * 60 * 1000);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: baseRow.id,
      pair: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      confidence: 75,
      entryPrice: 2410.55,
      tp1: 2420,
      sl: 2400,
      gateBlocked: false,
    });
  });

  it('orders ascending by created_at so older signals broadcast first', async () => {
    mockedQuery.mockResolvedValueOnce([]);
    await getUnpostedProSignalsAsync(10 * 60 * 1000);
    const [sql] = mockedQuery.mock.calls[0];
    expect(sql).toMatch(/ORDER BY created_at ASC/);
  });
});

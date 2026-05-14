jest.mock('./binance-futures', () => ({
  currentMode: jest.fn(() => 'testnet'),
  getAccount: jest.fn(),
  getMarkPrice: jest.fn(),
  getIncomeSince: jest.fn(() => Promise.resolve([])),
  getOpenOrders: jest.fn(() => Promise.resolve([])),
  getOrderByClientId: jest.fn(() => Promise.resolve(null)),
  cancelOrder: jest.fn(),
  placeOrder: jest.fn(),
}));

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  execute: jest.fn(() => Promise.resolve()),
}));

jest.mock('./telegram', () => ({
  notifyPositionClosed: jest.fn(),
}));

import { getAccount, getMarkPrice } from './binance-futures';
import { query, execute } from '../db-pool';
import { runPositionManagerTick } from './position-manager';

const mockedGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockedGetMarkPrice = getMarkPrice as jest.MockedFunction<typeof getMarkPrice>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;

const openRow = {
  id: 'exec-1',
  signal_id: 'sig-1',
  symbol: 'BTCUSDT',
  side: 'BUY',
  qty: '1',
  entry_price: '50000',
  stop_price: '49000',
  tp1_price: '51000',
  status: 'filled',
  filled_at: new Date('2026-01-01T00:00:00Z'),
};

const accountNoPosition = {
  totalWalletBalance: 1000,
  totalUnrealizedProfit: 0,
  totalMarginBalance: 1000,
  availableBalance: 1000,
  positions: [],
};

describe('runPositionManagerTick — close detection writes exit_price', () => {
  beforeEach(() => {
    mockedGetAccount.mockReset();
    mockedGetMarkPrice.mockReset();
    mockedQuery.mockReset();
    mockedExecute.mockReset();
    mockedExecute.mockResolvedValue(undefined as never);
  });

  it('passes mark price into the markClosed UPDATE when position is gone on the exchange', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(mockedGetMarkPrice).toHaveBeenCalledWith('BTCUSDT');
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    expect(closeCall).toBeDefined();
    expect(closeCall?.[0]).toContain('exit_price=COALESCE($2, exit_price)');
    expect(closeCall?.[0]).toContain('realized_pnl=COALESCE($3, realized_pnl)');
    // getIncomeSince mocked to return [] → realized_pnl backfill yields null
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('still marks closed with NULL exit_price when getMarkPrice throws (fail-soft)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockRejectedValueOnce(new Error('network timeout'));

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0);
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    expect(closeCall?.[1]).toEqual(['exec-1', null, null]);
  });

  it('swallows 42703 (exit_price column missing — pre-031 deploy) without failing the tick', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    const colMissing = Object.assign(new Error('column "exit_price" does not exist'), { code: '42703' });
    mockedExecute.mockRejectedValueOnce(colMissing as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0);
  });
});

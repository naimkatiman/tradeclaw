jest.mock('./binance-futures', () => ({
  currentMode: jest.fn(() => 'testnet'),
  getAccount: jest.fn(),
  getMarkPrice: jest.fn(),
  getUserTrades: jest.fn(() => Promise.resolve([])),
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

import { getAccount, getMarkPrice, getUserTrades } from './binance-futures';
import { query, execute } from '../db-pool';
import { runPositionManagerTick } from './position-manager';

const mockedGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockedGetMarkPrice = getMarkPrice as jest.MockedFunction<typeof getMarkPrice>;
const mockedGetUserTrades = getUserTrades as jest.MockedFunction<typeof getUserTrades>;
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
  filled_at: null,
};

const accountNoPosition = {
  totalWalletBalance: 1000,
  totalUnrealizedProfit: 0,
  totalMarginBalance: 1000,
  availableBalance: 1000,
  positions: [],
};

describe('runPositionManagerTick — close detection writes exit_price and realized_pnl', () => {
  beforeEach(() => {
    mockedGetAccount.mockReset();
    mockedGetMarkPrice.mockReset();
    mockedGetUserTrades.mockReset();
    mockedQuery.mockReset();
    mockedExecute.mockReset();
    mockedExecute.mockResolvedValue(undefined as never);
    // Default: no trades → realized_pnl stays null
    mockedGetUserTrades.mockResolvedValue([] as never);
  });

  it('passes mark price and null realized_pnl into markClosed when no closing trades available', async () => {
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
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('backfills realized_pnl from getUserTrades when closing trades exist', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(51000);
    // Closing trade: +1000 gross PnL, 2 USDT commission
    mockedGetUserTrades.mockResolvedValueOnce([
      { symbol: 'BTCUSDT', id: 1, orderId: 10, side: 'SELL', price: '51000', qty: '1',
        realizedPnl: '1000', quoteQty: '51000', commission: '2', commissionAsset: 'USDT',
        time: Date.now(), positionSide: 'BOTH' },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    // 1000 gross - 2 commission = 998
    expect(closeCall?.[1]).toEqual(['exec-1', 51000, 998]);
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

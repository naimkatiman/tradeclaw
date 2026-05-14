jest.mock('./binance-futures', () => ({
  currentMode: jest.fn(() => 'testnet'),
  getAccount: jest.fn(),
  getMarkPrice: jest.fn(),
  getOpenOrders: jest.fn(() => Promise.resolve([])),
  getOrderByClientId: jest.fn(() => Promise.resolve(null)),
  cancelOrder: jest.fn(),
  placeOrder: jest.fn(),
  getUserTrades: jest.fn(() => Promise.resolve([])),
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

const FILLED_AT = new Date('2026-01-01T00:00:00Z');
const CREATED_AT = new Date('2026-01-01T00:00:00Z');

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
  filled_at: FILLED_AT,
  created_at: CREATED_AT,
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
    mockedGetUserTrades.mockResolvedValue([] as never);
  });

  it('passes mark price and null pnl into the markClosed UPDATE when no trades found', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTrades.mockResolvedValueOnce([] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(mockedGetMarkPrice).toHaveBeenCalledWith('BTCUSDT');
    expect(mockedGetUserTrades).toHaveBeenCalledWith('BTCUSDT', FILLED_AT.getTime());
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    expect(closeCall).toBeDefined();
    expect(closeCall?.[0]).toContain('exit_price=COALESCE($2, exit_price)');
    expect(closeCall?.[0]).toContain('realized_pnl=COALESCE($3, realized_pnl)');
    // No trades → pnl = null
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('backfills realized_pnl from userTrades (gross pnl minus USDT commission)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTrades.mockResolvedValueOnce([
      { realizedPnl: '100', commission: '2', commissionAsset: 'USDT' },
      { realizedPnl: '-50', commission: '1', commissionAsset: 'USDT' },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    // realized_pnl = (100 - 2) + (-50 - 1) = 47
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, 47]);
  });

  it('skips non-USDT commissions from pnl sum', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTrades.mockResolvedValueOnce([
      { realizedPnl: '80', commission: '0.001', commissionAsset: 'BNB' },
    ] as never);

    await runPositionManagerTick();

    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    // BNB commission not subtracted — pnl = 80 (gross)
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, 80]);
  });

  it('still marks closed with NULL pnl when getUserTrades throws (fail-soft)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTrades.mockRejectedValueOnce(new Error('network timeout') as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0);
    const closeCall = mockedExecute.mock.calls.find((c) =>
      typeof c[0] === 'string' && c[0].includes("status='closed'"),
    );
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('still marks closed with NULL exit_price when getMarkPrice throws (fail-soft)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockRejectedValueOnce(new Error('network timeout'));
    mockedGetUserTrades.mockResolvedValueOnce([] as never);

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
    mockedGetUserTrades.mockResolvedValueOnce([] as never);
    const colMissing = Object.assign(new Error('column "exit_price" does not exist'), { code: '42703' });
    mockedExecute.mockRejectedValueOnce(colMissing as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0);
  });

  it('uses createdAt-1h as trade window start when filled_at is null', async () => {
    const rowNoFilledAt = { ...openRow, filled_at: null };
    mockedQuery.mockResolvedValueOnce([rowNoFilledAt] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTrades.mockResolvedValueOnce([] as never);

    await runPositionManagerTick();

    const callArgs = mockedGetUserTrades.mock.calls[0];
    // startTimeMs should be createdAt - 1h
    expect(callArgs[0]).toBe('BTCUSDT');
    expect(callArgs[1]).toBe(CREATED_AT.getTime() - 3_600_000);
  });
});

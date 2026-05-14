jest.mock('./binance-futures', () => ({
  currentMode: jest.fn(() => 'testnet'),
  getAccount: jest.fn(),
  getMarkPrice: jest.fn(),
  getOpenOrders: jest.fn(() => Promise.resolve([])),
  getOrderByClientId: jest.fn(() => Promise.resolve(null)),
  cancelOrder: jest.fn(),
  placeOrder: jest.fn(),
  getUserTradesSince: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  execute: jest.fn(() => Promise.resolve()),
}));

jest.mock('./telegram', () => ({
  notifyPositionClosed: jest.fn(),
}));

import { getAccount, getMarkPrice, getUserTradesSince } from './binance-futures';
import { query, execute } from '../db-pool';
import { runPositionManagerTick } from './position-manager';

const mockedGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockedGetMarkPrice = getMarkPrice as jest.MockedFunction<typeof getMarkPrice>;
const mockedGetUserTradesSince = getUserTradesSince as jest.MockedFunction<typeof getUserTradesSince>;
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
  filled_at: new Date('2026-01-01T10:00:00Z'),
};

const accountNoPosition = {
  totalWalletBalance: 1000,
  totalUnrealizedProfit: 0,
  totalMarginBalance: 1000,
  availableBalance: 1000,
  positions: [],
};

function findCloseCall(calls: unknown[][]) {
  return calls.find(
    (c) => typeof c[0] === 'string' && (c[0] as string).includes("status='closed'"),
  );
}

describe('runPositionManagerTick — close detection writes exit_price', () => {
  beforeEach(() => {
    mockedGetAccount.mockReset();
    mockedGetMarkPrice.mockReset();
    mockedGetUserTradesSince.mockReset();
    mockedQuery.mockReset();
    mockedExecute.mockReset();
    mockedExecute.mockResolvedValue(undefined as never);
    // Default: no closing trades found
    mockedGetUserTradesSince.mockResolvedValue([] as never);
  });

  it('uses mark price as exit_price when no closing fills are found', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(mockedGetMarkPrice).toHaveBeenCalledWith('BTCUSDT');
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    expect(closeCall).toBeDefined();
    expect(closeCall?.[0]).toContain('exit_price=COALESCE($2, exit_price)');
    expect(closeCall?.[0]).toContain('realized_pnl=COALESCE($3, realized_pnl)');
    // exitPrice from markPrice; realizedPnl null (no closing trades)
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('still marks closed with NULL exit_price when getMarkPrice throws (fail-soft)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockRejectedValueOnce(new Error('network timeout'));

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0);
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    // exitPrice null (both markPrice and PnL trades failed); realizedPnl null
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

describe('runPositionManagerTick — PnL backfill from closing fills', () => {
  beforeEach(() => {
    mockedGetAccount.mockReset();
    mockedGetMarkPrice.mockReset();
    mockedGetUserTradesSince.mockReset();
    mockedQuery.mockReset();
    mockedExecute.mockReset();
    mockedExecute.mockResolvedValue(undefined as never);
  });

  it('backfills realized_pnl and exit_price from closing fills (USDT commission)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50300);
    mockedGetUserTradesSince.mockResolvedValueOnce([
      {
        symbol: 'BTCUSDT',
        id: 1,
        orderId: 100,
        price: '50200',
        qty: '1',
        realizedPnl: '200',
        side: 'SELL',
        positionSide: 'BOTH',
        commission: '5',
        commissionAsset: 'USDT',
        time: Date.now(),
        maker: false,
        buyer: false,
      },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    // exitPrice from trade price (50200); realizedPnl = 200 - 5 commission = 195
    expect(closeCall?.[1]).toEqual(['exec-1', 50200, 195]);
  });

  it('ignores opening fills (realizedPnl = "0") when computing PnL', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    // Mix: one opening fill (realizedPnl=0) and one closing fill
    mockedGetUserTradesSince.mockResolvedValueOnce([
      {
        symbol: 'BTCUSDT', id: 1, orderId: 99, price: '50000', qty: '1',
        realizedPnl: '0', side: 'BUY', positionSide: 'BOTH',
        commission: '1', commissionAsset: 'USDT', time: Date.now() - 3600_000,
        maker: false, buyer: true,
      },
      {
        symbol: 'BTCUSDT', id: 2, orderId: 101, price: '50200', qty: '1',
        realizedPnl: '200', side: 'SELL', positionSide: 'BOTH',
        commission: '5', commissionAsset: 'USDT', time: Date.now(),
        maker: false, buyer: false,
      },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    expect(closeCall?.[1]).toEqual(['exec-1', 50200, 195]);
  });

  it('does not subtract non-USDT commission from realizedPnl', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50300);
    mockedGetUserTradesSince.mockResolvedValueOnce([
      {
        symbol: 'BTCUSDT', id: 1, orderId: 100, price: '50200', qty: '1',
        realizedPnl: '200', side: 'SELL', positionSide: 'BOTH',
        commission: '0.001', commissionAsset: 'BNB', // non-USDT — not subtracted
        time: Date.now(), maker: false, buyer: false,
      },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    expect(closeCall?.[1]).toEqual(['exec-1', 50200, 200]); // 200, no commission deducted
  });

  it('falls back to mark price exit when getUserTradesSince throws (fail-soft)', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50250);
    mockedGetUserTradesSince.mockRejectedValueOnce(new Error('network error') as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    expect(r.errors).toBe(0); // PnL failure is warn-only, not counted as an error
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    expect(closeCall?.[1]).toEqual(['exec-1', 50250, null]);
  });

  it('computes weighted average exit price across multiple partial closes', async () => {
    mockedQuery.mockResolvedValueOnce([openRow] as never);
    mockedGetAccount.mockResolvedValueOnce(accountNoPosition);
    mockedGetMarkPrice.mockResolvedValueOnce(50300);
    // Two closing fills: TP1 (0.5 qty @ 51000) and SL (0.5 qty @ 49100)
    mockedGetUserTradesSince.mockResolvedValueOnce([
      {
        symbol: 'BTCUSDT', id: 2, orderId: 101, price: '51000', qty: '0.5',
        realizedPnl: '500', side: 'SELL', positionSide: 'BOTH',
        commission: '2.5', commissionAsset: 'USDT', time: Date.now() - 1800_000,
        maker: false, buyer: false,
      },
      {
        symbol: 'BTCUSDT', id: 3, orderId: 102, price: '49100', qty: '0.5',
        realizedPnl: '-450', side: 'SELL', positionSide: 'BOTH',
        commission: '2.5', commissionAsset: 'USDT', time: Date.now(),
        maker: false, buyer: false,
      },
    ] as never);

    const r = await runPositionManagerTick();

    expect(r.closed).toBe(1);
    const closeCall = findCloseCall(mockedExecute.mock.calls as unknown[][]);
    // Weighted avg exit: (51000*0.5 + 49100*0.5) / 1.0 = 50050
    // Net PnL: 500 - 2.5 + (-450) - 2.5 = 45
    expect(closeCall?.[1]).toEqual(['exec-1', 50050, 45]);
  });
});

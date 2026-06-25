jest.mock('./binance-futures', () => ({
  cancelOrder: jest.fn(),
  currentMode: jest.fn(() => 'testnet'),
  getAccount: jest.fn(),
  getExchangeInfo: jest.fn(),
  getKlines: jest.fn(() => Promise.resolve([])),
  isTestnet: jest.fn(() => true),
  placeOrder: jest.fn(),
  setLeverage: jest.fn(() => Promise.resolve()),
  setMarginType: jest.fn(() => Promise.resolve()),
}));

jest.mock('../db-pool', () => ({
  execute: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  withClient: jest.fn(),
}));

jest.mock('./filters', () => ({
  runEntryFilters: jest.fn(() => ({ passed: true })),
}));

jest.mock('./risk-rails', () => ({
  checkLossKillSwitch: jest.fn(() => Promise.resolve({ halted: false })),
}));

jest.mock('./sizing', () => ({
  computeATR: jest.fn(() => 100),
  computeSize: jest.fn(),
  extractFilters: jest.fn(() => ({ stepSize: 0.001, quantityPrecision: 3 })),
}));

jest.mock('./telegram', () => ({
  notifyEntryFilled: jest.fn(),
  notifyError: jest.fn(() => Promise.resolve()),
}));

jest.mock('./universe-runner', () => ({
  getTodayUniverse: jest.fn(() => Promise.resolve(['BTCUSDT'])),
}));

jest.mock('../../app/lib/ohlcv', () => ({
  BINANCE_SYMBOLS: { BTCUSD: 'BTCUSDT' },
}));

import { cancelOrder, getAccount, getExchangeInfo, placeOrder } from './binance-futures';
import { execute, query, withClient } from '../db-pool';
import { computeSize } from './sizing';
import { notifyEntryFilled, notifyError } from './telegram';
import { runExecutorTick } from './executor';

const mockedCancelOrder = cancelOrder as jest.MockedFunction<typeof cancelOrder>;
const mockedGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockedGetExchangeInfo = getExchangeInfo as jest.MockedFunction<typeof getExchangeInfo>;
const mockedPlaceOrder = placeOrder as jest.MockedFunction<typeof placeOrder>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;
const mockedComputeSize = computeSize as jest.MockedFunction<typeof computeSize>;
const mockedNotify = notifyEntryFilled as jest.MockedFunction<typeof notifyEntryFilled>;
const mockedNotifyError = notifyError as jest.MockedFunction<typeof notifyError>;

const SIGNAL_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const signalRow = {
  id: SIGNAL_ID,
  pair: 'BTCUSD',
  timeframe: 'H1',
  direction: 'BUY',
  entry_price: '50000',
  entry_atr: '100',
  created_at: new Date(),
};

const account = {
  totalWalletBalance: 1000,
  totalUnrealizedProfit: 0,
  totalMarginBalance: 1000,
  availableBalance: 1000,
  positions: [],
};

const entryOrder = {
  orderId: 101,
  clientOrderId: 'aaaaaaaabbbbccccddddeeeeeeee-e',
  symbol: 'BTCUSDT',
  status: 'FILLED',
  type: 'MARKET',
  side: 'BUY',
  origQty: '0.5',
  executedQty: '0.5',
  price: '0',
  avgPrice: '50000',
  stopPrice: '0',
  reduceOnly: false,
  closePosition: false,
  updateTime: 1,
};

const tpOrder = { ...entryOrder, orderId: 103, type: 'TAKE_PROFIT_MARKET', side: 'SELL', reduceOnly: true };
const slOrder = { ...entryOrder, orderId: 102, type: 'STOP_MARKET', side: 'SELL', status: 'NEW' };
const closeFilled = { ...entryOrder, orderId: 104, side: 'SELL', reduceOnly: true, avgPrice: '49900' };
const closeExpired = { ...closeFilled, status: 'EXPIRED', executedQty: '0' };

function findExecuteIndex(sqlFragment: string): number {
  return mockedExecute.mock.calls.findIndex(
    (c) => typeof c[0] === 'string' && c[0].includes(sqlFragment),
  );
}

function findCloseCallIndex(): number {
  return mockedPlaceOrder.mock.calls.findIndex(
    (c) => (c[0] as { reduceOnly?: boolean; type: string }).reduceOnly === true
      && (c[0] as { type: string }).type === 'MARKET',
  );
}

beforeEach(() => {
  jest.clearAllMocks();

  mockedWithClient.mockImplementation((async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: jest.fn().mockResolvedValue({ rows: [{ acquired: true }] }) })) as never);

  mockedQuery.mockImplementation((async (sql: string) => {
    if (sql.includes('FROM signal_history')) return [signalRow];
    if (sql.includes('COUNT(*)')) return [{ n: '0' }];
    return [];
  }) as never);

  mockedGetAccount.mockResolvedValue(account as never);
  mockedGetExchangeInfo.mockResolvedValue({
    symbols: [{ symbol: 'BTCUSDT', status: 'TRADING', quoteAsset: 'USDT' }],
  } as never);

  mockedComputeSize.mockReturnValue({
    ok: true,
    qty: 0.5,
    leverage: 3,
    stopPrice: 49000,
    tp1Price: 51500,
    notionalUsd: 25000,
    riskUsd: 10,
  } as never);
});

describe('runExecutorTick — SL placement failure after a filled entry', () => {
  it('persists the row FIRST, flattens reduce-only, cancels the dangling TP, then marks closed', async () => {
    mockedPlaceOrder.mockImplementation((async (input: { type: string; reduceOnly?: boolean }) => {
      if (input.type === 'STOP_MARKET') throw new Error('-2021 order would immediately trigger');
      if (input.type === 'TAKE_PROFIT_MARKET') return tpOrder;
      if (input.type === 'MARKET' && input.reduceOnly) return closeFilled;
      return entryOrder;
    }) as never);

    const result = await runExecutorTick();

    // A filled MARKET entry cannot be cancelled — the old cancelOrder(entry) path is the bug.
    expect(mockedCancelOrder).not.toHaveBeenCalledWith('BTCUSDT', 101);
    // The dangling TP leg is cancelled.
    expect(mockedCancelOrder).toHaveBeenCalledWith('BTCUSDT', 103);

    // Emergency close: reduce-only MARKET on the opposite side for the FILLED qty.
    const closeIdx = findCloseCallIndex();
    expect(closeIdx).toBeGreaterThanOrEqual(0);
    expect(mockedPlaceOrder.mock.calls[closeIdx][0]).toMatchObject({
      symbol: 'BTCUSDT',
      side: 'SELL',
      type: 'MARKET',
      quantity: 0.5,
      reduceOnly: true,
    });

    // Persist-first: the INSERT (status 'filled') lands BEFORE the close order
    // goes out, so a crash mid-cleanup can never leave the position untracked.
    const insertIdx = findExecuteIndex('INSERT INTO executions');
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect((mockedExecute.mock.calls[insertIdx][1] as unknown[])[14]).toBe('filled');
    expect(mockedExecute.mock.invocationCallOrder[insertIdx]).toBeLessThan(
      mockedPlaceOrder.mock.invocationCallOrder[closeIdx],
    );

    // Confirmed FILLED close → row updated to closed with the close fill price.
    const updateIdx = findExecuteIndex('UPDATE executions');
    expect(updateIdx).toBeGreaterThanOrEqual(0);
    expect(mockedExecute.mock.calls[updateIdx][0]).toContain("status='closed'");
    expect((mockedExecute.mock.calls[updateIdx][1] as unknown[])[1]).toBe(49900);

    expect(mockedNotify).not.toHaveBeenCalled();
    expect(result.rejected).toBe(1);
    expect(result.executed).toBe(0);
  });

  it('keeps the row filled, logs naked_position, and alerts when the emergency close throws', async () => {
    mockedPlaceOrder.mockImplementation((async (input: { type: string; reduceOnly?: boolean }) => {
      if (input.type === 'STOP_MARKET') throw new Error('-2021 order would immediately trigger');
      if (input.type === 'TAKE_PROFIT_MARKET') return tpOrder;
      if (input.type === 'MARKET' && input.reduceOnly) throw new Error('-2019 margin is insufficient');
      return entryOrder;
    }) as never);

    const result = await runExecutorTick();

    const insertIdx = findExecuteIndex('INSERT INTO executions');
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect((mockedExecute.mock.calls[insertIdx][1] as unknown[])[14]).toBe('filled');
    expect(findExecuteIndex('UPDATE executions')).toBe(-1);

    const errorCall = mockedExecute.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        c[0].includes('INSERT INTO execution_errors') &&
        (c[1] as unknown[])[4] === 'naked_position',
    );
    expect(errorCall).toBeDefined();
    expect(mockedNotifyError).toHaveBeenCalledWith(
      'naked_position',
      SIGNAL_ID,
      expect.stringContaining('NO STOP'),
    );

    expect(mockedNotify).not.toHaveBeenCalled();
    expect(result.errors).toBe(1);
    expect(result.executed).toBe(0);
  });

  it('treats a non-FILLED (EXPIRED) close as naked — the row must NOT be marked closed', async () => {
    mockedPlaceOrder.mockImplementation((async (input: { type: string; reduceOnly?: boolean }) => {
      if (input.type === 'STOP_MARKET') throw new Error('-2021 order would immediately trigger');
      if (input.type === 'TAKE_PROFIT_MARKET') return tpOrder;
      if (input.type === 'MARKET' && input.reduceOnly) return closeExpired;
      return entryOrder;
    }) as never);

    const result = await runExecutorTick();

    const insertIdx = findExecuteIndex('INSERT INTO executions');
    expect((mockedExecute.mock.calls[insertIdx][1] as unknown[])[14]).toBe('filled');
    expect(findExecuteIndex('UPDATE executions')).toBe(-1);

    const errorCall = mockedExecute.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        c[0].includes('INSERT INTO execution_errors') &&
        (c[1] as unknown[])[4] === 'naked_position',
    );
    expect(errorCall).toBeDefined();
    expect(mockedNotifyError).toHaveBeenCalled();
    expect(result.errors).toBe(1);
  });

  it('persists a cancelled row and places no close when the entry itself had zero fill', async () => {
    const entryExpired = { ...entryOrder, status: 'EXPIRED', executedQty: '0', avgPrice: '0' };
    mockedPlaceOrder.mockImplementation((async (input: { type: string; reduceOnly?: boolean }) => {
      if (input.type === 'STOP_MARKET') throw new Error('-2021 order would immediately trigger');
      if (input.type === 'TAKE_PROFIT_MARKET') return tpOrder;
      if (input.type === 'MARKET' && input.reduceOnly) throw new Error('should not be called');
      return entryExpired;
    }) as never);

    const result = await runExecutorTick();

    const insertIdx = findExecuteIndex('INSERT INTO executions');
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect((mockedExecute.mock.calls[insertIdx][1] as unknown[])[14]).toBe('cancelled');

    expect(findCloseCallIndex()).toBe(-1);
    expect(mockedNotifyError).not.toHaveBeenCalled();
    expect(result.rejected).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('regression: full bracket success persists a filled row and counts executed', async () => {
    mockedPlaceOrder.mockImplementation((async (input: { type: string }) => {
      if (input.type === 'STOP_MARKET') return slOrder;
      if (input.type === 'TAKE_PROFIT_MARKET') return tpOrder;
      return entryOrder;
    }) as never);

    const result = await runExecutorTick();

    expect(mockedCancelOrder).not.toHaveBeenCalled();
    const insertIdx = findExecuteIndex('INSERT INTO executions');
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect((mockedExecute.mock.calls[insertIdx][1] as unknown[])[14]).toBe('filled');
    expect(result.executed).toBe(1);
    expect(result.rejected).toBe(0);
  });
});

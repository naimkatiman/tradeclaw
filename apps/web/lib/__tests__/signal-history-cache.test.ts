jest.mock('../redis', () => ({
  redis: null,
  isRedisAvailable: jest.fn(() => false),
  ensureRedis: jest.fn().mockResolvedValue(false),
  redisKey: jest.fn((key: string) => key),
}));

jest.mock('../signal-history', () => ({
  readHistoryAsync: jest.fn(),
}));

import {
  getCachedHistory,
  invalidateHistoryCache,
  _setCacheForTest,
} from '../signal-history-cache';
import { ensureRedis } from '../redis';
import { readHistoryAsync, type SignalHistoryRecord } from '../signal-history';

const mockedReadHistory = readHistoryAsync as jest.MockedFunction<typeof readHistoryAsync>;
const mockedEnsureRedis = ensureRedis as jest.MockedFunction<typeof ensureRedis>;
const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as unknown as SignalHistoryRecord[];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function flushAsyncWork(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('signal-history-cache', () => {
  beforeEach(async () => {
    jest.useRealTimers();
    mockedEnsureRedis.mockReset();
    mockedEnsureRedis.mockResolvedValue(false);
    mockedReadHistory.mockReset();
    mockedReadHistory.mockResolvedValue([]);
    await invalidateHistoryCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns injected test data immediately', async () => {
    _setCacheForTest(fakeRows);
    const result = await getCachedHistory();
    expect(result).toEqual(fakeRows);
    expect(mockedReadHistory).not.toHaveBeenCalled();
  });

  it('preserves a legitimate empty result from the history source', async () => {
    const result = await getCachedHistory();
    expect(result).toEqual([]);
  });

  it('invalidation clears the cache', async () => {
    _setCacheForTest(fakeRows);
    await invalidateHistoryCache();
    const result = await getCachedHistory();
    expect(result).toEqual([]);
  });

  it('rethrows a cold history read failure instead of fabricating an empty ledger', async () => {
    mockedReadHistory.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(getCachedHistory()).rejects.toThrow('database unavailable');
  });

  it('serves an expired in-memory snapshot when a refresh fails', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T00:00:00Z'));
    _setCacheForTest(fakeRows);
    jest.advanceTimersByTime(10 * 60 * 1000 + 1);
    mockedReadHistory.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(getCachedHistory()).resolves.toEqual(fakeRows);
  });

  it('deduplicates concurrent history reads', async () => {
    const pending = deferred<SignalHistoryRecord[]>();
    mockedReadHistory.mockReturnValueOnce(pending.promise);

    const first = getCachedHistory();
    const second = getCachedHistory();
    await flushAsyncWork();

    expect(mockedReadHistory).toHaveBeenCalledTimes(1);
    pending.resolve(fakeRows);
    await expect(Promise.all([first, second])).resolves.toEqual([fakeRows, fakeRows]);
  });

  it('does not let an invalidated read overwrite a newer generation', async () => {
    const oldRows = [{ id: 'old', pair: 'ETHUSD' }] as unknown as SignalHistoryRecord[];
    const newRows = [{ id: 'new', pair: 'SOLUSD' }] as unknown as SignalHistoryRecord[];
    const pendingOldRead = deferred<SignalHistoryRecord[]>();
    mockedReadHistory
      .mockReturnValueOnce(pendingOldRead.promise)
      .mockResolvedValueOnce(newRows);

    const oldRead = getCachedHistory();
    await flushAsyncWork();
    expect(mockedReadHistory).toHaveBeenCalledTimes(1);

    await invalidateHistoryCache();
    const freshRead = getCachedHistory();
    await flushAsyncWork();
    expect(mockedReadHistory).toHaveBeenCalledTimes(2);

    pendingOldRead.resolve(oldRows);
    await expect(oldRead).resolves.toEqual(oldRows);
    await expect(freshRead).resolves.toEqual(newRows);
    await expect(getCachedHistory()).resolves.toEqual(newRows);
    expect(mockedReadHistory).toHaveBeenCalledTimes(2);
  });

  it('rejoins the current generation when invalidated during Redis initialization', async () => {
    const newRows = [{ id: 'new', pair: 'XAUUSD' }] as unknown as SignalHistoryRecord[];
    const pendingRedisInitialization = deferred<boolean>();
    mockedEnsureRedis
      .mockReturnValueOnce(pendingRedisInitialization.promise)
      .mockResolvedValue(false);
    mockedReadHistory.mockResolvedValueOnce(newRows);

    const supersededRead = getCachedHistory();
    await flushAsyncWork();
    expect(mockedEnsureRedis).toHaveBeenCalledTimes(1);
    expect(mockedReadHistory).not.toHaveBeenCalled();

    await invalidateHistoryCache();
    await expect(getCachedHistory()).resolves.toEqual(newRows);

    pendingRedisInitialization.resolve(false);
    await expect(supersededRead).resolves.toEqual(newRows);
    expect(mockedReadHistory).toHaveBeenCalledTimes(1);
  });
});

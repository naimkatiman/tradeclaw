import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedHistory,
  invalidateHistoryCache,
  _setCacheForTest,
} from '../signal-history-cache';

vi.mock('../signal-history', () => ({
  readHistoryAsync: vi.fn().mockResolvedValue([]),
}));

describe('signal-history-cache', () => {
  beforeEach(async () => {
    await invalidateHistoryCache();
  });

  it('returns injected test data immediately', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as any;
    _setCacheForTest(fakeRows);
    const result = await getCachedHistory();
    expect(result).toEqual(fakeRows);
  });

  it('returns empty array when cache is cold and no db (test env)', async () => {
    const result = await getCachedHistory();
    expect(Array.isArray(result)).toBe(true);
  });

  it('invalidation clears the cache', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as any;
    _setCacheForTest(fakeRows);
    await invalidateHistoryCache();
    const result = await getCachedHistory();
    expect(result).toEqual([]);
  });
});

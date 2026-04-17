import {
  getCachedHistory,
  invalidateHistoryCache,
  _setCacheForTest,
} from '../signal-history-cache';

jest.mock('../signal-history');

describe('signal-history-cache', () => {
  beforeEach(() => invalidateHistoryCache());

  it('returns injected test data immediately', async () => {
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
    const fakeRows = [{ id: '1', pair: 'BTCUSD' }] as any;
    _setCacheForTest(fakeRows);
    invalidateHistoryCache();
    const result = await getCachedHistory();
    expect(result).toEqual([]);
  });
});

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/social-summary-stats', () => ({
  getSocialSummaryStats: jest.fn(),
}));

jest.mock('../../../../../lib/social-queue', () => ({
  enqueueSummaryPost: jest.fn(),
}));

import { getSocialSummaryStats } from '../../../../../lib/social-summary-stats';
import { enqueueSummaryPost } from '../../../../../lib/social-queue';
import { GET as getDailySummary } from '../daily/route';
import { GET as getWeeklySummary } from '../weekly/route';

const mockGetStats = getSocialSummaryStats as jest.MockedFunction<typeof getSocialSummaryStats>;
const mockEnqueue = enqueueSummaryPost as jest.MockedFunction<typeof enqueueSummaryPost>;
const originalCronSecret = process.env.CRON_SECRET;

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { authorization: 'Bearer test-cron-secret' },
  });
}

describe('social summary truth-in-labeling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T12:00:00.000Z'));
    process.env.CRON_SECRET = 'test-cron-secret';
    mockEnqueue.mockResolvedValue({ id: 'post-1' } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('queues a daily signal study with explicit portfolio and fill limitations', async () => {
    mockGetStats.mockResolvedValue({
      total: 3,
      wins: 2,
      losses: 1,
      winRatePct: 66.7,
      sumPriceMovePct: 1.25,
      highestSumSymbol: 'BTCUSD',
      highestSumPriceMovePct: 2,
      lowestSumSymbol: 'ETHUSD',
      lowestSumPriceMovePct: -0.75,
    });

    const response = await getDailySummary(request('/api/cron/social/daily'));

    expect(response.status).toBe(200);
    expect(mockGetStats).toHaveBeenCalledWith('daily', '2026-06-14');
    const [, copy, , metadata] = mockEnqueue.mock.calls[0];
    expect(copy).toContain('Unsized sum of per-signal 24h price moves: +1.25%');
    expect(copy).toContain('Signal study; not portfolio P/L or broker fills.');
    expect(copy).not.toMatch(/(^|\n)P\/L:/);
    expect(metadata).toEqual(expect.objectContaining({
      sumPriceMovePct: '1.25',
      studyLimitations: 'not portfolio P/L or broker fills',
    }));
    expect(metadata).not.toHaveProperty('totalPnl');
  });

  it('queues a weekly signal study using pair-sum language and truthful metadata', async () => {
    mockGetStats.mockResolvedValue({
      total: 8,
      wins: 5,
      losses: 3,
      winRatePct: 62.5,
      sumPriceMovePct: -0.5,
      highestSumSymbol: 'BTCUSD',
      highestSumPriceMovePct: 3.25,
      lowestSumSymbol: 'EURUSD',
      lowestSumPriceMovePct: -2.5,
    });

    const response = await getWeeklySummary(request('/api/cron/social/weekly'));

    expect(response.status).toBe(200);
    expect(mockGetStats).toHaveBeenCalledWith('weekly', '2026-06-14');
    const [, copy, , metadata] = mockEnqueue.mock.calls[0];
    expect(copy).toContain('Unsized sum of per-signal 24h price moves: -0.50%');
    expect(copy).toContain('Highest pair sum: BTCUSD (+3.25%)');
    expect(copy).toContain('Lowest pair sum: EURUSD (-2.50%)');
    expect(copy).toContain('Signal study; not portfolio P/L or broker fills.');
    expect(copy).not.toMatch(/(^|\n)P\/L:/);
    expect(metadata).toEqual(expect.objectContaining({
      sumPriceMovePct: '-0.50',
      highestSumPriceMovePct: 3.25,
      lowestSumPriceMovePct: -2.5,
      studyLimitations: 'not portfolio P/L or broker fills',
    }));
    expect(metadata).not.toHaveProperty('totalPnl');
    expect(metadata).not.toHaveProperty('bestPnl');
    expect(metadata).not.toHaveProperty('worstPnl');
  });
});

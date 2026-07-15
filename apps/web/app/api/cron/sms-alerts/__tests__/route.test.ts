import { NextRequest } from 'next/server';

jest.mock('@/lib/sms-subscribers', () => ({
  getActiveSmsSubscribers: jest.fn(),
}));

jest.mock('@/lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { getActiveSmsSubscribers } from '@/lib/sms-subscribers';
import { evaluateCostAdjustedEdge } from '@/lib/cost-adjusted-edge-gate';
import { GET } from '../route';

const mockGetSubscribers = getActiveSmsSubscribers as jest.MockedFunction<typeof getActiveSmsSubscribers>;
const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;
const originalFetch = global.fetch;
const originalCronSecret = process.env.CRON_SECRET;

function request(): NextRequest {
  return new NextRequest('http://localhost/api/cron/sms-alerts', {
    headers: { authorization: 'Bearer test-cron-secret' },
  });
}

describe('GET /api/cron/sms-alerts edge readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockEvaluateEdge.mockResolvedValue({ allowed: true, reason: 'ready' } as never);
    mockGetSubscribers.mockResolvedValue([]);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('halts before reading subscribers or fetching signals when edge is denied', async () => {
    mockEvaluateEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
      usableCount: 120,
      activeDays: 40,
      coverage: 0.95,
      perSignalMeanNetR: -0.2,
      equalDayLowerBoundNetR: -0.3,
    } as never);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      sent: 0,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockGetSubscribers).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('continues to subscriber selection when edge is ready', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mockGetSubscribers).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

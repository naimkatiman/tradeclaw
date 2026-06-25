import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/cron-auth', () => ({
  requireCronAuth: jest.fn(),
}));

jest.mock('../../../../../lib/paper-trading', () => ({
  getDemoUserId: jest.fn(),
}));

jest.mock('../../../../../lib/game-plans', () => ({
  generateBriefing: jest.fn(),
}));

import { requireCronAuth } from '../../../../../lib/cron-auth';
import { getDemoUserId } from '../../../../../lib/paper-trading';
import { generateBriefing } from '../../../../../lib/game-plans';
import { GET, POST } from '../route';

const mockedRequireCronAuth = requireCronAuth as jest.MockedFunction<typeof requireCronAuth>;
const mockedGetDemoUserId = getDemoUserId as jest.MockedFunction<typeof getDemoUserId>;
const mockedGenerateBriefing = generateBriefing as jest.MockedFunction<typeof generateBriefing>;

function makeRequest(method: 'GET' | 'POST' = 'GET'): NextRequest {
  return new NextRequest('http://localhost/api/cron/game-plan', { method });
}

describe('game-plan cron route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireCronAuth.mockReturnValue(null);
    mockedGetDemoUserId.mockReturnValue('demo-user');
  });

  it('passes through cron auth failures', async () => {
    const denied = new Response(null, { status: 401 });
    mockedRequireCronAuth.mockReturnValue(denied as never);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockedGetDemoUserId).not.toHaveBeenCalled();
  });

  it('skips when no demo user is configured', async () => {
    mockedGetDemoUserId.mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.skipped).toBe(true);
    expect(mockedGenerateBriefing).not.toHaveBeenCalled();
  });

  it('generates and returns the daily briefing for the demo user', async () => {
    mockedGenerateBriefing.mockResolvedValue({
      id: 'plan-1',
      userId: 'demo-user',
      date: '2026-05-20',
      watchlist: [
        { symbol: 'BTCUSD', bias: 'Bullish', keyLevels: '3 signals · top 82% confidence' },
      ],
      notes: 'Auto-generated pre-market briefing from the last 24h signal tape.\nFocus pairs: BTCUSD.\nReview key levels before the session opens.',
      createdAt: '2026-05-20T00:00:00.000Z',
    });

    const res = await POST(makeRequest('POST'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.generated).toBe(true);
    expect(body.userId).toBe('demo-user');
    expect(mockedGenerateBriefing).toHaveBeenCalledWith('demo-user');
  });
});

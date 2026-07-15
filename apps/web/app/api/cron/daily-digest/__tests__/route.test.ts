import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/daily-digest', () => ({
  getDailyDigest: jest.fn(),
  digestToPlainText: jest.fn(),
  digestToHtml: jest.fn(),
}));

jest.mock('../../../../../lib/email-sender', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../../../../../lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { getDailyDigest } from '../../../../../lib/daily-digest';
import { sendEmail } from '../../../../../lib/email-sender';
import { evaluateCostAdjustedEdge } from '../../../../../lib/cost-adjusted-edge-gate';
import { GET } from '../route';

const mockGetDailyDigest = getDailyDigest as jest.MockedFunction<typeof getDailyDigest>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;
const originalFetch = global.fetch;
const originalCronSecret = process.env.CRON_SECRET;
const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
const originalTelegramChannel = process.env.TELEGRAM_CHANNEL_ID;
const originalEmailTo = process.env.EMAIL_TO;

function request(): NextRequest {
  return new NextRequest('http://localhost/api/cron/daily-digest', {
    headers: { authorization: 'Bearer test-cron-secret' },
  });
}

describe('GET /api/cron/daily-digest edge readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_CHANNEL_ID = 'test-channel';
    delete process.env.EMAIL_TO;
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockEvaluateEdge.mockResolvedValue({ allowed: true, reason: 'ready' } as never);
    mockGetDailyDigest.mockResolvedValue({ count: 0 } as never);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
    if (originalTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
    if (originalTelegramChannel === undefined) delete process.env.TELEGRAM_CHANNEL_ID;
    else process.env.TELEGRAM_CHANNEL_ID = originalTelegramChannel;
    if (originalEmailTo === undefined) delete process.env.EMAIL_TO;
    else process.env.EMAIL_TO = originalEmailTo;
  });

  it('halts before building or sending a digest when edge is denied', async () => {
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
      sent: false,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockGetDailyDigest).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('continues to digest construction when edge is ready', async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mockGetDailyDigest).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

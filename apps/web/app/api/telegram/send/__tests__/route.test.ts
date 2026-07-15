import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/telegram-subscribers', () => ({
  readSubscribers: jest.fn(),
}));

jest.mock('../../../../../lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { readSubscribers } from '../../../../../lib/telegram-subscribers';
import { evaluateCostAdjustedEdge } from '../../../../../lib/cost-adjusted-edge-gate';
import { POST } from '../route';

const mockReadSubscribers = readSubscribers as jest.MockedFunction<typeof readSubscribers>;
const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;
const originalFetch = global.fetch;
const originalCronSecret = process.env.CRON_SECRET;
const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;

const signal = {
  symbol: 'BTCUSDT',
  direction: 'BUY',
  confidence: 85,
  entry: 60_000,
  stopLoss: 59_000,
  takeProfit1: 62_000,
  timeframe: 'H1',
};

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/telegram/send', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-cron-secret',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/telegram/send edge readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockEvaluateEdge.mockResolvedValue({ allowed: true, reason: 'ready' } as never);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
    if (originalTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
  });

  it('halts a broadcast before reading subscribers or sending messages', async () => {
    mockEvaluateEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
      usableCount: 120,
      activeDays: 40,
      coverage: 0.95,
      perSignalMeanNetR: -0.2,
      equalDayLowerBoundNetR: -0.3,
    } as never);

    const response = await POST(request({ signal, broadcast: true }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      ok: false,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockReadSubscribers).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not gate test notifications', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    const response = await POST(request({ test: true, chatId: '1234' }));

    expect(response.status).toBe(200);
    expect(mockEvaluateEdge).not.toHaveBeenCalled();
    expect(mockReadSubscribers).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

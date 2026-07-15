import { NextRequest } from 'next/server';

jest.mock('@/lib/alert-rules-db', () => ({
  getAllEnabledRules: jest.fn(),
  getChannelConfigsForUser: jest.fn(),
  signalMatchesRule: jest.fn(),
}));

jest.mock('@/lib/alert-channels', () => ({
  sendToChannel: jest.fn(),
}));

jest.mock('@/lib/observability', () => ({
  recordBroadcastResult: jest.fn(),
}));

jest.mock('@/lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { getAllEnabledRules, getChannelConfigsForUser } from '@/lib/alert-rules-db';
import { sendToChannel } from '@/lib/alert-channels';
import { recordBroadcastResult } from '@/lib/observability';
import { evaluateCostAdjustedEdge } from '@/lib/cost-adjusted-edge-gate';
import { POST } from '../route';

const mockGetRules = getAllEnabledRules as jest.MockedFunction<typeof getAllEnabledRules>;
const mockGetConfigs = getChannelConfigsForUser as jest.MockedFunction<typeof getChannelConfigsForUser>;
const mockSendToChannel = sendToChannel as jest.MockedFunction<typeof sendToChannel>;
const mockRecordBroadcast = recordBroadcastResult as jest.MockedFunction<typeof recordBroadcastResult>;
const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;
const originalCronSecret = process.env.CRON_SECRET;

function request(): NextRequest {
  return new NextRequest('http://localhost/api/alert-rules/dispatch', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-cron-secret',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      signal: {
        symbol: 'BTCUSDT',
        direction: 'BUY',
        confidence: 85,
        entry: 60_000,
        stopLoss: 59_000,
        takeProfit1: 62_000,
        timeframe: 'H1',
      },
    }),
  });
}

describe('POST /api/alert-rules/dispatch edge readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    mockEvaluateEdge.mockResolvedValue({ allowed: true, reason: 'ready' } as never);
    mockGetRules.mockResolvedValue([]);
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('halts before reading rules or dispatching channels when edge is denied', async () => {
    mockEvaluateEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
      usableCount: 120,
      activeDays: 40,
      coverage: 0.95,
      perSignalMeanNetR: -0.2,
      equalDayLowerBoundNetR: -0.3,
    } as never);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      dispatched: 0,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockGetRules).not.toHaveBeenCalled();
    expect(mockGetConfigs).not.toHaveBeenCalled();
    expect(mockSendToChannel).not.toHaveBeenCalled();
    expect(mockRecordBroadcast).not.toHaveBeenCalled();
  });

  it('continues to rule selection when edge is ready', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockGetRules).toHaveBeenCalledTimes(1);
    expect(mockRecordBroadcast).toHaveBeenCalledWith(expect.objectContaining({ attempted: 0 }));
  });
});

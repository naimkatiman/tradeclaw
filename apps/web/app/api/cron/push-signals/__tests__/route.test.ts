import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

jest.mock('../../../../lib/signals', () => ({
  getSignals: jest.fn(),
}));

jest.mock('../../../../../lib/expo-push-tokens', () => ({
  getAllExpoTokens: jest.fn(),
}));

jest.mock('../../../../../lib/expo-push-sender', () => ({
  dispatchSignalPushes: jest.fn(),
}));

jest.mock('../../../../../lib/cost-adjusted-edge-gate', () => ({
  evaluateCostAdjustedEdge: jest.fn(),
}));

import { getSignals } from '../../../../lib/signals';
import { getAllExpoTokens } from '../../../../../lib/expo-push-tokens';
import { dispatchSignalPushes } from '../../../../../lib/expo-push-sender';
import { evaluateCostAdjustedEdge } from '../../../../../lib/cost-adjusted-edge-gate';

const mockGetSignals = getSignals as jest.MockedFunction<typeof getSignals>;
const mockGetAllExpoTokens = getAllExpoTokens as jest.MockedFunction<typeof getAllExpoTokens>;
const mockDispatch = dispatchSignalPushes as jest.MockedFunction<typeof dispatchSignalPushes>;
const mockEvaluateEdge = evaluateCostAdjustedEdge as jest.MockedFunction<typeof evaluateCostAdjustedEdge>;

function req(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/push-signals', {
    headers: authorization ? { authorization } : {},
  });
}

describe('/api/cron/push-signals', () => {
  const ORIG_ENV = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    jest.clearAllMocks();
    mockEvaluateEdge.mockResolvedValue({ allowed: true, reason: 'ready' } as never);
  });

  afterEach(() => {
    process.env.CRON_SECRET = ORIG_ENV;
  });

  it('returns 401 without auth', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with wrong auth', async () => {
    const res = await GET(req('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('halts before reading or dispatching signals when cost-adjusted edge is denied', async () => {
    mockEvaluateEdge.mockResolvedValueOnce({
      allowed: false,
      reason: 'negative',
      usableCount: 120,
      activeDays: 40,
      coverage: 0.95,
      perSignalMeanNetR: -0.2,
      equalDayLowerBoundNetR: -0.3,
    } as never);

    const res = await GET(req('Bearer test-cron-secret'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      pushed: false,
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockGetSignals).not.toHaveBeenCalled();
    expect(mockGetAllExpoTokens).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns no-push when no high-confidence signals exist', async () => {
    mockGetSignals.mockResolvedValue({ signals: [], syntheticSymbols: [] });

    const res = await GET(req('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(false);
    expect(body.reason).toContain('No high-confidence signals');
  });

  it('returns no-push when only synthetic signals exist', async () => {
    mockGetSignals.mockResolvedValue({
      signals: [
        {
          id: 's1',
          symbol: 'XAUUSD',
          direction: 'BUY',
          confidence: 85,
          entry: 2400,
          stopLoss: 2390,
          takeProfit1: 2410,
          takeProfit2: null,
          takeProfit3: null,
          indicators: {
            rsi: { value: 50, signal: 'neutral' },
            macd: { histogram: 0, signal: 'neutral' },
            ema: { trend: 'up', ema20: 0, ema50: 0, ema200: 0 },
            bollingerBands: { position: 'middle', bandwidth: 0 },
            stochastic: { k: 50, d: 50, signal: 'neutral' },
            support: [],
            resistance: [],
          },
          timeframe: 'H1',
          timestamp: new Date().toISOString(),
          status: 'active',
          dataQuality: 'synthetic',
        },
      ],
      syntheticSymbols: ['XAUUSD'],
    });

    const res = await GET(req('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(false);
    expect(body.reason).toContain('real-data');
  });

  it('returns no-push when no tokens registered', async () => {
    mockGetSignals.mockResolvedValue({
      signals: [
        {
          id: 's1',
          symbol: 'XAUUSD',
          direction: 'BUY',
          confidence: 85,
          entry: 2400,
          stopLoss: 2390,
          takeProfit1: 2410,
          takeProfit2: null,
          takeProfit3: null,
          indicators: {
            rsi: { value: 50, signal: 'neutral' },
            macd: { histogram: 0, signal: 'neutral' },
            ema: { trend: 'up', ema20: 0, ema50: 0, ema200: 0 },
            bollingerBands: { position: 'middle', bandwidth: 0 },
            stochastic: { k: 50, d: 50, signal: 'neutral' },
            support: [],
            resistance: [],
          },
          timeframe: 'H1',
          timestamp: new Date().toISOString(),
          status: 'active',
          dataQuality: 'real',
        },
      ],
      syntheticSymbols: [],
    });
    mockGetAllExpoTokens.mockResolvedValue([]);

    const res = await GET(req('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(false);
    expect(body.reason).toContain('No registered Expo push tokens');
  });

  it('dispatches pushes and returns success stats', async () => {
    mockGetSignals.mockResolvedValue({
      signals: [
        {
          id: 's1',
          symbol: 'XAUUSD',
          direction: 'BUY',
          confidence: 85,
          entry: 2400,
          stopLoss: 2390,
          takeProfit1: 2410,
          takeProfit2: null,
          takeProfit3: null,
          indicators: {
            rsi: { value: 50, signal: 'neutral' },
            macd: { histogram: 0, signal: 'neutral' },
            ema: { trend: 'up', ema20: 0, ema50: 0, ema200: 0 },
            bollingerBands: { position: 'middle', bandwidth: 0 },
            stochastic: { k: 50, d: 50, signal: 'neutral' },
            support: [],
            resistance: [],
          },
          timeframe: 'H1',
          timestamp: new Date().toISOString(),
          status: 'active',
          dataQuality: 'real',
        },
      ],
      syntheticSymbols: [],
    });
    mockGetAllExpoTokens.mockResolvedValue([
      {
        id: 't1',
        token: 'ExponentPushToken[abc]',
        platform: 'ios',
        pairs: ['XAUUSD'],
        minConfidence: 80,
        directions: ['BUY', 'SELL'],
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockDispatch.mockResolvedValue({
      signalsProcessed: 1,
      totalMessages: 1,
      sent: 1,
      failed: 0,
      errors: [],
    });

    const res = await GET(req('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.signalsProcessed).toBe(1);
    expect(body.totalMessages).toBe(1);
  });

  it('POST behaves the same as GET', async () => {
    mockGetSignals.mockResolvedValue({ signals: [], syntheticSymbols: [] });

    const res = await POST(req('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(false);
  });
});

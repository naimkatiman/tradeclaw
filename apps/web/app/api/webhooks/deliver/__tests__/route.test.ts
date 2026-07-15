import { NextRequest } from 'next/server';

jest.mock('@/lib/webhooks', () => ({
  dispatchToAll: jest.fn(),
}));

jest.mock('@/lib/entry-fanout-gate', () => ({
  evaluateEntryFanoutGate: jest.fn(),
}));

import { dispatchToAll } from '@/lib/webhooks';
import { evaluateEntryFanoutGate } from '@/lib/entry-fanout-gate';
import { POST } from '../route';

const mockDispatch = dispatchToAll as jest.MockedFunction<typeof dispatchToAll>;
const mockEntryGate = evaluateEntryFanoutGate as jest.MockedFunction<
  typeof evaluateEntryFanoutGate
>;

const SIGNAL = {
  id: 'sig-approved',
  symbol: 'XAUUSD',
  timeframe: 'H1',
  direction: 'BUY',
  confidence: 85,
  entry: 2400,
  stopLoss: 2390,
  takeProfit: [2410],
  indicators: { rsi: 40, macd: 'bullish', ema: 'up' },
};

function request(
  event: string,
  signal: Record<string, unknown> = SIGNAL,
  authorized = true,
): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/deliver', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer cron-test-secret' } : {}),
    },
    body: JSON.stringify({ event, signal }),
  });
}

describe('POST /api/webhooks/deliver entry fan-out', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-test-secret';
    mockDispatch.mockResolvedValue(undefined);
    mockEntryGate.mockResolvedValue({
      allowed: true,
      reason: 'cost_adjusted_edge:ready',
      evidence: {
        usableCount: 140,
        activeDays: 45,
        coverage: 0.96,
        perSignalMeanNetR: 0.12,
        equalDayLowerBoundNetR: 0.03,
      },
    });
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('rejects unauthenticated fan-out before parsing or evaluating evidence', async () => {
    const response = await POST(request('signal.test', SIGNAL, false));

    expect(response.status).toBe(401);
    expect(mockEntryGate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('halts signal.new before arbitrary webhook fan-out when denied', async () => {
    mockEntryGate.mockResolvedValueOnce({
      allowed: false,
      reason: 'signal_approval:denied',
      evidence: {
        usableCount: 140,
        activeDays: 45,
        coverage: 0.96,
        perSignalMeanNetR: 0.12,
        equalDayLowerBoundNetR: 0.03,
      },
    });

    const response = await POST(request('signal.new'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(expect.objectContaining({
      dispatched: false,
      halted: 'signal_approval:denied',
    }));
    expect(mockEntryGate).toHaveBeenCalledWith({
      symbol: 'XAUUSD',
      signalId: 'sig-approved',
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches signal.new only after approval', async () => {
    const response = await POST(request('signal.new'));

    expect(response.status).toBe(200);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      event: 'signal.new',
      signal: SIGNAL,
    }));
  });

  it('preserves signal.test delivery without evaluating entry evidence', async () => {
    const response = await POST(request('signal.test'));

    expect(response.status).toBe(200);
    expect(mockEntryGate).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('rejects arbitrary event names instead of using them to bypass the gate', async () => {
    const response = await POST(request('position.opened'));

    expect(response.status).toBe(400);
    expect(mockEntryGate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

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
  symbol: 'EURUSD',
  timeframe: 'H1',
  direction: 'SELL',
  confidence: 84,
  entry: 1.09,
  stopLoss: 1.095,
  takeProfit: [1.08],
  indicators: { rsi: 60, macd: 'bearish', ema: 'down' },
};

function request(event: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/dispatch', {
    method: 'POST',
    headers: {
      authorization: 'Bearer cron-test-secret',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event, signal: SIGNAL }),
  });
}

describe('POST /api/webhooks/dispatch entry fan-out', () => {
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

  it('halts a cron-authenticated signal.new before fan-out when denied', async () => {
    mockEntryGate.mockResolvedValueOnce({
      allowed: false,
      reason: 'cost_adjusted_edge:unavailable',
      evidence: {
        usableCount: 0,
        activeDays: 0,
        coverage: 0,
        perSignalMeanNetR: null,
        equalDayLowerBoundNetR: null,
      },
    });

    const response = await POST(request('signal.new'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(expect.objectContaining({
      dispatched: false,
      halted: 'cost_adjusted_edge:unavailable',
    }));
    expect(mockEntryGate).toHaveBeenCalledWith({
      symbol: 'EURUSD',
      signalId: 'sig-approved',
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches an approved signal.new', async () => {
    const response = await POST(request('signal.new'));

    expect(response.status).toBe(200);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      event: 'signal.new',
      signal: SIGNAL,
    }));
  });

  it('preserves signal.test fan-out without invoking the entry gate', async () => {
    const response = await POST(request('signal.test'));

    expect(response.status).toBe(200);
    expect(mockEntryGate).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('still rejects unauthenticated requests before evaluating evidence', async () => {
    const response = await POST(new NextRequest('http://localhost/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'signal.new', signal: SIGNAL }),
    }));

    expect(response.status).toBe(401);
    expect(mockEntryGate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

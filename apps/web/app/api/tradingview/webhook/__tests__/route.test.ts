import { NextRequest } from 'next/server';

jest.mock('@/lib/tradingview-alerts', () => ({
  saveAlert: jest.fn(),
}));

jest.mock('@/lib/entry-fanout-gate', () => ({
  evaluateEntryFanoutGate: jest.fn(),
}));

import { saveAlert } from '@/lib/tradingview-alerts';
import { evaluateEntryFanoutGate } from '@/lib/entry-fanout-gate';
import { POST } from '../route';

const mockSaveAlert = saveAlert as jest.MockedFunction<typeof saveAlert>;
const mockEntryGate = evaluateEntryFanoutGate as jest.MockedFunction<
  typeof evaluateEntryFanoutGate
>;

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/tradingview/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
      'x-webhook-secret': 'tv-test-secret',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tradingview/webhook entry fan-out', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRADINGVIEW_WEBHOOK_SECRET = 'tv-test-secret';
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat';
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    mockSaveAlert.mockImplementation((input) => ({
      id: 'tv-alert-1',
      ...input,
      receivedAt: '2026-07-15T00:00:00.000Z',
      normalizedPair: 'BTCUSD',
      normalizedAction: String(input.action).toLowerCase().includes('buy') ? 'BUY' : 'SELL',
    }));
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
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('halts an entry before Telegram or Discord when evidence denies it', async () => {
    mockEntryGate.mockResolvedValueOnce({
      allowed: false,
      reason: 'cost_adjusted_edge:negative',
      evidence: {
        usableCount: 120,
        activeDays: 40,
        coverage: 0.95,
        perSignalMeanNetR: -0.2,
        equalDayLowerBoundNetR: -0.3,
      },
    });

    const response = await POST(request({
      symbol: 'BTCUSDT',
      action: 'buy',
      signal_id: 'sig-1',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(expect.objectContaining({
      routed: [],
      halted: 'cost_adjusted_edge:negative',
    }));
    expect(mockEntryGate).toHaveBeenCalledWith({ symbol: 'BTCUSD', signalId: 'sig-1' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('routes an explicitly approved entry', async () => {
    const response = await POST(request({
      symbol: 'BTCUSDT',
      action: 'entry-long',
      signalId: 'sig-approved',
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).routed).toEqual(['telegram', 'discord']);
    expect(mockEntryGate).toHaveBeenCalledWith({
      symbol: 'BTCUSD',
      signalId: 'sig-approved',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['test', 'close-long', 'take_profit', 'stop loss'])(
    'keeps the explicit %s lifecycle action available without the entry gate',
    async (action) => {
      const response = await POST(request({ symbol: 'BTCUSDT', action }));

      expect(response.status).toBe(200);
      expect(mockEntryGate).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const telegramBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body as string,
      ) as { text: string };
      expect(telegramBody.text).toContain(action.toUpperCase().replace(/[\s_-]+/g, ' '));
      expect(telegramBody.text).not.toContain('BTCUSD* SELL');
    },
  );

  it('treats unknown actions as entry-like because they render as SELL', async () => {
    await POST(request({ symbol: 'BTCUSDT', action: 'typo-action' }));

    expect(mockEntryGate).toHaveBeenCalledTimes(1);
  });
});

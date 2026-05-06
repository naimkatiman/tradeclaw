jest.mock('../signal-history', () => ({
  markTelegramProPosted: jest.fn().mockResolvedValue(undefined),
  getSignalTelegramProMessageId: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../observability', () => ({
  recordBroadcastResult: jest.fn(),
}));

import {
  broadcastSignalsToProGroup,
  formatProMessage,
  type ProBroadcastSignal,
} from '../telegram-pro-broadcast';
import {
  getSignalTelegramProMessageId,
  markTelegramProPosted,
} from '../signal-history';

const mockedMarkPro = markTelegramProPosted as jest.MockedFunction<
  typeof markTelegramProPosted
>;
const mockedGetProMsgId = getSignalTelegramProMessageId as jest.MockedFunction<
  typeof getSignalTelegramProMessageId
>;

const ORIG_ENV = { ...process.env };

function makeSignal(overrides: Partial<ProBroadcastSignal> = {}): ProBroadcastSignal {
  return {
    id: 'sig-1',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 78,
    entry: 2410.55,
    stopLoss: 2400.0,
    takeProfit1: 2420.0,
    takeProfit2: 2430.0,
    takeProfit3: 2445.0,
    gateBlocked: false,
    ...overrides,
  };
}

describe('formatProMessage', () => {
  it('escapes MarkdownV2 special characters in dynamic fields', () => {
    const text = formatProMessage(makeSignal({ symbol: 'XAU.USD', confidence: 71 }));
    expect(text).toContain('XAU\\.USD');
    expect(text).toContain('Confidence: 71%');
  });

  it('omits TP2/TP3 lines when not present', () => {
    const text = formatProMessage(
      makeSignal({ takeProfit2: null, takeProfit3: null }),
    );
    expect(text).toContain('TP1');
    expect(text).not.toContain('TP2');
    expect(text).not.toContain('TP3');
  });

  it('renders a SELL signal with the bearish emoji', () => {
    const text = formatProMessage(makeSignal({ direction: 'SELL' }));
    expect(text).toContain('SELL');
    expect(text).toContain('\u{1F4C9}'); // 📉
  });
});

describe('broadcastSignalsToProGroup — guard rails', () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV };
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_PRO_GROUP_ID;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = ORIG_ENV;
  });

  it('returns no_signals when input is empty', async () => {
    const result = await broadcastSignalsToProGroup([]);
    expect(result).toEqual({ attempted: 0, sent: 0, failed: 0, reason: 'no_signals' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips gate_blocked signals (they must never reach the Pro group)', async () => {
    const result = await broadcastSignalsToProGroup([
      makeSignal({ id: 'blocked', gateBlocked: true }),
    ]);
    expect(result.reason).toBe('no_signals');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_bot_token when TELEGRAM_BOT_TOKEN is unset (no fetch attempted)', async () => {
    const result = await broadcastSignalsToProGroup([makeSignal()]);
    expect(result.reason).toBe('no_bot_token');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_pro_group when token is set but group id is not', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    const result = await broadcastSignalsToProGroup([makeSignal()]);
    expect(result.reason).toBe('no_pro_group');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('broadcastSignalsToProGroup — sending', () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV };
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_PRO_GROUP_ID = '-1001234567890';
    mockedGetProMsgId.mockReset();
    mockedGetProMsgId.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = ORIG_ENV;
  });

  it('posts each tradable signal and counts sends', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 100 } }),
    });

    const result = await broadcastSignalsToProGroup([
      makeSignal({ id: 'a' }),
      makeSignal({ id: 'b' }),
    ]);

    expect(result).toEqual({ attempted: 2, sent: 2, failed: 0, skipped: 0 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('counts failed deliveries when Telegram returns ok:false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: false, description: 'chat not found' }),
    });

    const result = await broadcastSignalsToProGroup([makeSignal()]);
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 1, skipped: 0 });
  });

  it('counts network errors as failed without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await broadcastSignalsToProGroup([makeSignal()]);
    expect(result).toEqual({ attempted: 1, sent: 0, failed: 1, skipped: 0 });
  });

  it('targets TELEGRAM_PRO_GROUP_ID — never the free channel id', async () => {
    process.env.TELEGRAM_FREE_CHANNEL_ID = '-1009999999999';
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });

    await broadcastSignalsToProGroup([makeSignal()]);

    const fetchMock = global.fetch as jest.Mock;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('-1001234567890');
    expect(body.chat_id).not.toBe('-1009999999999');
  });

  it('persists telegram_pro_message_id on successful sends for reply threading', async () => {
    mockedMarkPro.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 4242 } }),
    });

    await broadcastSignalsToProGroup([makeSignal({ id: 'sig-xyz' })]);
    // Allow the fire-and-forget catch chain to resolve.
    await new Promise((r) => setImmediate(r));

    expect(mockedMarkPro).toHaveBeenCalledWith('sig-xyz', 4242);
  });

  it('does not persist a message_id on failure', async () => {
    mockedMarkPro.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: false, description: 'chat not found' }),
    });

    await broadcastSignalsToProGroup([makeSignal()]);
    await new Promise((r) => setImmediate(r));

    expect(mockedMarkPro).not.toHaveBeenCalled();
  });

  it('skips signals that already have a telegram_pro_message_id (dedup gate)', async () => {
    mockedMarkPro.mockClear();
    mockedGetProMsgId.mockImplementation(async (id: string) => {
      if (id === 'already-posted') return 9999;
      return undefined;
    });
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 7 } }),
    });

    const result = await broadcastSignalsToProGroup([
      makeSignal({ id: 'already-posted' }),
      makeSignal({ id: 'fresh' }),
    ]);

    expect(result).toEqual({ attempted: 2, sent: 1, failed: 0, skipped: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await new Promise((r) => setImmediate(r));
    expect(mockedMarkPro).toHaveBeenCalledTimes(1);
    expect(mockedMarkPro).toHaveBeenCalledWith('fresh', 7);
  });

  it('still sends when the dedup lookup throws (fail-open, never block delivery)', async () => {
    mockedGetProMsgId.mockRejectedValue(new Error('db down'));
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });

    const result = await broadcastSignalsToProGroup([makeSignal()]);
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
  });
});

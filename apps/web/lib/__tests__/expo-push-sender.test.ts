import {
  buildSignalMessages,
  sendExpoPushNotifications,
  dispatchSignalPushes,
} from '../expo-push-sender';
import type { TradingSignal } from '@tradeclaw/signals';
import type { ExpoPushTokenRecord } from '../expo-push-tokens';

function makeSignal(overrides: Partial<TradingSignal> = {}): TradingSignal {
  return {
    id: 's1',
    symbol: 'XAUUSD',
    direction: 'BUY',
    confidence: 85,
    entry: 2410.5,
    stopLoss: 2400,
    takeProfit1: 2420,
    takeProfit2: 2430,
    takeProfit3: 2445,
    indicators: { rsi: 55, macd: 0.5, ema20: 2400, ema50: 2390, bbUpper: 2450, bbLower: 2380, stochastic: 60, atr: 12 },
    timeframe: 'H1',
    timestamp: new Date().toISOString(),
    status: 'active',
    dataQuality: 'real',
    ...overrides,
  } as TradingSignal;
}

function makeToken(overrides: Partial<ExpoPushTokenRecord> = {}): ExpoPushTokenRecord {
  return {
    id: 't1',
    token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    platform: 'ios',
    pairs: ['XAUUSD', 'BTCUSD'],
    minConfidence: 80,
    directions: ['BUY', 'SELL'],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildSignalMessages', () => {
  it('returns empty array when no tokens match', () => {
    const signal = makeSignal();
    const tokens = [makeToken({ pairs: ['BTCUSD'] })];
    expect(buildSignalMessages(signal, tokens)).toHaveLength(0);
  });

  it('returns empty array when confidence is below token threshold', () => {
    const signal = makeSignal({ confidence: 75 });
    const tokens = [makeToken({ minConfidence: 80 })];
    expect(buildSignalMessages(signal, tokens)).toHaveLength(0);
  });

  it('returns empty array when direction does not match', () => {
    const signal = makeSignal({ direction: 'SELL' });
    const tokens = [makeToken({ directions: ['BUY'] })];
    expect(buildSignalMessages(signal, tokens)).toHaveLength(0);
  });

  it('skips disabled tokens', () => {
    const signal = makeSignal();
    const tokens = [makeToken({ enabled: false })];
    expect(buildSignalMessages(signal, tokens)).toHaveLength(0);
  });

  it('builds a message for matching token', () => {
    const signal = makeSignal();
    const tokens = [makeToken()];
    const msgs = buildSignalMessages(signal, tokens);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe(tokens[0].token);
    expect(msgs[0].title).toContain('XAUUSD BUY');
    expect(msgs[0].body).toContain('Entry 2410.5');
    expect(msgs[0].data?.symbol).toBe('XAUUSD');
    expect(msgs[0].sound).toBe('default');
    expect(msgs[0].priority).toBe('high');
  });

  it('respects "both" direction filter', () => {
    const signal = makeSignal({ direction: 'SELL' });
    const tokens = [makeToken({ directions: ['both'] })];
    const msgs = buildSignalMessages(signal, tokens);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].title).toContain('SELL');
  });
});

describe('sendExpoPushNotifications', () => {
  const ORIG_FETCH = global.fetch;

  afterEach(() => {
    global.fetch = ORIG_FETCH;
  });

  it('returns zero counts for empty messages', async () => {
    const result = await sendExpoPushNotifications([]);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('counts ok responses as sent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: [
          { status: 'ok', id: 'receipt-1' },
          { status: 'ok', id: 'receipt-2' },
        ],
      }),
    } as Response);

    const result = await sendExpoPushNotifications([
      { to: 't1', title: 'T1', body: 'B1' },
      { to: 't2', title: 'T2', body: 'B2' },
    ]);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('counts error responses as failed', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: [
          { status: 'ok', id: 'receipt-1' },
          { status: 'error', message: 'Invalid token' },
        ],
      }),
    } as Response);

    const result = await sendExpoPushNotifications([
      { to: 't1', title: 'T1', body: 'B1' },
      { to: 't2', title: 'T2', body: 'B2' },
    ]);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toContain('Invalid token');
  });

  it('handles network errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const result = await sendExpoPushNotifications([
      { to: 't1', title: 'T1', body: 'B1' },
    ]);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toContain('Network failure');
  });
});

describe('dispatchSignalPushes', () => {
  const ORIG_FETCH = global.fetch;

  afterEach(() => {
    global.fetch = ORIG_FETCH;
  });

  it('processes signals and tokens end-to-end', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: [{ status: 'ok', id: 'r1' }],
      }),
    } as Response);

    const signals = [makeSignal()];
    const tokens = [makeToken()];

    const result = await dispatchSignalPushes(signals, tokens);
    expect(result.signalsProcessed).toBe(1);
    expect(result.totalMessages).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });
});

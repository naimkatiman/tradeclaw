import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/db-pool', () => ({
  queryOne: jest.fn(),
}));

jest.mock('../../../../../lib/signal-history', () => ({
  recordSignalsAsync: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../../../../lib/paper-trading', () => ({
  autoFollowSignal: jest.fn().mockResolvedValue({ portfolio: {}, position: {} }),
  getDemoUserId: jest.fn().mockReturnValue('demo-user-123'),
}));

import { queryOne } from '../../../../../lib/db-pool';
import { recordSignalsAsync } from '../../../../../lib/signal-history';
import { autoFollowSignal, getDemoUserId } from '../../../../../lib/paper-trading';
import { POST } from '../route';

const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockedRecordSignalsAsync = recordSignalsAsync as jest.MockedFunction<typeof recordSignalsAsync>;
const mockedAutoFollowSignal = autoFollowSignal as jest.MockedFunction<typeof autoFollowSignal>;
const mockedGetDemoUserId = getDemoUserId as jest.MockedFunction<typeof getDemoUserId>;

describe('POST /api/webhooks/tradingview', () => {
  const ORIGINAL_SECRET = process.env.TV_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TV_WEBHOOK_SECRET = 'super-secret-test-token-1234567890';
    mockedGetDemoUserId.mockReturnValue('demo-user-123');
  });

  afterAll(() => {
    process.env.TV_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  function makeReq(body: unknown, secret?: string) {
    return new NextRequest('http://localhost/api/webhooks/tradingview', {
      method: 'POST',
      headers: secret ? { 'x-tv-secret': secret } : undefined,
      body: JSON.stringify(body),
    });
  }

  it('rejects requests without the configured secret', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/webhooks/tradingview', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it('rejects disallowed strategy ids before touching the DB', async () => {
    const res = await POST(
      makeReq(
        {
          source_id: 'tv-evil-1',
          strategy_id: 'not-allowed',
          symbol: 'XAUUSD',
          timeframe: 'H1',
          direction: 'BUY',
          entry: 2321.5,
          signal_ts: '2026-05-20T10:00:00.000Z',
        },
        process.env.TV_WEBHOOK_SECRET,
      ),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_payload', field: 'strategy_id_not_allowed' });
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it('persists a valid TradingView signal and returns ok', async () => {
    mockedQueryOne.mockResolvedValueOnce({ source_id: 'hafiz-xauusd-h1-1716208800' });

    const payload = {
      source_id: 'hafiz-xauusd-h1-1716208800',
      strategy_id: 'tv-hafiz-synergy',
      symbol: 'xauusd',
      timeframe: 'h1',
      direction: 'BUY',
      confidence: 87,
      entry: 2321.5,
      stop_loss: 2310.25,
      take_profit_1: 2332.75,
      take_profit_2: 2344.5,
      signal_ts: '2026-05-20T10:00:00.000Z',
    };

    const res = await POST(makeReq(payload, process.env.TV_WEBHOOK_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockedQueryOne).toHaveBeenCalledTimes(1);
    expect(mockedQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO premium_signals'),
      [
        'hafiz-xauusd-h1-1716208800',
        'tv-hafiz-synergy',
        'XAUUSD',
        'H1',
        'BUY',
        87,
        2321.5,
        2310.25,
        2332.75,
        2344.5,
        JSON.stringify({
          ...payload,
          symbol: 'XAUUSD',
          timeframe: 'H1',
        }),
        new Date('2026-05-20T10:00:00.000Z'),
      ],
    );
    // The INSERT must RETURNING source_id so duplicates can be detected.
    expect(mockedQueryOne.mock.calls[0][0]).toContain('RETURNING source_id');
    expect(mockedRecordSignalsAsync).toHaveBeenCalledTimes(1);
    expect(mockedRecordSignalsAsync).toHaveBeenCalledWith([
      {
        id: 'hafiz-xauusd-h1-1716208800',
        symbol: 'XAUUSD',
        timeframe: 'H1',
        direction: 'BUY',
        confidence: 87,
        entry: 2321.5,
        timestamp: '2026-05-20T10:00:00.000Z',
        takeProfit1: 2332.75,
        stopLoss: 2310.25,
        strategyId: 'tv-hafiz-synergy',
      },
    ]);
    expect(mockedAutoFollowSignal).toHaveBeenCalledTimes(1);
    expect(mockedAutoFollowSignal).toHaveBeenCalledWith({
      userId: 'demo-user-123',
      id: 'hafiz-xauusd-h1-1716208800',
      symbol: 'XAUUSD',
      direction: 'BUY',
      entry: 2321.5,
      stopLoss: 2310.25,
      takeProfit: 2332.75,
      positionSizePct: 0.05,
    });
  });

  it('does not auto-follow a replayed (duplicate source_id) signal', async () => {
    // ON CONFLICT DO NOTHING returns no row → isNewSignal=false → no new position.
    mockedQueryOne.mockResolvedValueOnce(null);

    const payload = {
      source_id: 'hafiz-xauusd-h1-1716208800',
      strategy_id: 'tv-hafiz-synergy',
      symbol: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      confidence: 87,
      entry: 2321.5,
      stop_loss: 2310.25,
      take_profit_1: 2332.75,
      signal_ts: '2026-05-20T10:00:00.000Z',
    };

    const res = await POST(makeReq(payload, process.env.TV_WEBHOOK_SECRET));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    // History mirror is idempotent on its own, so it still runs.
    expect(mockedRecordSignalsAsync).toHaveBeenCalledTimes(1);
    // But the paper-trading position must NOT be opened a second time.
    expect(mockedAutoFollowSignal).not.toHaveBeenCalled();
  });

  it('defaults confidence to 90 when omitted', async () => {
    mockedQueryOne.mockResolvedValueOnce({ source_id: 'zaky-btcusd-h4-1716208801' });

    const payload = {
      source_id: 'zaky-btcusd-h4-1716208801',
      strategy_id: 'tv-zaky-classic',
      symbol: 'BTCUSD',
      timeframe: 'H4',
      direction: 'SELL',
      entry: 64500,
      signal_ts: '2026-05-20T10:05:00.000Z',
    };

    const res = await POST(makeReq(payload, process.env.TV_WEBHOOK_SECRET));

    expect(res.status).toBe(200);
    const [, args] = mockedQueryOne.mock.calls[0];
    expect(args).toEqual([
      'zaky-btcusd-h4-1716208801',
      'tv-zaky-classic',
      'BTCUSD',
      'H4',
      'SELL',
      90,
      64500,
      null,
      null,
      null,
      JSON.stringify({
        ...payload,
        symbol: 'BTCUSD',
        timeframe: 'H4',
      }),
      new Date('2026-05-20T10:05:00.000Z'),
    ]);
    expect(mockedRecordSignalsAsync).toHaveBeenCalledTimes(1);
    expect(mockedRecordSignalsAsync).toHaveBeenCalledWith([
      {
        id: 'zaky-btcusd-h4-1716208801',
        symbol: 'BTCUSD',
        timeframe: 'H4',
        direction: 'SELL',
        confidence: 90,
        entry: 64500,
        timestamp: '2026-05-20T10:05:00.000Z',
        takeProfit1: undefined,
        stopLoss: undefined,
        strategyId: 'tv-zaky-classic',
      },
    ]);
    // No SL/TP → auto-follow skipped
    expect(mockedAutoFollowSignal).not.toHaveBeenCalled();
  });

  it('skips auto-follow when demo user is not configured', async () => {
    mockedQueryOne.mockResolvedValueOnce({ source_id: 'zaky-xauusd-h1-1716208802' });
    mockedGetDemoUserId.mockReturnValue(null);

    const payload = {
      source_id: 'zaky-xauusd-h1-1716208802',
      strategy_id: 'tv-zaky-classic',
      symbol: 'XAUUSD',
      timeframe: 'H1',
      direction: 'BUY',
      entry: 2321.5,
      stop_loss: 2310.25,
      take_profit_1: 2332.75,
      signal_ts: '2026-05-20T10:10:00.000Z',
    };

    const res = await POST(makeReq(payload, process.env.TV_WEBHOOK_SECRET));
    expect(res.status).toBe(200);
    expect(mockedAutoFollowSignal).not.toHaveBeenCalled();
  });
});

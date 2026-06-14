jest.mock('../db-pool', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('../alert-channels', () => ({
  sendDiscordWebhook: jest.fn(),
}));

jest.mock('../tier', () => ({
  FREE_SYMBOLS: ['BTCUSD', 'ETHUSD'],
}));

import { broadcastSignalsToDiscord } from '../discord-broadcast';
import { query, queryOne, execute } from '../db-pool';
import { sendDiscordWebhook } from '../alert-channels';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;
const mockedSend = sendDiscordWebhook as jest.MockedFunction<typeof sendDiscordWebhook>;

const ROW = {
  id: 'SIG-BTCUSD-H1-BUY-1',
  pair: 'BTCUSD',
  direction: 'BUY',
  confidence: 87,
  entry_price: '64000',
  tp1: '65000',
  sl: '63000',
  timeframe: 'H1',
};

describe('broadcastSignalsToDiscord — atomic claim loop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('claims, sends, and counts a posted row without releasing the claim', async () => {
    mockedQuery.mockResolvedValueOnce([ROW]);
    mockedQueryOne.mockResolvedValueOnce({ id: ROW.id }); // claim won
    mockedSend.mockResolvedValueOnce(true);

    const res = await broadcastSignalsToDiscord('https://discord.test/webhook');

    expect(res).toEqual({ posted: 1, attempted: 1 });
    // claim UPDATE is conditional on discord_posted_at IS NULL
    expect(mockedQueryOne).toHaveBeenCalledTimes(1);
    expect(mockedQueryOne.mock.calls[0][0]).toContain('discord_posted_at IS NULL');
    expect(mockedSend).toHaveBeenCalledTimes(1);
    // success path must NOT release the claim
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('skips a row whose claim was lost to a concurrent invocation (no duplicate send)', async () => {
    mockedQuery.mockResolvedValueOnce([ROW]);
    mockedQueryOne.mockResolvedValueOnce(null); // another invocation already claimed it

    const res = await broadcastSignalsToDiscord('https://discord.test/webhook');

    expect(res).toEqual({ posted: 0, attempted: 1 });
    expect(mockedSend).not.toHaveBeenCalled();
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('releases the claim when the send fails so the next run can retry', async () => {
    mockedQuery.mockResolvedValueOnce([ROW]);
    mockedQueryOne.mockResolvedValueOnce({ id: ROW.id }); // claim won
    mockedSend.mockResolvedValueOnce(false); // Discord send failed

    const res = await broadcastSignalsToDiscord('https://discord.test/webhook');

    expect(res).toEqual({ posted: 0, attempted: 1 });
    expect(mockedSend).toHaveBeenCalledTimes(1);
    // claim released back to NULL
    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(mockedExecute.mock.calls[0][0]).toContain('discord_posted_at = NULL');
    expect(mockedExecute.mock.calls[0][1]).toEqual([ROW.id]);
  });
});

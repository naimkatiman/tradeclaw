import { NextRequest } from 'next/server';

jest.mock('../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../lib/alert-rules-db', () => ({
  getChannelConfigsForUser: jest.fn(),
  upsertChannelConfig: jest.fn(),
  deleteChannelConfig: jest.fn(),
}));

jest.mock('../../../../lib/alert-channels', () => ({
  sendToChannel: jest.fn(),
}));

jest.mock('../../../../lib/db', () => ({
  getUserById: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../lib/user-session';
import {
  getChannelConfigsForUser,
  upsertChannelConfig,
  deleteChannelConfig,
} from '../../../../lib/alert-rules-db';
import { sendToChannel } from '../../../../lib/alert-channels';
import { getUserById } from '../../../../lib/db';
import { GET, POST } from '../route';
import { DELETE, POST as POST_TEST } from '../[channel]/route';

const mockedRead = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetCfg = getChannelConfigsForUser as jest.MockedFunction<typeof getChannelConfigsForUser>;
const mockedUpsert = upsertChannelConfig as jest.MockedFunction<typeof upsertChannelConfig>;
const mockedDelete = deleteChannelConfig as jest.MockedFunction<typeof deleteChannelConfig>;
const mockedSend = sendToChannel as jest.MockedFunction<typeof sendToChannel>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;

function fakeUser(overrides: Partial<{ telegramUserId: bigint | null }> = {}) {
  return {
    id: 'u1',
    email: 'u1@example.com',
    stripeCustomerId: null,
    tier: 'free' as const,
    tierExpiresAt: null,
    telegramUserId: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/alert-channels', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockedRead.mockReturnValueOnce(null);
    const res = await GET(new NextRequest('http://localhost/api/alert-channels'));
    expect(res.status).toBe(401);
    expect(mockedGetCfg).not.toHaveBeenCalled();
  });

  it('returns the calling user\'s channel configs', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      {
        id: 'c1',
        user_id: 'u1',
        channel: 'telegram',
        config: { chatId: '123' },
        enabled: true,
      },
    ]);
    mockedGetUser.mockResolvedValueOnce(fakeUser());
    const res = await GET(new NextRequest('http://localhost/api/alert-channels'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configs).toHaveLength(1);
    expect(body.configs[0].channel).toBe('telegram');
    expect(body.telegramBotLinked).toBe(false);
    expect(mockedGetCfg).toHaveBeenCalledWith('u1');
  });

  it('reports telegramBotLinked=true when the user has linked the bot', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([]);
    mockedGetUser.mockResolvedValueOnce(fakeUser({ telegramUserId: BigInt('555111222') }));
    const res = await GET(new NextRequest('http://localhost/api/alert-channels'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.telegramBotLinked).toBe(true);
  });
});

describe('POST /api/alert-channels', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockedRead.mockReturnValueOnce(null);
    const res = await POST(
      new NextRequest('http://localhost/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({ channel: 'telegram', config: { chatId: '1' } }),
      }),
    );
    expect(res.status).toBe(401);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('rejects an unknown channel name with 400', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    const res = await POST(
      new NextRequest('http://localhost/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({ channel: 'sms', config: {} }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it('upserts a valid telegram config and returns it', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedUpsert.mockResolvedValueOnce({
      id: 'c1',
      user_id: 'u1',
      channel: 'telegram',
      config: { chatId: '123' },
      enabled: true,
    });
    const res = await POST(
      new NextRequest('http://localhost/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({
          channel: 'telegram',
          config: { chatId: '123' },
          enabled: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.channel).toBe('telegram');
    expect(mockedUpsert).toHaveBeenCalledWith('u1', 'telegram', { chatId: '123' }, true);
  });
});

describe('DELETE /api/alert-channels/[channel]', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockedRead.mockReturnValueOnce(null);
    const res = await DELETE(
      new NextRequest('http://localhost/api/alert-channels/telegram', { method: 'DELETE' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(401);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('rejects unknown channel param with 400', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    const res = await DELETE(
      new NextRequest('http://localhost/api/alert-channels/sms', { method: 'DELETE' }),
      { params: Promise.resolve({ channel: 'sms' }) },
    );
    expect(res.status).toBe(400);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('forwards a valid channel delete to the DB layer', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedDelete.mockResolvedValueOnce(true);
    const res = await DELETE(
      new NextRequest('http://localhost/api/alert-channels/discord', { method: 'DELETE' }),
      { params: Promise.resolve({ channel: 'discord' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toBe(true);
    expect(mockedDelete).toHaveBeenCalledWith('u1', 'discord');
  });
});

describe('POST /api/alert-channels/[channel]/test', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockedRead.mockReturnValueOnce(null);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/telegram/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(401);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('rejects unknown channel with 400', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/sms/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'sms' }) },
    );
    expect(res.status).toBe(400);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('returns 404 when a non-telegram channel is not configured', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([]);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/discord/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'discord' }) },
    );
    expect(res.status).toBe(404);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('returns 400 when the channel is disabled', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      { id: 'c1', user_id: 'u1', channel: 'discord', config: { webhookUrl: 'https://x' }, enabled: false },
    ]);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/discord/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'discord' }) },
    );
    expect(res.status).toBe(400);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('telegram returns 404 when neither per-channel config nor bot link exists', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([]);
    mockedGetUser.mockResolvedValueOnce(fakeUser());
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/telegram/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(404);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('telegram falls back to users.telegram_user_id when no per-channel config exists', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([]);
    mockedGetUser.mockResolvedValueOnce(fakeUser({ telegramUserId: BigInt('555111222') }));
    mockedSend.mockResolvedValueOnce(true);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/telegram/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivered).toBe(true);
    expect(mockedSend).toHaveBeenCalledWith(
      'telegram',
      { chatId: '555111222' },
      expect.objectContaining({ symbol: 'XAUUSD' }),
    );
  });

  it('telegram fallback merges chatId into existing config that lacks one', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      { id: 'c1', user_id: 'u1', channel: 'telegram', config: { botToken: 'custom-bot' }, enabled: true },
    ]);
    mockedGetUser.mockResolvedValueOnce(fakeUser({ telegramUserId: BigInt('999') }));
    mockedSend.mockResolvedValueOnce(true);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/telegram/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(200);
    expect(mockedSend).toHaveBeenCalledWith(
      'telegram',
      { botToken: 'custom-bot', chatId: '999' },
      expect.objectContaining({ symbol: 'XAUUSD' }),
    );
  });

  it('telegram disabled config still returns 400 even when bot is linked', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      { id: 'c1', user_id: 'u1', channel: 'telegram', config: { chatId: '1' }, enabled: false },
    ]);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/telegram/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'telegram' }) },
    );
    expect(res.status).toBe(400);
    expect(mockedSend).not.toHaveBeenCalled();
    expect(mockedGetUser).not.toHaveBeenCalled();
  });

  it('dispatches a fake signal through the configured channel', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      { id: 'c1', user_id: 'u1', channel: 'discord', config: { webhookUrl: 'https://x' }, enabled: true },
    ]);
    mockedSend.mockResolvedValueOnce(true);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/discord/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'discord' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivered).toBe(true);
    expect(mockedSend).toHaveBeenCalledWith(
      'discord',
      { webhookUrl: 'https://x' },
      expect.objectContaining({ symbol: 'XAUUSD', direction: 'BUY' }),
    );
  });

  it('reports delivered=false when the sender returns false', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'u1', issuedAt: Date.now() });
    mockedGetCfg.mockResolvedValueOnce([
      { id: 'c1', user_id: 'u1', channel: 'email', config: { to: 'a@b' }, enabled: true },
    ]);
    mockedSend.mockResolvedValueOnce(false);
    const res = await POST_TEST(
      new NextRequest('http://localhost/api/alert-channels/email/test', { method: 'POST' }),
      { params: Promise.resolve({ channel: 'email' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivered).toBe(false);
  });
});

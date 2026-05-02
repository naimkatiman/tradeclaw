import { NextRequest } from 'next/server';

jest.mock('../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../lib/alert-rules-db', () => ({
  getChannelConfigsForUser: jest.fn(),
  upsertChannelConfig: jest.fn(),
  deleteChannelConfig: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../lib/user-session';
import {
  getChannelConfigsForUser,
  upsertChannelConfig,
  deleteChannelConfig,
} from '../../../../lib/alert-rules-db';
import { GET, POST } from '../route';
import { DELETE } from '../[channel]/route';

const mockedRead = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetCfg = getChannelConfigsForUser as jest.MockedFunction<typeof getChannelConfigsForUser>;
const mockedUpsert = upsertChannelConfig as jest.MockedFunction<typeof upsertChannelConfig>;
const mockedDelete = deleteChannelConfig as jest.MockedFunction<typeof deleteChannelConfig>;

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
    const res = await GET(new NextRequest('http://localhost/api/alert-channels'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configs).toHaveLength(1);
    expect(body.configs[0].channel).toBe('telegram');
    expect(mockedGetCfg).toHaveBeenCalledWith('u1');
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

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../../lib/tier', () => ({
  getUserTier: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import { getUserTier } from '../../../../../lib/tier';
import { GET } from '../route';

const mockedRead = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedTier = getUserTier as jest.MockedFunction<typeof getUserTier>;

describe('GET /api/telegram/channel-invite', () => {
  const ORIGINAL_PRO = process.env.TELEGRAM_PRO_CHANNEL_INVITE;
  const ORIGINAL_ELITE = process.env.TELEGRAM_ELITE_CHANNEL_INVITE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_PRO_CHANNEL_INVITE = 'https://t.me/+ProChannel';
    process.env.TELEGRAM_ELITE_CHANNEL_INVITE = 'https://t.me/+EliteChannel';
  });

  afterAll(() => {
    process.env.TELEGRAM_PRO_CHANNEL_INVITE = ORIGINAL_PRO;
    process.env.TELEGRAM_ELITE_CHANNEL_INVITE = ORIGINAL_ELITE;
  });

  it('returns 401 for unauthenticated callers', async () => {
    mockedRead.mockReturnValueOnce(null);

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for free-tier users', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-free', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('free');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    expect(res.status).toBe(403);
  });

  it('returns Pro invite for pro-tier users', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-pro', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('pro');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('pro');
    expect(body.invite).toBe('https://t.me/+ProChannel');
  });

  it('returns Pro invite for custom-tier users', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-custom', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('custom');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('pro');
    expect(body.invite).toBe('https://t.me/+ProChannel');
  });

  it('returns Elite invite for elite-tier users', async () => {
    mockedRead.mockReturnValueOnce({ userId: 'user-elite', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('elite');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe('elite');
    expect(body.invite).toBe('https://t.me/+EliteChannel');
  });

  it('falls back to Pro invite when Elite invite is missing', async () => {
    delete process.env.TELEGRAM_ELITE_CHANNEL_INVITE;
    mockedRead.mockReturnValueOnce({ userId: 'user-elite', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('elite');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.invite).toBe('https://t.me/+ProChannel');
  });

  it('returns 503 when Pro invite is not configured', async () => {
    delete process.env.TELEGRAM_PRO_CHANNEL_INVITE;
    delete process.env.TELEGRAM_ELITE_CHANNEL_INVITE;
    mockedRead.mockReturnValueOnce({ userId: 'user-pro', issuedAt: Date.now() });
    mockedTier.mockResolvedValueOnce('pro');

    const res = await GET(new NextRequest('http://localhost/api/telegram/channel-invite'));
    expect(res.status).toBe(503);
  });
});

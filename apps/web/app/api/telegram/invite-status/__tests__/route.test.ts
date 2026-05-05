import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));
jest.mock('../../../../../lib/db', () => ({
  getUserById: jest.fn(),
  getUserSubscription: jest.fn(),
  getLatestUserTelegramInvite: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import {
  getUserById,
  getUserSubscription,
  getLatestUserTelegramInvite,
} from '../../../../../lib/db';
import { GET } from '../route';

const mockedSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedGetSub = getUserSubscription as jest.MockedFunction<typeof getUserSubscription>;
const mockedGetInvite = getLatestUserTelegramInvite as jest.MockedFunction<
  typeof getLatestUserTelegramInvite
>;

function makeRequest() {
  return new NextRequest('http://localhost/api/telegram/invite-status');
}

describe('GET /api/telegram/invite-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockedSession.mockReturnValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns tier=free with invite=null for free users', async () => {
    mockedSession.mockReturnValueOnce({ userId: 'user-free', issuedAt: Date.now() });
    mockedGetUser.mockResolvedValueOnce({
      id: 'user-free',
      email: 'f@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
    });
    mockedGetSub.mockResolvedValueOnce(null);

    const body = await (await GET(makeRequest())).json();
    expect(body).toEqual({
      ok: true,
      tier: 'free',
      linked: false,
      invite: null,
    });
    expect(mockedGetInvite).not.toHaveBeenCalled();
  });

  it('returns active invite payload for a Pro user with a fresh invite', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 1000);
    mockedSession.mockReturnValueOnce({ userId: 'user-pro', issuedAt: Date.now() });
    mockedGetUser.mockResolvedValueOnce({
      id: 'user-pro',
      email: 'p@example.com',
      stripeCustomerId: null,
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: BigInt(42),
    });
    mockedGetSub.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-pro',
      stripeSubscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      status: 'active',
      currentPeriodStart: past,
      currentPeriodEnd: future,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: past,
      updatedAt: past,
    });
    mockedGetInvite.mockResolvedValueOnce({
      id: 'invite-1',
      userId: 'user-pro',
      tier: 'pro',
      inviteLink: 'https://t.me/+abc',
      telegramChatId: BigInt(-1001),
      isActive: true,
      createdAt: past,
      expiresAt: future,
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.ok).toBe(true);
    expect(body.tier).toBe('pro');
    expect(body.linked).toBe(true);
    expect(body.invite.isActive).toBe(true);
    expect(body.invite.isExpired).toBe(false);
    expect(body.invite.expiresAt).toBe(future.toISOString());
  });

  it('flags expired invite as isExpired=true', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockedSession.mockReturnValueOnce({ userId: 'user-pro', issuedAt: Date.now() });
    mockedGetUser.mockResolvedValueOnce({
      id: 'user-pro',
      email: 'p@example.com',
      stripeCustomerId: null,
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: BigInt(42),
    });
    mockedGetSub.mockResolvedValueOnce(null);
    mockedGetInvite.mockResolvedValueOnce({
      id: 'invite-old',
      userId: 'user-pro',
      tier: 'pro',
      inviteLink: 'https://t.me/+old',
      telegramChatId: BigInt(-1001),
      isActive: true,
      createdAt: past,
      expiresAt: past,
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.invite.isExpired).toBe(true);
  });

  it('returns invite=null when paying user has no invite row yet', async () => {
    mockedSession.mockReturnValueOnce({ userId: 'user-pro', issuedAt: Date.now() });
    mockedGetUser.mockResolvedValueOnce({
      id: 'user-pro',
      email: 'p@example.com',
      stripeCustomerId: null,
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: BigInt(42),
    });
    mockedGetSub.mockResolvedValueOnce(null);
    mockedGetInvite.mockResolvedValueOnce(null);

    const body = await (await GET(makeRequest())).json();
    expect(body.tier).toBe('pro');
    expect(body.linked).toBe(true);
    expect(body.invite).toBeNull();
  });
});

/**
 * Stripe billing portal tests. Verifies that "Manage Billing" issues a portal
 * session URL only for an authed user with a stripeCustomerId, and rejects
 * unauthenticated callers and users without a billing account.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/stripe', () => ({
  getStripe: jest.fn(),
}));

jest.mock('../../../../../lib/db', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

import { getStripe } from '../../../../../lib/stripe';
import { getUserById } from '../../../../../lib/db';
import { readSessionFromRequest } from '../../../../../lib/user-session';
import { POST } from '../route';

const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedReadSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/stripe/portal', {
    method: 'POST',
  });
}

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockedReadSession.mockReturnValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mockedGetUserById).not.toHaveBeenCalled();
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('returns 404 when the authed user has no stripeCustomerId (never subscribed)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('issues a billing portal session URL for an authed Pro user', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'pro@example.com',
      stripeCustomerId: 'cus_pro_1',
      tier: 'pro',
      tierExpiresAt: new Date(Date.now() + 30 * 86400 * 1000),
      telegramUserId: null,
    });

    const portalCreate = jest.fn().mockResolvedValue({
      url: 'https://billing.stripe.com/p/session/test_xyz',
    });
    mockedGetStripe.mockReturnValue({
      billingPortal: { sessions: { create: portalCreate } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe('https://billing.stripe.com/p/session/test_xyz');

    expect(portalCreate).toHaveBeenCalledTimes(1);
    const args = portalCreate.mock.calls[0][0];
    expect(args.customer).toBe('cus_pro_1');
    expect(args.return_url).toMatch(/\/dashboard\/billing$/);
  });

  it('surfaces Stripe errors as 500 (does not leak portal URL on failure)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'pro@example.com',
      stripeCustomerId: 'cus_pro_1',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
    });

    const portalCreate = jest.fn().mockRejectedValue(new Error('Stripe down'));
    mockedGetStripe.mockReturnValue({
      billingPortal: { sessions: { create: portalCreate } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.url).toBeUndefined();
    expect(body.error).toBe('Stripe down');
  });
});

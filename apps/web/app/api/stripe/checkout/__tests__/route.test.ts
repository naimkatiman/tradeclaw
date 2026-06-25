/**
 * Stripe checkout route tests. Verifies the authed Pro purchase path issues
 * a Stripe-hosted checkout URL with the correct subscription metadata, and
 * that input validation rejects bad payloads without ever calling Stripe.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/stripe', () => ({
  getStripe: jest.fn(),
  resolveTierFromPriceId: jest.fn(),
  resolveStripePriceId: jest.fn(),
}));

jest.mock('../../../../../lib/db', () => ({
  getUserById: jest.fn(),
  getUserByReferralCode: jest.fn(),
  updateUserStripeCustomerId: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

import {
  getStripe,
  resolveTierFromPriceId,
  resolveStripePriceId,
} from '../../../../../lib/stripe';
import { getUserById, getUserByReferralCode, updateUserStripeCustomerId } from '../../../../../lib/db';
import { readSessionFromRequest } from '../../../../../lib/user-session';
import { POST } from '../route';

const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockedResolveTier = resolveTierFromPriceId as jest.MockedFunction<typeof resolveTierFromPriceId>;
const mockedResolvePrice = resolveStripePriceId as jest.MockedFunction<typeof resolveStripePriceId>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedGetUserByReferralCode = getUserByReferralCode as jest.MockedFunction<typeof getUserByReferralCode>;
const mockedUpdateCustomerId = updateUserStripeCustomerId as jest.MockedFunction<typeof updateUserStripeCustomerId>;
const mockedReadSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;

function makeRequest(body: Record<string, unknown>, cookie?: string): NextRequest {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function userRecord(id: string) {
  return {
    id,
    email: `${id}@example.com`,
    stripeCustomerId: 'cus_x' as string | null,
    tier: 'free' as const,
    tierExpiresAt: null,
    telegramUserId: null,
    displayName: null,
    avatarUrl: null,
    authProvider: null,
    referralCode: null,
    referredBy: null,
  };
}

/** Wire up an authed Pro-monthly checkout and return the Stripe sessions.create spy. */
function setupAuthedProUser(userId: string): jest.Mock {
  mockedReadSession.mockReturnValue({ userId, issuedAt: Date.now() });
  mockedResolvePrice.mockReturnValueOnce('price_pro_monthly');
  mockedResolveTier.mockReturnValueOnce('pro');
  mockedGetUserById.mockResolvedValueOnce(userRecord(userId));
  const sessionsCreate = jest.fn().mockResolvedValue({
    id: 'cs_ref',
    url: 'https://checkout.stripe.com/c/pay/cs_ref',
    customer: 'cus_x',
  });
  mockedGetStripe.mockReturnValue({
    checkout: { sessions: { create: sessionsCreate } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return sessionsCreate;
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated callers with 401 (never reaches Stripe)', async () => {
    mockedReadSession.mockReturnValue(null);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(401);
    expect(mockedGetUserById).not.toHaveBeenCalled();
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('rejects payloads missing tier+interval and priceId with 400', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('rejects an unknown priceId with 400', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedResolveTier.mockReturnValueOnce(null);

    const res = await POST(makeRequest({ priceId: 'price_unknown' }));
    expect(res.status).toBe(400);
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('returns 503 when tier+interval map to no configured price (env not set)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedResolvePrice.mockReturnValueOnce(null);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(503);
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('rejects unsupported tier values with 400', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });

    const res = await POST(makeRequest({ tier: 'free', interval: 'monthly' }));
    expect(res.status).toBe(400);
    expect(mockedResolvePrice).not.toHaveBeenCalled();
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('rejects malformed interval with 400', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });

    const res = await POST(makeRequest({ tier: 'pro', interval: 'lifetime' }));
    expect(res.status).toBe(400);
    expect(mockedResolvePrice).not.toHaveBeenCalled();
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('returns 503 when resolved priceId maps back to a different tier (env misconfigured)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    // env says STRIPE_PRO_MONTHLY_PRICE_ID = price_secretly_elite
    mockedResolvePrice.mockReturnValueOnce('price_secretly_elite');
    // but that price actually maps to elite
    mockedResolveTier.mockReturnValueOnce('elite');

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(503);
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });

  it('issues a Stripe checkout URL for an authed Pro user (monthly)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedResolvePrice.mockReturnValueOnce('price_pro_monthly');
    mockedResolveTier.mockReturnValueOnce('pro');
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'pro@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const sessionsCreate = jest.fn().mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      customer: 'cus_new_1',
    });
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { create: sessionsCreate } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    expect(body.sessionId).toBe('cs_test_123');

    expect(sessionsCreate).toHaveBeenCalledTimes(1);
    const params = sessionsCreate.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.line_items[0].price).toBe('price_pro_monthly');
    expect(params.client_reference_id).toBe('user-1');
    expect(params.metadata).toEqual({ tier: 'pro', userId: 'user-1', referrerId: '' });
    expect(params.subscription_data.metadata).toEqual({ userId: 'user-1', tier: 'pro' });
    expect(params.subscription_data.trial_period_days).toBe(7);
    expect(params.allow_promotion_codes).toBe(true);

    // New customer → persist the Stripe customer id back to the user row
    expect(mockedUpdateCustomerId).toHaveBeenCalledWith('user-1', 'cus_new_1');
  });

  it('reuses existing stripeCustomerId on the user record (no DB write-back)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedResolvePrice.mockReturnValueOnce('price_pro_annual');
    mockedResolveTier.mockReturnValueOnce('pro');
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'pro@example.com',
      stripeCustomerId: 'cus_existing',
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const sessionsCreate = jest.fn().mockResolvedValue({
      id: 'cs_test_456',
      url: 'https://checkout.stripe.com/c/pay/cs_test_456',
      customer: 'cus_existing',
    });
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { create: sessionsCreate } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'annual' }));
    expect(res.status).toBe(200);

    const params = sessionsCreate.mock.calls[0][0];
    expect(params.customer).toBe('cus_existing');
    expect(mockedUpdateCustomerId).not.toHaveBeenCalled();
  });

  it('surfaces Stripe errors as 500 (does not leak partial state)', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedResolvePrice.mockReturnValueOnce('price_pro_monthly');
    mockedResolveTier.mockReturnValueOnce('pro');
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'pro@example.com',
      stripeCustomerId: null,
      tier: 'free',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const sessionsCreate = jest.fn().mockRejectedValue(new Error('Stripe down'));
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { create: sessionsCreate } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.url).toBeUndefined();
    expect(body.error).toBe('Stripe down');
  });

  it('resolves the tc_ref cookie to the referrer user id in checkout metadata', async () => {
    const sessionsCreate = setupAuthedProUser('buyer-1');
    mockedGetUserByReferralCode.mockResolvedValueOnce(userRecord('referrer-9'));

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }, 'tc_ref=ABCD1234'));
    expect(res.status).toBe(200);
    expect(mockedGetUserByReferralCode).toHaveBeenCalledWith('ABCD1234');
    expect(sessionsCreate.mock.calls[0][0].metadata).toEqual({
      tier: 'pro',
      userId: 'buyer-1',
      referrerId: 'referrer-9',
    });
  });

  it('drops a self-referral (cookie code resolves to the buyer)', async () => {
    const sessionsCreate = setupAuthedProUser('buyer-1');
    mockedGetUserByReferralCode.mockResolvedValueOnce(userRecord('buyer-1'));

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }, 'tc_ref=BEEF0001'));
    expect(res.status).toBe(200);
    expect(sessionsCreate.mock.calls[0][0].metadata.referrerId).toBe('');
  });

  it('ignores an unknown referral code (no referrer recorded)', async () => {
    const sessionsCreate = setupAuthedProUser('buyer-1');
    mockedGetUserByReferralCode.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }, 'tc_ref=DEADBEEF'));
    expect(res.status).toBe(200);
    expect(sessionsCreate.mock.calls[0][0].metadata.referrerId).toBe('');
  });

  it('does not look up a referral when no tc_ref cookie is present', async () => {
    const sessionsCreate = setupAuthedProUser('buyer-1');

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }));
    expect(res.status).toBe(200);
    expect(mockedGetUserByReferralCode).not.toHaveBeenCalled();
    expect(sessionsCreate.mock.calls[0][0].metadata.referrerId).toBe('');
  });

  it('ignores a malformed referral code without a DB lookup', async () => {
    const sessionsCreate = setupAuthedProUser('buyer-1');

    const res = await POST(makeRequest({ tier: 'pro', interval: 'monthly' }, 'tc_ref=GHIJKLMN'));
    expect(res.status).toBe(200);
    expect(mockedGetUserByReferralCode).not.toHaveBeenCalled();
    expect(sessionsCreate.mock.calls[0][0].metadata.referrerId).toBe('');
  });
});

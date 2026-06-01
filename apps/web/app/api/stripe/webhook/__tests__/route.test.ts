/**
 * Stripe webhook idempotency tests. Verifies that a duplicate redelivery of
 * the same event_id short-circuits before any side-effecting handler runs —
 * the bug class is duplicate Telegram invite generation on Stripe replays.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/stripe', () => ({
  getStripe: jest.fn(),
  resolveTierFromPriceId: jest.fn().mockReturnValue('pro'),
}));

jest.mock('../../../../../lib/db', () => ({
  getUserByStripeCustomerId: jest.fn().mockResolvedValue(null),
  getUserById: jest.fn().mockResolvedValue(null),
  updateUserTier: jest.fn().mockResolvedValue(undefined),
  upsertSubscription: jest.fn().mockResolvedValue(undefined),
  cancelSubscription: jest.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: jest.fn().mockResolvedValue(undefined),
  getSubscriptionByStripeId: jest.fn().mockResolvedValue(null),
  tryClaimStripeEvent: jest.fn(),
  setTrialEnd: jest.fn().mockResolvedValue(undefined),
  releaseStripeEvent: jest.fn().mockResolvedValue(undefined),
  createReferralRevenue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../lib/telegram', () => ({
  sendInvite: jest.fn().mockResolvedValue('invite-link'),
  sendInviteWithRetry: jest
    .fn()
    .mockResolvedValue({ ok: true, attempts: 1, retryable: false }),
  revokeAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../lib/transactional-email', () => ({
  sendPaymentFailedEmail: jest.fn().mockResolvedValue({ ok: true, providerId: 'email_test' }),
}));

import { getStripe, resolveTierFromPriceId } from '../../../../../lib/stripe';
import {
  upsertSubscription,
  updateUserTier,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  getUserById,
  getUserByStripeCustomerId,
  tryClaimStripeEvent,
  cancelSubscription,
  createReferralRevenue,
} from '../../../../../lib/db';
import {
  sendInvite,
  sendInviteWithRetry,
  revokeAccess,
} from '../../../../../lib/telegram';
import { sendPaymentFailedEmail } from '../../../../../lib/transactional-email';
import { POST } from '../route';

const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockedResolveTier = resolveTierFromPriceId as jest.MockedFunction<typeof resolveTierFromPriceId>;
const mockedTryClaim = tryClaimStripeEvent as jest.MockedFunction<typeof tryClaimStripeEvent>;
const mockedUpsertSub = upsertSubscription as jest.MockedFunction<typeof upsertSubscription>;
const mockedUpdateTier = updateUserTier as jest.MockedFunction<typeof updateUserTier>;
const mockedUpdateSubStatus = updateSubscriptionStatus as jest.MockedFunction<typeof updateSubscriptionStatus>;
const mockedGetSubByStripeId = getSubscriptionByStripeId as jest.MockedFunction<typeof getSubscriptionByStripeId>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedSendInvite = sendInvite as jest.MockedFunction<typeof sendInvite>;
const mockedSendInviteRetry = sendInviteWithRetry as jest.MockedFunction<typeof sendInviteWithRetry>;
const mockedRevokeAccess = revokeAccess as jest.MockedFunction<typeof revokeAccess>;
const mockedGetUserByCustomerId = getUserByStripeCustomerId as jest.MockedFunction<typeof getUserByStripeCustomerId>;
const mockedSendDunning = sendPaymentFailedEmail as jest.MockedFunction<typeof sendPaymentFailedEmail>;
const mockedCancelSub = cancelSubscription as jest.MockedFunction<typeof cancelSubscription>;
const mockedCreateReferralRevenue = createReferralRevenue as jest.MockedFunction<typeof createReferralRevenue>;

function makeRequest(): NextRequest {
  const body = JSON.stringify({});
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=123,v1=fake' },
    body,
  });
}

describe('POST /api/stripe/webhook — idempotency', () => {
  const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const fakeEvent = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-1',
          customer: 'cus_1',
          subscription: 'sub_1',
        },
      },
    };

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(fakeEvent),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          status: 'trialing',
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: { id: 'price_pro_monthly' },
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
              },
            ],
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('first delivery processes the event and writes the subscription', async () => {
    mockedTryClaim.mockResolvedValueOnce(true);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(body.duplicate).toBeUndefined();
    expect(mockedTryClaim).toHaveBeenCalledWith('evt_test_1', 'checkout.session.completed');
    expect(mockedUpsertSub).toHaveBeenCalledTimes(1);
    expect(mockedUpdateTier).toHaveBeenCalledTimes(1);
  });

  it('redelivery (same event_id) short-circuits — no side effects', async () => {
    mockedTryClaim.mockResolvedValueOnce(false);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(mockedUpsertSub).not.toHaveBeenCalled();
    expect(mockedUpdateTier).not.toHaveBeenCalled();
    expect(mockedSendInvite).not.toHaveBeenCalled();
  });

  it('subscription.updated with an unknown priceId throws — never silently downgrades', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedTryClaim.mockResolvedValueOnce(true);
    mockedResolveTier.mockReturnValueOnce(null);

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_test_2',
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_x',
              status: 'active',
              cancel_at_period_end: false,
              metadata: { userId: 'user-1', tier: 'pro' },
              items: {
                data: [
                  {
                    price: { id: 'price_archived' },
                    current_period_end: Math.floor(Date.now() / 1000) + 86400,
                  },
                ],
              },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(mockedUpdateTier).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('POST /api/stripe/webhook — invoice.payment_failed dunning', () => {
  const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  // Period end the failed invoice describes. Used to assert handlePaymentFailed
  // refreshes current_period_end so the past_due grace window stays anchored to
  // the live cycle, not whatever value happened to be in the DB at trial start.
  const FAILED_PERIOD_END_SEC = Math.floor(Date.now() / 1000) + 30 * 86400;

  function setupPaymentFailedEvent(): void {
    const failedEvent = {
      id: 'evt_failed_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_failed' } },
          hosted_invoice_url: 'https://invoice.stripe.com/test',
          amount_due: 2900,
          currency: 'usd',
          next_payment_attempt: Math.floor(Date.now() / 1000) + 3 * 86400,
          lines: {
            data: [{ period: { end: FAILED_PERIOD_END_SEC } }],
          },
        },
      },
    };
    mockedGetStripe.mockReturnValue({
      webhooks: { constructEvent: jest.fn().mockReturnValue(failedEvent) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mockedTryClaim.mockResolvedValue(true);
    setupPaymentFailedEvent();
  });

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('first failure: marks past_due, looks up user, sends dunning email', async () => {
    mockedGetSubByStripeId.mockResolvedValueOnce({
      id: 'sub-row-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_failed',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateSubStatus).toHaveBeenCalledWith(
      'sub_failed',
      'past_due',
      new Date(FAILED_PERIOD_END_SEC * 1000),
    );
    expect(mockedSendDunning).toHaveBeenCalledTimes(1);
    const [to, opts] = mockedSendDunning.mock.calls[0];
    expect(to).toBe('user@example.com');
    expect(opts.hostedInvoiceUrl).toBe('https://invoice.stripe.com/test');
    expect(opts.amountDueCents).toBe(2900);
    expect(opts.currency).toBe('usd');
    expect(opts.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('retry attempt (already past_due): updates status but does NOT re-send email', async () => {
    mockedGetSubByStripeId.mockResolvedValueOnce({
      id: 'sub-row-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_failed',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      status: 'past_due',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateSubStatus).toHaveBeenCalledWith(
      'sub_failed',
      'past_due',
      new Date(FAILED_PERIOD_END_SEC * 1000),
    );
    expect(mockedSendDunning).not.toHaveBeenCalled();
    expect(mockedGetUserById).not.toHaveBeenCalled();
  });

  it('email failure does not 500 the webhook (Stripe must not retry)', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedGetSubByStripeId.mockResolvedValueOnce({
      id: 'sub-row-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_failed',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedGetUserById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });
    mockedSendDunning.mockResolvedValueOnce({ ok: false, reason: 'provider_error' });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockedUpdateSubStatus).toHaveBeenCalledWith(
      'sub_failed',
      'past_due',
      new Date(FAILED_PERIOD_END_SEC * 1000),
    );
    errSpy.mockRestore();
  });
});

describe('POST /api/stripe/webhook — invoice.payment_succeeded period refresh', () => {
  const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mockedTryClaim.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('trial→paid conversion refreshes current_period_end so the past_due grace window is correct on the next cycle', async () => {
    // The bug: handlePaymentSucceeded used to call updateSubscriptionStatus
    // with only (id, 'active'), which left current_period_end frozen at the
    // trial-end value (day 7). When the next renewal failed weeks later, the
    // grace window in tier.ts (period_end + 21d) was already in the past and
    // the user lost access with no grace. Persist the live period_end here.
    const periodEndSec = Math.floor(Date.now() / 1000) + 30 * 86400;

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_pay_ok',
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              parent: { subscription_details: { subscription: 'sub_renewed' } },
              lines: { data: [{ period: { end: periodEndSec } }] },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateSubStatus).toHaveBeenCalledTimes(1);
    expect(mockedUpdateSubStatus).toHaveBeenCalledWith(
      'sub_renewed',
      'active',
      new Date(periodEndSec * 1000),
    );
  });

  it('records 20% referral revenue when a referred user pays', async () => {
    const periodEndSec = Math.floor(Date.now() / 1000) + 30 * 86400;

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_pay_ref',
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'inv_123',
              customer: 'cus_referred',
              amount_paid: 2900,
              parent: { subscription_details: { subscription: 'sub_ref' } },
              lines: { data: [{ period: { end: periodEndSec } }] },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockedGetUserByCustomerId.mockResolvedValue({
      id: 'user-referred',
      email: 'referred@example.com',
      stripeCustomerId: 'cus_referred',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: 'user-referrer',
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedCreateReferralRevenue).toHaveBeenCalledTimes(1);
    expect(mockedCreateReferralRevenue).toHaveBeenCalledWith({
      referrerId: 'user-referrer',
      referredId: 'user-referred',
      stripeInvoiceId: 'inv_123',
      amountCents: 2900,
      shareCents: 580,
    });
  });

  it('skips referral revenue when the user was not referred', async () => {
    const periodEndSec = Math.floor(Date.now() / 1000) + 30 * 86400;

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_pay_noref',
          type: 'invoice.payment_succeeded',
          data: {
            object: {
              id: 'inv_456',
              customer: 'cus_notreferred',
              amount_paid: 2900,
              parent: { subscription_details: { subscription: 'sub_noref' } },
              lines: { data: [{ period: { end: periodEndSec } }] },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockedGetUserByCustomerId.mockResolvedValue({
      id: 'user-notreferred',
      email: 'notreferred@example.com',
      stripeCustomerId: 'cus_notreferred',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedCreateReferralRevenue).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/webhook — tier transitions', () => {
  const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mockedTryClaim.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('checkout.session.completed upgrades user to pro with the correct period_end', async () => {
    const periodStart = Math.floor(Date.now() / 1000);
    const periodEnd = periodStart + 30 * 86400;

    mockedResolveTier.mockReturnValue('pro');
    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_upgrade',
          type: 'checkout.session.completed',
          data: {
            object: {
              client_reference_id: 'user-1',
              customer: 'cus_1',
              subscription: 'sub_1',
            },
          },
        }),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          status: 'active',
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: { id: 'price_pro_monthly' },
                current_period_start: periodStart,
                current_period_end: periodEnd,
              },
            ],
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateTier).toHaveBeenCalledTimes(1);
    const [userId, tier, expiresAt] = mockedUpdateTier.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(tier).toBe('pro');
    expect(expiresAt).toBeInstanceOf(Date);
    expect((expiresAt as Date).getTime()).toBe(periodEnd * 1000);

    expect(mockedUpsertSub).toHaveBeenCalledTimes(1);
    const upsertArgs = mockedUpsertSub.mock.calls[0][0];
    expect(upsertArgs.tier).toBe('pro');
    expect(upsertArgs.userId).toBe('user-1');
    expect(upsertArgs.stripeSubscriptionId).toBe('sub_1');
  });

  it('customer.subscription.deleted downgrades user to free', async () => {
    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_cancel',
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_1',
              status: 'canceled',
              customer: 'cus_1',
              metadata: { userId: 'user-1', tier: 'pro' },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateTier).toHaveBeenCalledTimes(1);
    const [userId, tier, expiresAt] = mockedUpdateTier.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(tier).toBe('free');
    expect(expiresAt).toBeNull();
    expect(mockedCancelSub).toHaveBeenCalledWith('sub_1');
  });

  it('customer.subscription.deleted prefers persisted userId over missing metadata', async () => {
    // Stripe stripped metadata (rare, but possible on archived subs / API drift)
    // — we still need to downgrade the right user. Persisted row is the source
    // of truth; metadata is just a fallback hint.
    mockedGetSubByStripeId.mockResolvedValueOnce({
      id: 'sub-row-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
      tier: 'elite',
      status: 'canceled',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_cancel_no_meta',
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_1',
              status: 'canceled',
              customer: 'cus_1',
              metadata: {}, // no userId / no tier
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateTier).toHaveBeenCalledTimes(1);
    const [userId, tier] = mockedUpdateTier.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(tier).toBe('free');
    expect(mockedCancelSub).toHaveBeenCalledWith('sub_1');
  });

  it('customer.subscription.updated (monthly→annual) keeps pro tier and refreshes period_end', async () => {
    const annualEnd = Math.floor(Date.now() / 1000) + 365 * 86400;
    mockedResolveTier.mockReturnValue('pro');

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_switch',
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_1',
              status: 'active',
              cancel_at_period_end: false,
              metadata: { userId: 'user-1', tier: 'pro' },
              items: {
                data: [
                  {
                    price: { id: 'price_pro_annual' },
                    current_period_end: annualEnd,
                  },
                ],
              },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const [, tier, expiresAt] = mockedUpdateTier.mock.calls[0];
    expect(tier).toBe('pro');
    expect((expiresAt as Date).getTime()).toBe(annualEnd * 1000);
    expect(mockedUpdateSubStatus).toHaveBeenCalledWith('sub_1', 'active', expect.any(Date));
    // Same-tier interval switch — no Telegram group swap.
    expect(mockedRevokeAccess).not.toHaveBeenCalled();
    expect(mockedSendInviteRetry).not.toHaveBeenCalled();
  });

  it('customer.subscription.updated (pro→elite) revokes Pro group and invites to Elite group', async () => {
    // Without the tier swap, a Pro user who upgrades to Elite via the Stripe
    // portal would keep their Pro group invite and have NO Elite group invite
    // — paying more for the tier with worse access. Mirror image of the
    // Elite→Pro downgrade case which previously left users in the Elite group
    // permanently after they stopped paying for it.
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    mockedResolveTier.mockReturnValue('elite');
    mockedGetSubByStripeId.mockResolvedValueOnce({
      id: 'sub-row-1',
      userId: 'user-1',
      stripeSubscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      trialEnd: null,
      trialReminderSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedGetUserByCustomerId.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      stripeCustomerId: 'cus_1',
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: BigInt(987654321),
      displayName: null,
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    });

    mockedGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_pro_to_elite',
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_1',
              status: 'active',
              cancel_at_period_end: false,
              customer: 'cus_1',
              metadata: { userId: 'user-1', tier: 'pro' },
              items: {
                data: [
                  { price: { id: 'price_elite_monthly' }, current_period_end: periodEnd },
                ],
              },
            },
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedRevokeAccess).toHaveBeenCalledTimes(1);
    expect(mockedRevokeAccess).toHaveBeenCalledWith('987654321', 'pro');
    expect(mockedSendInviteRetry).toHaveBeenCalledTimes(1);
    expect(mockedSendInviteRetry).toHaveBeenCalledWith('user-1', '987654321', 'elite');
  });
});

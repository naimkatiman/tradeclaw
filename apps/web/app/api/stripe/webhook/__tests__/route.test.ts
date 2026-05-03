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
}));

jest.mock('../../../../../lib/telegram', () => ({
  sendInvite: jest.fn().mockResolvedValue('invite-link'),
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
  tryClaimStripeEvent,
} from '../../../../../lib/db';
import { sendInvite } from '../../../../../lib/telegram';
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
const mockedSendDunning = sendPaymentFailedEmail as jest.MockedFunction<typeof sendPaymentFailedEmail>;

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
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockedUpdateSubStatus).toHaveBeenCalledWith('sub_failed', 'past_due');
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

    expect(mockedUpdateSubStatus).toHaveBeenCalledWith('sub_failed', 'past_due');
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
    });
    mockedSendDunning.mockResolvedValueOnce({ ok: false, reason: 'provider_error' });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockedUpdateSubStatus).toHaveBeenCalledWith('sub_failed', 'past_due');
    errSpy.mockRestore();
  });
});

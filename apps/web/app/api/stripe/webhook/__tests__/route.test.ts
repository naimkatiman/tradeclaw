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
  updateUserTier: jest.fn().mockResolvedValue(undefined),
  upsertSubscription: jest.fn().mockResolvedValue(undefined),
  cancelSubscription: jest.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: jest.fn().mockResolvedValue(undefined),
  tryClaimStripeEvent: jest.fn(),
}));

jest.mock('../../../../../lib/telegram', () => ({
  sendInvite: jest.fn().mockResolvedValue('invite-link'),
  revokeAccess: jest.fn().mockResolvedValue(undefined),
}));

import { getStripe, resolveTierFromPriceId } from '../../../../../lib/stripe';
import {
  upsertSubscription,
  updateUserTier,
  tryClaimStripeEvent,
} from '../../../../../lib/db';
import { sendInvite } from '../../../../../lib/telegram';
import { POST } from '../route';

const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockedResolveTier = resolveTierFromPriceId as jest.MockedFunction<typeof resolveTierFromPriceId>;
const mockedTryClaim = tryClaimStripeEvent as jest.MockedFunction<typeof tryClaimStripeEvent>;
const mockedUpsertSub = upsertSubscription as jest.MockedFunction<typeof upsertSubscription>;
const mockedUpdateTier = updateUserTier as jest.MockedFunction<typeof updateUserTier>;
const mockedSendInvite = sendInvite as jest.MockedFunction<typeof sendInvite>;

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

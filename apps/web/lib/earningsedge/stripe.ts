import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getEEStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.EARNINGSEDGE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Stripe secret key not configured');
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}

export const EE_PRICES = {
  basic_monthly: process.env.EE_STRIPE_BASIC_MONTHLY_PRICE_ID || '',
  pro_monthly: process.env.EE_STRIPE_PRO_MONTHLY_PRICE_ID || '',
};

export const EE_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    priceId: EE_PRICES.basic_monthly,
    features: [
      'Unlimited earnings analyses',
      'Bull/Bear case breakdown',
      'Key metrics vs. estimates',
      'Management tone analysis',
      'One-line trade thesis',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    priceId: EE_PRICES.pro_monthly,
    features: [
      'Everything in Basic',
      'Analysis history (unlimited)',
      'Export to PDF/CSV',
      'Batch transcript processing',
      'Priority support',
    ],
  },
];

export async function createCheckoutSession(
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const stripe = getEEStripe();
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { product: 'earningsedge' },
  });
  return session.url!;
}

/**
 * Verify a Stripe webhook signature against the EE-specific secret.
 *
 * Previous behavior fell back to STRIPE_WEBHOOK_SECRET when
 * EE_STRIPE_WEBHOOK_SECRET was unset. That let a TradeClaw-main event
 * delivered to the EE endpoint pass signature verification, with all the
 * cross-product replay risk that implies. Fail closed: if EE-specific
 * secret is unset, the EE webhook returns 503.
 */
export function verifyEEWebhookSignature(payload: string, signature: string): Stripe.Event {
  const stripe = getEEStripe();
  const webhookSecret = process.env.EE_STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('EE_STRIPE_WEBHOOK_SECRET not configured');
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Strict price-id → EE tier map. Throws on an unknown price rather than
 * silently defaulting to 'basic' — the main TradeClaw webhook throws on
 * unknown price IDs and EE should match. A misconfigured env var must not
 * silently downgrade a paying user.
 */
function resolveEETierFromPriceId(priceId: string | undefined): 'basic' | 'pro' {
  if (priceId && priceId === EE_PRICES.pro_monthly) return 'pro';
  if (priceId && priceId === EE_PRICES.basic_monthly) return 'basic';
  throw new Error(`unknown_or_unconfigured_ee_price_id:${priceId ?? 'null'}`);
}

export interface ParsedEEEvent {
  id: string;
  type: string;
  customerId?: string;
  subscriptionId?: string;
  tier?: string;
  email?: string;
}

export async function parseEEEvent(event: Stripe.Event): Promise<ParsedEEEvent> {
  const stripe = getEEStripe();
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.product !== 'earningsedge') {
      return { id: event.id, type: event.type };
    }
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0]?.price.id;
    const tier = resolveEETierFromPriceId(priceId);
    return {
      id: event.id,
      type: event.type,
      customerId: session.customer as string,
      subscriptionId: session.subscription as string,
      tier,
      email: session.customer_email || undefined,
    };
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    return {
      id: event.id,
      type: event.type,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
    };
  }

  return { id: event.id, type: event.type };
}

/** @deprecated retained for backwards compatibility — prefer the split helpers. */
export async function handleWebhookEvent(
  payload: string,
  signature: string,
): Promise<ParsedEEEvent> {
  const event = verifyEEWebhookSignature(payload, signature);
  return parseEEEvent(event);
}

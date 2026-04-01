import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, EE_PRICES } from '@/lib/earningsedge/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, plan } = body as { email: string; plan: 'basic' | 'pro' };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const priceId = plan === 'pro' ? EE_PRICES.pro_monthly : EE_PRICES.basic_monthly;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured — contact support.' },
        { status: 503 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/earningsedge/analyze?subscribed=1`;
    const cancelUrl = `${baseUrl}/earningsedge/pricing?cancelled=1`;

    const checkoutUrl = await createCheckoutSession(email, priceId, successUrl, cancelUrl);

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { getUserById } from '../../../../lib/db';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: unknown };
    const { userId } = body;

    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 404 }
      );
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${BASE_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

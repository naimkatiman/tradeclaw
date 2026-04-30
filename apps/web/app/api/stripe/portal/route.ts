import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { getUserById } from '../../../../lib/db';
import { readSessionFromRequest } from '../../../../lib/user-session';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';

export async function POST(request: NextRequest) {
  try {
    const session = readSessionFromRequest(request);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not signed in — sign in with Google at /signin first' },
        { status: 401 },
      );
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

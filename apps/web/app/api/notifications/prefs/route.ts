import { NextRequest, NextResponse } from 'next/server';
import { getPushSubscription, updateSubscriptionPrefs } from '../../../../lib/push-subscriptions';

const DEFAULT_PREFS = {
  pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
  thresholds: {} as Record<string, number>,
  directions: {} as Record<string, 'BUY' | 'SELL' | 'both'>,
  masterEnabled: true,
};

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint');

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint query parameter' },
      { status: 400 },
    );
  }

  const sub = await getPushSubscription(endpoint);

  if (!sub) {
    return NextResponse.json({ prefs: DEFAULT_PREFS });
  }

  return NextResponse.json({ prefs: sub.prefs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, prefs } = body as {
      endpoint?: string;
      prefs?: { pairs?: string[]; thresholds?: Record<string, number>; directions?: Record<string, 'BUY' | 'SELL' | 'both'>; masterEnabled?: boolean };
    };

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 },
      );
    }

    if (!prefs) {
      return NextResponse.json(
        { error: 'Missing prefs' },
        { status: 400 },
      );
    }

    const updated = await updateSubscriptionPrefs(endpoint, prefs);

    if (!updated) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

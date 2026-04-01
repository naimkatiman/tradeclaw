import { NextRequest, NextResponse } from 'next/server';
import { getPushSubscription } from '../../../../lib/push-subscriptions';

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
    return NextResponse.json({ subscribed: false });
  }

  return NextResponse.json({
    subscribed: true,
    id: sub.id,
    prefs: sub.prefs,
    createdAt: sub.createdAt,
  });
}

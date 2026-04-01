import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, deletePushSubscription } from '../../../../lib/push-subscriptions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, prefs } = body as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      prefs?: { pairs?: string[]; thresholds?: Record<string, number>; directions?: Record<string, 'BUY' | 'SELL' | 'both'>; masterEnabled?: boolean };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Missing subscription endpoint or keys' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const record = await savePushSubscription(
      subscription.endpoint,
      { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      prefs,
    );

    return NextResponse.json(
      { success: true, id: record.id },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await deletePushSubscription(endpoint);

    return NextResponse.json(
      { success: true },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

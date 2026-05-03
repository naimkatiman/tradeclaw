import { NextRequest, NextResponse } from 'next/server';

import { getPushSubscription } from '../../../../lib/push-subscriptions';
import { isWebPushConfigured, sendPush } from '../../../../lib/web-push-server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

interface TestRequestBody {
  endpoint?: string;
  title?: string;
  body?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  let body: TestRequestBody;
  try {
    body = (await req.json()) as TestRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'missing_endpoint' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: 'vapid_not_configured' },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  const sub = await getPushSubscription(body.endpoint);
  if (!sub) {
    return NextResponse.json(
      { error: 'subscription_not_found' },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const result = await sendPush(sub, {
    title: body.title ?? 'TradeClaw notifications enabled',
    body: body.body ?? "You're set. Live signal alerts will land here.",
    url: body.url ?? '/dashboard',
    tag: 'tradeclaw-test',
  });

  return NextResponse.json({ success: result.sent === 1, ...result }, { headers: CORS_HEADERS });
}

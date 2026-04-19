import { NextRequest, NextResponse } from 'next/server';
import { getWebhookForUser, deliverWebhook, TEST_PAYLOAD } from '../../../../lib/webhooks';
import { readSessionFromRequest } from '../../../../lib/user-session';

// POST /api/webhooks/test — send test payload to a specific webhook owned by the caller
export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const wh = await getWebhookForUser({ userId: session.userId, id: body.id });
    if (!wh) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const payload = {
      ...TEST_PAYLOAD,
      timestamp: new Date().toISOString(),
    };

    const result = await deliverWebhook(wh, payload);

    return NextResponse.json({
      ok: result.success,
      statusCode: result.statusCode,
      error: result.error,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

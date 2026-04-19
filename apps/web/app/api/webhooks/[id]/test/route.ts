import { NextRequest, NextResponse } from 'next/server';
import { getWebhookForUser, deliverWebhook, TEST_PAYLOAD } from '../../../../../lib/webhooks';
import { readSessionFromRequest } from '../../../../../lib/user-session';

// POST /api/webhooks/[id]/test — send test payload to a webhook owned by the caller
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { id } = await params;

    const wh = await getWebhookForUser({ userId: session.userId, id });
    if (!wh) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const payload = { ...TEST_PAYLOAD, timestamp: new Date().toISOString() };
    const result = await deliverWebhook(wh, payload, false);

    return NextResponse.json({
      ok: result.success,
      statusCode: result.statusCode,
      error: result.error,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

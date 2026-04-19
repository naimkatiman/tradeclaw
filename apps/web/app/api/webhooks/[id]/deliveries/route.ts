import { NextRequest, NextResponse } from 'next/server';
import { getWebhookDeliveries } from '../../../../../lib/webhooks';
import { readSessionFromRequest } from '../../../../../lib/user-session';

// GET /api/webhooks/[id]/deliveries — delivery log for a webhook owned by the caller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { id } = await params;

    const deliveries = await getWebhookDeliveries({ userId: session.userId, id });
    if (deliveries === null) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ deliveries });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

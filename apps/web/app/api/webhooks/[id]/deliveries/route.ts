import { NextRequest, NextResponse } from 'next/server';
import { getWebhookDeliveries } from '../../../../../lib/webhooks';

// GET /api/webhooks/[id]/deliveries — get delivery log for a webhook
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deliveries = getWebhookDeliveries(id);
    if (deliveries === null) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ deliveries });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

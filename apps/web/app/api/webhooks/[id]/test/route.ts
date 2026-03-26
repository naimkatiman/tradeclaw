import { NextRequest, NextResponse } from 'next/server';
import { readWebhooks, deliverWebhook, TEST_PAYLOAD } from '../../../../../lib/webhooks';

// POST /api/webhooks/[id]/test — send test payload to a specific webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const wh = readWebhooks().find((w) => w.id === id);
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

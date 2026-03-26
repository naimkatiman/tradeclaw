import { NextRequest, NextResponse } from 'next/server';
import { dispatchToAll } from '../../../../lib/webhooks';
import type { WebhookPayload } from '../../../../lib/webhooks';

// POST /api/webhooks/deliver — internal endpoint called by signal engine to fan-out
// to all active webhooks matching pair + confidence filters.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WebhookPayload>;

    if (!body.signal || !body.event) {
      return NextResponse.json({ error: 'event and signal are required' }, { status: 400 });
    }

    const payload: WebhookPayload = {
      event: body.event,
      timestamp: body.timestamp ?? new Date().toISOString(),
      signal: body.signal,
    };

    // Fire and forget — don't block the signal engine response
    dispatchToAll(payload).catch(() => {
      // Delivery failures are logged per-webhook in the delivery log
    });

    return NextResponse.json({ ok: true, dispatched: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

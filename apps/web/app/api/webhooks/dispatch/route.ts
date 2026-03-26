import { NextRequest, NextResponse } from 'next/server';
import { dispatchToAll } from '../../../../lib/webhooks';
import type { WebhookPayload } from '../../../../lib/webhooks';

// POST /api/webhooks/dispatch — dispatch a signal to all active webhooks
// This is an internal endpoint called when a new signal fires.
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

    // Fire and forget — don't block the response
    dispatchToAll(payload).catch((err) => {
      console.error('[webhooks/dispatch] Error:', err);
    });

    return NextResponse.json({ ok: true, dispatched: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

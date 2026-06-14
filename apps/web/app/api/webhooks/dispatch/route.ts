import { NextRequest, NextResponse } from 'next/server';
import { dispatchToAll } from '../../../../lib/webhooks';
import type { WebhookPayload } from '../../../../lib/webhooks';
import { requireCronAuth } from '../../../../lib/cron-auth';

// POST /api/webhooks/dispatch — dispatch a signal to ALL users' active webhooks.
// Internal engine endpoint: gated by CRON_SECRET so an anonymous caller cannot
// fan a spoofed signal out to every subscriber.
export async function POST(request: NextRequest) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

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

import { NextRequest, NextResponse } from 'next/server';
import { dispatchToAll } from '../../../../lib/webhooks';
import type { WebhookPayload } from '../../../../lib/webhooks';
import { evaluateEntryFanoutGate } from '../../../../lib/entry-fanout-gate';
import { requireCronAuth } from '../../../../lib/cron-auth';

// POST /api/webhooks/deliver — internal endpoint called by signal engine to fan-out
// to all active webhooks matching pair + confidence filters.
export async function POST(request: NextRequest) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as Partial<WebhookPayload>;

    if (!body.signal || !body.event) {
      return NextResponse.json({ error: 'event and signal are required' }, { status: 400 });
    }

    if (body.event !== 'signal.new' && body.event !== 'signal.test') {
      return NextResponse.json({ error: 'event must be signal.new or signal.test' }, { status: 400 });
    }

    if (body.event === 'signal.new') {
      if (typeof body.signal.id !== 'string' || typeof body.signal.symbol !== 'string') {
        return NextResponse.json({ error: 'signal.id and signal.symbol are required' }, { status: 400 });
      }

      const gate = await evaluateEntryFanoutGate({
        symbol: body.signal.symbol,
        signalId: body.signal.id,
      });
      if (!gate.allowed) {
        return NextResponse.json(
          { ok: false, dispatched: false, halted: gate.reason, evidence: gate.evidence },
          { status: 503 },
        );
      }
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

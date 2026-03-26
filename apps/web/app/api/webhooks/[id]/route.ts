import { NextRequest, NextResponse } from 'next/server';
import { updateWebhook, removeWebhook } from '../../../../lib/webhooks';

// PATCH /api/webhooks/[id] — update a webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      url?: string;
      secret?: string;
      enabled?: boolean;
      pairs?: string[] | 'all';
      minConfidence?: number;
    };

    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
    }

    const patch: Parameters<typeof updateWebhook>[1] = {};
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.url === 'string') patch.url = body.url;
    if (typeof body.secret === 'string') patch.secret = body.secret || undefined;
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (body.pairs !== undefined) patch.pairs = body.pairs;
    if (typeof body.minConfidence === 'number') {
      patch.minConfidence = Math.max(0, Math.min(100, body.minConfidence));
    }

    const updated = updateWebhook(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const { secret: _secret, ...safe } = updated;
    return NextResponse.json({ webhook: { ...safe, hasSecret: Boolean(_secret) } });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/webhooks/[id] — delete a webhook
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const removed = removeWebhook(id);
    if (!removed) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

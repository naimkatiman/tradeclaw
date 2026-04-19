import { NextRequest, NextResponse } from 'next/server';
import { updateWebhook, removeWebhook } from '../../../../lib/webhooks';
import { readSessionFromRequest } from '../../../../lib/user-session';

function requireSession(request: NextRequest): { userId: string } | NextResponse {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  return { userId: session.userId };
}

// PATCH /api/webhooks/[id] — update a webhook owned by the caller
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
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

    const updated = await updateWebhook({ userId: auth.userId, id }, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const { secret: _secret, ...safe } = updated;
    return NextResponse.json({ webhook: { ...safe, hasSecret: Boolean(_secret) } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/webhooks/[id] — delete a webhook owned by the caller
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const removed = await removeWebhook({ userId: auth.userId, id });
    if (!removed) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

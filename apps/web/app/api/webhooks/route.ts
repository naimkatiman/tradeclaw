import { NextRequest, NextResponse } from 'next/server';
import {
  readWebhooks,
  addWebhook,
  removeWebhook,
  updateWebhook,
} from '../../../lib/webhooks';
import { readSessionFromRequest } from '../../../lib/user-session';

function requireSession(request: NextRequest): { userId: string } | NextResponse {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  return { userId: session.userId };
}

// GET /api/webhooks — list the caller's webhooks
export async function GET(request: NextRequest) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const webhooks = await readWebhooks(auth.userId);
    const safe = webhooks.map(({ secret: _secret, ...rest }) => ({
      ...rest,
      hasSecret: Boolean(_secret),
    }));
    return NextResponse.json({ webhooks: safe });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/webhooks — create a webhook owned by the caller
export async function POST(request: NextRequest) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as {
      url?: string;
      name?: string;
      secret?: string;
    };

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const wh = await addWebhook({
      userId: auth.userId,
      url: body.url,
      name: typeof body.name === 'string' ? body.name : undefined,
      secret: typeof body.secret === 'string' && body.secret ? body.secret : undefined,
    });

    const { secret: _secret, ...safe } = wh;
    return NextResponse.json({ webhook: { ...safe, hasSecret: Boolean(_secret) } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PATCH /api/webhooks — update a webhook owned by the caller
export async function PATCH(request: NextRequest) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      url?: string;
      secret?: string;
      enabled?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

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

    const updated = await updateWebhook({ userId: auth.userId, id: body.id }, patch);
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

// DELETE /api/webhooks — remove a webhook owned by the caller
export async function DELETE(request: NextRequest) {
  const auth = requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const removed = await removeWebhook({ userId: auth.userId, id: body.id });
    if (!removed) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

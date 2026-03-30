import { NextRequest, NextResponse } from 'next/server';
import {
  readWebhooks,
  addWebhook,
  removeWebhook,
  updateWebhook,
} from '../../../lib/webhooks';

// GET /api/webhooks — list all
export async function GET() {
  try {
    const webhooks = readWebhooks();
    // Strip secrets from the response
    const safe = webhooks.map(({ secret: _secret, ...rest }) => ({
      ...rest,
      hasSecret: Boolean(_secret),
    }));
    return NextResponse.json({ webhooks: safe });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/webhooks — create
export async function POST(request: NextRequest) {
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

    const wh = addWebhook({
      url: body.url,
      name: typeof body.name === 'string' ? body.name : undefined,
      secret: typeof body.secret === 'string' && body.secret ? body.secret : undefined,
    });

    const { secret: _secret, ...safe } = wh;
    return NextResponse.json({ webhook: { ...safe, hasSecret: Boolean(_secret) } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// PATCH /api/webhooks — update
export async function PATCH(request: NextRequest) {
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

    const updated = updateWebhook(body.id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const { secret: _secret, ...safe } = updated;
    return NextResponse.json({ webhook: { ...safe, hasSecret: Boolean(_secret) } });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/webhooks — remove by id in body
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const removed = removeWebhook(body.id);
    if (!removed) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

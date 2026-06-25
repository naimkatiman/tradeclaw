import { NextRequest, NextResponse } from 'next/server';

import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import { isAdminEmail } from '../../../../lib/admin-emails';
import {
  listOperatorMemory,
  getOperatorMemory,
  putOperatorMemory,
  deleteOperatorMemory,
} from '../../../../lib/operator-memory';

/**
 * TC-171 Phase B — Operator memory CRUD.
 *
 * Auth: requires a session-backed admin (HMAC user-session cookie whose
 * email is in ADMIN_EMAILS). The shared `tc_admin` secret cookie is NOT
 * accepted here because there's no userId to scope memory rows to.
 *
 * Routes:
 *   GET    /api/operator/memory           → list all entries for the user
 *   GET    /api/operator/memory?key=foo   → fetch a single entry
 *   PUT    /api/operator/memory           → upsert (body: { key, value })
 *   DELETE /api/operator/memory?key=foo   → delete a single entry
 */

const MAX_KEY_LENGTH = 128;

interface AuthorizedRequest {
  userId: string;
}

async function authorize(req: NextRequest): Promise<AuthorizedRequest | NextResponse> {
  const session = readSessionFromRequest(req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await getUserById(session.userId);
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId: session.userId };
}

function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LENGTH;
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof NextResponse) return auth;

  const key = req.nextUrl.searchParams.get('key');
  if (key !== null) {
    if (!isValidKey(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    const entry = await getOperatorMemory(auth.userId, key);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ entry });
  }

  const entries = await listOperatorMemory(auth.userId);
  return NextResponse.json({ entries });
}

export async function PUT(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { key, value } = body as { key?: unknown; value?: unknown };
  if (!isValidKey(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  if (value === undefined) {
    return NextResponse.json({ error: 'Missing value' }, { status: 400 });
  }

  const entry = await putOperatorMemory(auth.userId, key, value);
  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof NextResponse) return auth;

  const key = req.nextUrl.searchParams.get('key');
  if (!isValidKey(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  const deleted = await deleteOperatorMemory(auth.userId, key);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

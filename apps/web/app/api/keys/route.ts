import { NextRequest, NextResponse } from 'next/server';
import { createKey, listKeysByEmail } from '@/lib/api-keys';
import { getUserById } from '@/lib/db';
import { readSessionFromRequest } from '@/lib/user-session';

export const dynamic = 'force-dynamic';

function maskKey(key: ReturnType<typeof listKeysByEmail>[number]) {
  return {
    ...key,
    key: `${key.key.slice(0, 12)}********************************`,
  };
}

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email');
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email must match the signed-in account' },
        { status: 403 },
      );
    }
  }

  const keys = listKeysByEmail(user.email).map(maskKey);
  return NextResponse.json({ keys, count: keys.length });
}

export async function POST(req: NextRequest) {
  try {
    const session = readSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { name, email, description, scopes } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const user = await getUserById(session.userId);
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email must match the signed-in account' },
        { status: 403 },
      );
    }

    const validScopes = ['signals', 'leaderboard', 'screener'] as const;
    const resolvedScopes = Array.isArray(scopes)
      ? (scopes as string[]).filter((scope): scope is typeof validScopes[number] =>
          validScopes.includes(scope as typeof validScopes[number]))
      : [...validScopes];

    if (resolvedScopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope required' }, { status: 400 });
    }

    const key = createKey({
      name,
      email,
      description: typeof description === 'string' ? description : '',
      scopes: resolvedScopes,
    });
    return NextResponse.json(
      { key, message: 'Save this key - it will not be shown again' },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }
}

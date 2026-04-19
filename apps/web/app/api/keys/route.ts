import { NextRequest, NextResponse } from 'next/server';
import { readKeys, createKey, listKeysByEmail } from '@/lib/api-keys';
import { readSessionFromRequest } from '@/lib/user-session';
import { getTierFromRequest, upgradeRequiredBody, meetsMinimumTier } from '@/lib/tier';
import { getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

function maskKey(k: ReturnType<typeof readKeys>[0]) {
  return {
    ...k,
    key: k.key.slice(0, 12) + '••••••••••••••••••••••••••••••••',
  };
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const keys = listKeysByEmail(email).map(maskKey);
    return NextResponse.json({ keys, count: keys.length });
  }
  const keys = readKeys().map(maskKey);
  return NextResponse.json({ keys, count: keys.length });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Must be signed in. Previous implementation accepted any email in the
    //    body — a silent leak where anyone could mint keys for any email.
    const session = readSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Must be Pro+. API access is a Pro feature.
    const tier = await getTierFromRequest(req);
    if (!meetsMinimumTier(tier, 'pro')) {
      return NextResponse.json(
        upgradeRequiredBody({
          reason:
            'API access is a Pro feature. Free dashboards stay free — upgrade to mint API keys.',
          source: 'api-keys',
        }),
        { status: 402 },
      );
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

    // 3. Email in body must match session email — prevents authed users from
    //    minting keys pinned to a different email.
    const user = await getUserById(session.userId);
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email must match the signed-in account' },
        { status: 403 },
      );
    }

    const validScopes = ['signals', 'leaderboard', 'screener'] as const;
    const resolvedScopes = Array.isArray(scopes)
      ? (scopes as string[]).filter((s): s is typeof validScopes[number] => validScopes.includes(s as typeof validScopes[number]))
      : [...validScopes];

    if (resolvedScopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope required' }, { status: 400 });
    }

    const key = createKey({
      name: String(name),
      email: String(email),
      description: typeof description === 'string' ? description : '',
      scopes: resolvedScopes,
    });
    // Return the full key ONCE on creation
    return NextResponse.json(
      { key, message: 'Save this key — it will not be shown again' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }
}

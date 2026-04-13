import { NextRequest, NextResponse } from 'next/server';
import { resolveLicenseByKey, FREE_STRATEGY } from '@/lib/licenses';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { key?: unknown };
    const key = typeof body.key === 'string' ? body.key : null;
    if (!key || !key.startsWith('tck_live_')) {
      return NextResponse.json({ valid: false, reason: 'invalid_format' }, { status: 200 });
    }

    const ctx = await resolveLicenseByKey(key);
    if (ctx.licenseId === null) {
      return NextResponse.json({ valid: false, reason: 'unknown_or_revoked' }, { status: 200 });
    }

    const unlocked = [...ctx.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);

    return NextResponse.json({
      valid: true,
      unlockedStrategies: unlocked,
      expiresAt: ctx.expiresAt?.toISOString() ?? null,
      issuedTo: ctx.issuedTo,
    });
  } catch {
    return NextResponse.json({ valid: false, reason: 'bad_request' }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getKeyByString, validateKey, checkRateLimit } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: keyStr } = await params;

  // Look up the key first (without incrementing usage) to get metadata
  const keyMeta = getKeyByString(keyStr);
  if (!keyMeta) {
    return NextResponse.json({ valid: false, error: 'API key not found' }, { status: 401 });
  }
  if (keyMeta.status !== 'active') {
    return NextResponse.json({ valid: false, error: 'API key has been revoked' }, { status: 401 });
  }

  // Check rate limit before validating (incrementing usage)
  const rateResult = checkRateLimit(keyMeta.id, keyMeta.rateLimit);
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Rate limit exceeded',
        rateLimit: {
          limit: keyMeta.rateLimit,
          remaining: 0,
          resetAt: rateResult.resetAt,
        },
      },
      { status: 429 }
    );
  }

  // Increment usage count on the key itself
  validateKey(keyStr);

  return NextResponse.json({
    valid: true,
    keyId: keyMeta.id,
    name: keyMeta.name,
    scopes: keyMeta.scopes,
    rateLimit: {
      limit: keyMeta.rateLimit,
      remaining: rateResult.remaining,
      resetAt: rateResult.resetAt,
    },
  });
}

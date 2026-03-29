import { NextRequest, NextResponse } from 'next/server';
import { getKeyByString, getUsageStats } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
<<<<<<< HEAD
  const { key: keyStr } = await params;

  const keyMeta = getKeyByString(keyStr);
  if (!keyMeta) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  const stats = getUsageStats(keyMeta.id, keyMeta.rateLimit);

  return NextResponse.json({
    keyId: keyMeta.id,
    keyName: keyMeta.name,
    status: keyMeta.status,
    scopes: keyMeta.scopes,
    requestsThisHour: stats.requestsThisHour,
    requestsToday: stats.requestsToday,
    requestsTotal: keyMeta.requestCount,
    rateLimit: stats.rateLimit,
    resetAt: stats.resetAt,
  });
=======
  try {
    const { key: keyStr } = await params;

    const keyMeta = getKeyByString(keyStr);
    if (!keyMeta) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const stats = getUsageStats(keyMeta.id, keyMeta.rateLimit);

    return NextResponse.json({
      keyId: keyMeta.id,
      keyName: keyMeta.name,
      status: keyMeta.status,
      scopes: keyMeta.scopes,
      requestsThisHour: stats.requestsThisHour,
      requestsToday: stats.requestsToday,
      requestsTotal: keyMeta.requestCount,
      rateLimit: stats.rateLimit,
      resetAt: stats.resetAt,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}

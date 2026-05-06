import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const BEARER_PREFIX = 'Bearer ';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function requireCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith(BEARER_PREFIX)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supplied = header.slice(BEARER_PREFIX.length);
  if (!safeEqual(supplied, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

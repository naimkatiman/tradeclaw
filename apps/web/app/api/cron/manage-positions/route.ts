import { NextRequest, NextResponse } from 'next/server';
import { runPositionManagerTick } from '../../../../lib/execution/position-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 50;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const r = await runPositionManagerTick();
    return NextResponse.json({ ok: true, durationMs: Date.now() - t0, ...r });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/manage-positions] failed:', msg);
    return NextResponse.json({ ok: false, error: msg, durationMs: Date.now() - t0 }, { status: 500 });
  }
}

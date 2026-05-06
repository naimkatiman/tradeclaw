import { NextRequest, NextResponse } from 'next/server';
import { runPositionManagerTick } from '../../../../lib/execution/position-manager';
import { requireCronAuth } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 50;

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;
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

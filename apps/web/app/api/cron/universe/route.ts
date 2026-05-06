import { NextRequest, NextResponse } from 'next/server';
import { runUniverseScreen } from '../../../../lib/execution/universe-runner';
import { requireCronAuth } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const t0 = Date.now();
  try {
    const result = await runUniverseScreen();
    return NextResponse.json({
      ok: true,
      snapshotDate: result.snapshotDate,
      candidates: result.candidates,
      includedCount: result.included.length,
      excludedCount: result.excluded.length,
      fallbackApplied: result.fallbackApplied,
      persisted: result.persisted,
      included: result.included,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/universe] failed:', msg);
    return NextResponse.json({ ok: false, error: msg, durationMs: Date.now() - t0 }, { status: 500 });
  }
}

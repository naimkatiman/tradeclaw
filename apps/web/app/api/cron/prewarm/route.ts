// apps/web/app/api/cron/prewarm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedHistory, invalidateHistoryCache } from '@/lib/signal-history-cache';
import { refreshAtrCalibration } from '@/app/lib/atr-calibration-cache';
import { requireCronAuth } from '@/lib/cron-auth';

export async function POST(req: NextRequest) {
  // Fail-closed: 503 when CRON_SECRET unset, timing-safe bearer compare.
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const start = Date.now();

  // Force-refresh signal history cache
  await invalidateHistoryCache();
  const rows = await getCachedHistory();

  // Refresh ATR calibration cache using fresh history
  const calibrations = await refreshAtrCalibration();

  return NextResponse.json({
    ok: true,
    historyRows: rows.length,
    calibratedSymbols: calibrations.size,
    durationMs: Date.now() - start,
  });
}

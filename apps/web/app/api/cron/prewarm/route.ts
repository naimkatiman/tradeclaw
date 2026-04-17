// apps/web/app/api/cron/prewarm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedHistory, invalidateHistoryCache } from '@/lib/signal-history-cache';
import { refreshAtrCalibration } from '@/app/lib/atr-calibration-cache';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();

  // Force-refresh signal history cache
  invalidateHistoryCache();
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

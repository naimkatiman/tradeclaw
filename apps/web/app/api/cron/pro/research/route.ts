import { NextRequest, NextResponse } from 'next/server';
import { drainQueuedResearchJobs } from '../../../../../lib/trading-agents/research-jobs';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(10, Number(searchParams.get('limit') ?? '3') || 3));
  const result = await drainQueuedResearchJobs(limit);

  return NextResponse.json({
    ok: true,
    queued: result.skipped ? undefined : true,
    processed: result.processed.length,
    failed: result.failed.length,
    skipped: result.skipped,
    jobs: result.processed.map((job) => ({
      id: job.id,
      symbol: job.request.symbol,
      timeframe: job.request.timeframe,
      status: job.status,
      createdAt: job.createdAt,
    })),
    errors: result.failed,
  });
}

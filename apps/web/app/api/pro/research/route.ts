import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import { isAdminEmail } from '../../../../lib/admin-emails';
import {
  createResearchJob,
  getResearchJob,
  listResearchJobs,
} from '../../../../lib/trading-agents/research-jobs';

type ProAccess =
  | { error: NextResponse; session?: undefined }
  | { error?: undefined; session: { userId: string } };

// Sign-in is still required (jobs are per-user); the tier gate is gone.
async function assertProAccess(req: Request): Promise<ProAccess> {
  const session = readSessionFromRequest(req);
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { session };
}

/**
 * Job creation is admin-only: each job drains through a python3-spawning LLM
 * pipeline, and the removed Pro-payment barrier was its only abuse guard.
 * Reads stay signed-in; the drain cron stays CRON_SECRET-gated.
 */
async function assertAdminAccess(req: Request): Promise<ProAccess> {
  const access = await assertProAccess(req);
  if (access.error) return access;

  const user = await getUserById(access.session.userId);
  if (!isAdminEmail(user?.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return access;
}

export async function POST(req: Request): Promise<NextResponse> {
  const access = await assertAdminAccess(req);
  if (access.error) {
    return access.error;
  }
  const { session } = access;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.symbol !== 'string' || !body.symbol.trim()) {
    return NextResponse.json(
      { error: 'symbol is required' },
      { status: 400 },
    );
  }

  const symbol = body.symbol.trim().toUpperCase();
  const timeframe = typeof body.timeframe === 'string' ? body.timeframe : 'H1';

  const job = await createResearchJob({
    symbol,
    timeframe,
    requestedBy: session.userId,
  });

  return NextResponse.json(
    {
      ...job,
      queued: true,
      note: 'Queued for background processing',
    },
    { status: 201 },
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const access = await assertProAccess(req);
  if (access.error) {
    return access.error;
  }
  const { session } = access;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const job = await getResearchJob(id);
    if (!job || job.request.requestedBy !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  }

  const jobs = await listResearchJobs(session.userId, 20);
  return NextResponse.json(jobs);
}

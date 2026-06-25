import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserTier } from '../../../../lib/tier';
import {
  createResearchJob,
  getResearchJob,
  listResearchJobs,
} from '../../../../lib/trading-agents/research-jobs';

type ProAccess =
  | { error: NextResponse; session?: undefined }
  | { error?: undefined; session: { userId: string } };

async function assertProAccess(req: Request): Promise<ProAccess> {
  const session = readSessionFromRequest(req);
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const tier = await getUserTier(session.userId);
  if (tier !== 'pro' && tier !== 'elite' && tier !== 'custom') {
    return { error: NextResponse.json({ error: 'Pro access required' }, { status: 403 }) };
  }

  return { session };
}

export async function POST(req: Request): Promise<NextResponse> {
  const access = await assertProAccess(req);
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

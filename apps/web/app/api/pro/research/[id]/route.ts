import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../../lib/user-session';
import { getUserTier } from '../../../../../lib/tier';
import { getResearchJob } from '../../../../../lib/trading-agents/research-jobs';

type ProAccess =
  | { error: NextResponse; session?: undefined }
  | { error?: undefined; session: { userId: string } };

async function assertProAccess(req: NextRequest): Promise<ProAccess> {
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const access = await assertProAccess(req);
  if (access.error) {
    return access.error;
  }

  const { id } = await params;
  const job = await getResearchJob(id);
  if (!job || job.request.requestedBy !== access.session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}

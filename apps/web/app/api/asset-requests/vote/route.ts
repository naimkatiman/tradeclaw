import { NextRequest, NextResponse } from 'next/server';
import {
  voteForRequest,
  isVoteRateLimited,
} from '../../../../lib/asset-requests';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isVoteRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many votes. Please slow down.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const updated = voteForRequest(id);
  if (!updated) {
    return NextResponse.json({ error: 'Unknown request id' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    id: updated.id,
    votes: updated.votes,
  });
}

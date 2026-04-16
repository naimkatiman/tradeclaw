import { NextRequest, NextResponse } from 'next/server';
import { fetchNextApproved } from '../../../../lib/social-queue';

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.SOCIAL_AGENT_TOKEN;
  if (!token) return false;
  return req.headers.get('authorization') === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const post = await fetchNextApproved();
  return NextResponse.json({ post });
}

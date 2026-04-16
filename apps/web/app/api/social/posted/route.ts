import { NextRequest, NextResponse } from 'next/server';
import { markPosted } from '../../../../lib/social-queue';

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.SOCIAL_AGENT_TOKEN;
  if (!token) return false;
  return req.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json() as { id?: string; postUrl?: string };
  if (!body.id || !body.postUrl) {
    return NextResponse.json({ error: 'id and postUrl required' }, { status: 400 });
  }
  await markPosted(body.id, body.postUrl);
  return NextResponse.json({ ok: true });
}

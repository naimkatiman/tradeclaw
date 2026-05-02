import { NextRequest, NextResponse } from 'next/server';
import { deleteChannelConfig } from '@/lib/alert-rules-db';
import { readSessionFromRequest } from '@/lib/user-session';

const VALID = new Set(['telegram', 'discord', 'email', 'webhook']);

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ channel: string }> },
) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { channel } = await ctx.params;
  if (!VALID.has(channel)) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  }
  const removed = await deleteChannelConfig(
    session.userId,
    channel as 'telegram' | 'discord' | 'email' | 'webhook',
  );
  return NextResponse.json({ removed });
}

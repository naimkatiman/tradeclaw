import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getChannelConfigsForUser,
  upsertChannelConfig,
} from '@/lib/alert-rules-db';
import { readSessionFromRequest } from '@/lib/user-session';

/**
 * Per-user "preferred platform" channel configuration.
 *
 * GET — list the caller's stored channels.
 * POST — upsert one channel's config + enabled flag. Idempotent on
 *        (user_id, channel) so the same body can be replayed.
 *
 * The dispatch route at /api/alert-rules/dispatch reads from this table
 * to know where to deliver alerts when a rule's channels include a given
 * platform. Without a row here, the rule fan-out skips silently — which
 * is the right behavior, but UI must surface it.
 */

const ChannelEnum = z.enum(['telegram', 'discord', 'email', 'webhook']);

const UpsertSchema = z.object({
  channel: ChannelEnum,
  // Per-channel shape is enforced at send time in lib/alert-channels.ts.
  // Here we only require the map to be string→string so DB write is safe.
  config: z.record(z.string(), z.string()),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const configs = await getChannelConfigsForUser(session.userId);
  return NextResponse.json({ configs });
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const config = await upsertChannelConfig(
    session.userId,
    parsed.data.channel,
    parsed.data.config,
    parsed.data.enabled,
  );
  return NextResponse.json({ config }, { status: 200 });
}

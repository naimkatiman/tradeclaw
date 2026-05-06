import { NextRequest, NextResponse } from 'next/server';
import {
  broadcastTopSignals,
  readBroadcastState,
} from '../../../../lib/telegram-broadcast';
import { getBotToken, getFreeChannelId } from '../../../../lib/telegram-channels';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { assertAdminApi } from '../../../../lib/admin-gate';

// Accept either an admin browser session or a Vercel-cron Bearer token.
// Pre-fix this route was wide open and any internet caller could trigger
// a broadcast or read the channel-id prefix from GET.
async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const adminDenied = await assertAdminApi(request);
  if (!adminDenied) return null;
  const cronDenied = requireCronAuth(request);
  if (!cronDenied) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ---------------------------------------------------------------------------
// POST /api/telegram/broadcast — trigger a channel broadcast
// Body (optional): { channelId?, botToken? } — falls back to env vars
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await authorize(request);
  if (denied) return denied;

  let body: { channelId?: string; botToken?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body is fine — we use env vars
  }

  const botToken = body.botToken || getBotToken();
  const channelId = body.channelId || getFreeChannelId();

  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 503 });
  }
  if (!channelId) {
    return NextResponse.json({ error: 'TELEGRAM_FREE_CHANNEL_ID not configured' }, { status: 503 });
  }

  const result = await broadcastTopSignals(channelId, botToken, { freeOnly: true });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    broadcastedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// GET /api/telegram/broadcast — broadcast status
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await authorize(request);
  if (denied) return denied;

  try {
    const state = readBroadcastState();
    const channelId = getFreeChannelId();
    const configured = !!(getBotToken() && channelId);

    const lastTime = state.lastBroadcastTime ? new Date(state.lastBroadcastTime) : null;
    const nextBroadcast = lastTime
      ? new Date(lastTime.getTime() + 4 * 60 * 60 * 1000).toISOString()
      : null;

    return NextResponse.json({
      configured,
      channelId: channelId ? `${channelId.slice(0, 4)}...` : null,
      lastBroadcastTime: state.lastBroadcastTime,
      lastMessageId: state.lastMessageId,
      lastError: state.lastError,
      broadcastCount: state.broadcastCount,
      nextBroadcast,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

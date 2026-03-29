import { NextRequest, NextResponse } from 'next/server';
import {
  broadcastTopSignals,
  readBroadcastState,
} from '../../../../lib/telegram-broadcast';

// ---------------------------------------------------------------------------
// POST /api/telegram/broadcast — trigger a channel broadcast
// Body (optional): { channelId?, botToken? } — falls back to env vars
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { channelId?: string; botToken?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body is fine — we use env vars
  }

  const botToken = body.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const channelId = body.channelId || process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 503 });
  }
  if (!channelId) {
    return NextResponse.json({ error: 'TELEGRAM_CHANNEL_ID not configured' }, { status: 503 });
  }

  const result = await broadcastTopSignals(channelId, botToken);

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

export async function GET(): Promise<NextResponse> {
  const state = readBroadcastState();
  const channelId = process.env.TELEGRAM_CHANNEL_ID ?? null;
  const configured = !!(process.env.TELEGRAM_BOT_TOKEN && channelId);

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
}

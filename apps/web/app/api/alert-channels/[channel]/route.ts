import { NextRequest, NextResponse } from 'next/server';
import { deleteChannelConfig, getChannelConfigsForUser } from '@/lib/alert-rules-db';
import { getUserById } from '@/lib/db';
import { readSessionFromRequest } from '@/lib/user-session';
import { sendToChannel, type AlertSignal, type ChannelName } from '@/lib/alert-channels';

const VALID = new Set<ChannelName>(['telegram', 'discord', 'email', 'webhook']);

function isChannel(c: string): c is ChannelName {
  return VALID.has(c as ChannelName);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ channel: string }> },
) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { channel } = await ctx.params;
  if (!isChannel(channel)) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  }
  const removed = await deleteChannelConfig(session.userId, channel);
  return NextResponse.json({ removed });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ channel: string }> },
) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { channel } = await ctx.params;
  if (!isChannel(channel)) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  }

  const configs = await getChannelConfigsForUser(session.userId);
  const cfg = configs.find((c) => c.channel === channel);

  if (cfg && !cfg.enabled) {
    return NextResponse.json({ error: 'Channel is disabled' }, { status: 400 });
  }

  // Telegram fallback: if the user has linked the platform bot via the
  // welcome/dashboard deep link (users.telegram_user_id is set), accept
  // a test send even when no per-channel config exists or when the saved
  // config has no chatId. lib/alert-channels.sendTelegramDm uses the
  // TELEGRAM_BOT_TOKEN env var when config.botToken is empty.
  let sendConfig: Record<string, string> | null = cfg?.config ?? null;
  if (channel === 'telegram' && (!sendConfig || !sendConfig.chatId)) {
    const user = await getUserById(session.userId);
    if (user?.telegramUserId) {
      sendConfig = { ...(sendConfig ?? {}), chatId: user.telegramUserId.toString() };
    }
  }

  if (!sendConfig) {
    return NextResponse.json({ error: 'Channel not configured' }, { status: 404 });
  }

  const testSignal: AlertSignal = {
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 78,
    entry: 2420.50,
    stopLoss: 2415.00,
    takeProfit1: 2425.00,
    takeProfit2: 2430.00,
    takeProfit3: 2438.00,
  };

  const delivered = await sendToChannel(channel, sendConfig, testSignal);
  return NextResponse.json({ delivered });
}

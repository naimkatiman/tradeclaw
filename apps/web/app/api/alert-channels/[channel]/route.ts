import { NextRequest, NextResponse } from 'next/server';
import { deleteChannelConfig, getChannelConfigsForUser } from '@/lib/alert-rules-db';
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
  if (!cfg) {
    return NextResponse.json({ error: 'Channel not configured' }, { status: 404 });
  }
  if (!cfg.enabled) {
    return NextResponse.json({ error: 'Channel is disabled' }, { status: 400 });
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

  const delivered = await sendToChannel(channel, cfg.config, testSignal);
  return NextResponse.json({ delivered });
}

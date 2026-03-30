import { NextRequest, NextResponse } from 'next/server';
import { broadcastTopSignals } from '../../../../lib/telegram-broadcast';

// ---------------------------------------------------------------------------
// GET /api/cron/telegram — Vercel Cron handler (every 4 hours)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth guard — Vercel cron sends CRON_SECRET as bearer token
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured' },
        { status: 503 },
      );
    }

    const result = await broadcastTopSignals(channelId, botToken);

    return NextResponse.json({
      ok: result.success,
      messageId: result.messageId ?? null,
      error: result.error ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

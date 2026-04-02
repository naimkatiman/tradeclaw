import { NextRequest, NextResponse } from 'next/server';
import { getDailyDigest } from '../../../../lib/daily-digest';

const TELEGRAM_API = 'https://api.telegram.org';

// ---------------------------------------------------------------------------
// GET /api/cron/daily-digest — Vercel Cron handler (08:00 UTC daily)
// Also supports POST for manual trigger from the preview page.
// ---------------------------------------------------------------------------

async function handler(request: NextRequest): Promise<NextResponse> {
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
        { sent: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured' },
        { status: 503 },
      );
    }

    const digest = await getDailyDigest();

    if (digest.count === 0) {
      return NextResponse.json({
        sent: false,
        count: 0,
        channel: channelId,
        error: 'No high-confidence signals to send',
        timestamp: new Date().toISOString(),
      });
    }

    // Post to Telegram channel
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: digest.message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok) {
      return NextResponse.json({
        sent: false,
        count: digest.count,
        channel: channelId,
        error: data.description ?? 'Telegram API error',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sent: true,
      count: digest.count,
      channel: channelId,
      messageId: data.result?.message_id ?? null,
      date: digest.date,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

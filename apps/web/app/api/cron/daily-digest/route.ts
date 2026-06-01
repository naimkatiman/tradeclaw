import { NextRequest, NextResponse } from 'next/server';
import { getDailyDigest, digestToPlainText, digestToHtml, type DailyDigest } from '../../../../lib/daily-digest';
import { sendEmail } from '../../../../lib/email-sender';

const TELEGRAM_API = 'https://api.telegram.org';

// ---------------------------------------------------------------------------
// GET /api/cron/daily-digest — Vercel Cron handler (08:00 UTC daily)
// Also supports POST for manual trigger from the preview page.
// Delivers to Telegram (if configured) and/or email (if EMAIL_TO is set),
// independently — an email-only self-host works without Telegram tokens.
// ---------------------------------------------------------------------------

function emailRecipients(): string[] {
  return (process.env.EMAIL_TO ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function postToTelegram(digest: DailyDigest): Promise<{ sent: boolean; messageId?: number | null; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) return { sent: false, error: 'not_configured' };

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
  const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) return { sent: false, error: data.description ?? 'Telegram API error' };
  return { sent: true, messageId: data.result?.message_id ?? null };
}

async function sendDigestEmails(digest: DailyDigest): Promise<{ sent: boolean; recipients: number; delivered: number; error?: string }> {
  const recipients = emailRecipients();
  if (recipients.length === 0) return { sent: false, recipients: 0, delivered: 0, error: 'not_configured' };

  const payload = {
    subject: `TradeClaw Daily Signal Digest — ${digest.date}`,
    text: digestToPlainText(digest),
    html: digestToHtml(digest),
  };
  const results = await Promise.all(recipients.map(to => sendEmail(to, payload)));
  const delivered = results.filter(r => r.ok).length;
  return { sent: delivered > 0, recipients: recipients.length, delivered };
}

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
    const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
    const emailConfigured = emailRecipients().length > 0;

    if (!telegramConfigured && !emailConfigured) {
      return NextResponse.json(
        { sent: false, error: 'No delivery channel configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID and/or EMAIL_TO)' },
        { status: 503 },
      );
    }

    const digest = await getDailyDigest();

    if (digest.count === 0) {
      return NextResponse.json({
        sent: false,
        count: 0,
        error: 'No high-confidence signals to send',
        timestamp: new Date().toISOString(),
      });
    }

    const telegram = telegramConfigured ? await postToTelegram(digest) : { sent: false, error: 'not_configured' };
    const email = emailConfigured ? await sendDigestEmails(digest) : { sent: false, recipients: 0, delivered: 0, error: 'not_configured' };

    return NextResponse.json({
      sent: telegram.sent || email.sent,
      count: digest.count,
      date: digest.date,
      telegram,
      email,
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

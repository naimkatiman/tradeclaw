import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

const HEADER = 'x-telegram-bot-api-secret-token';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyTelegramWebhook(request: NextRequest): NextResponse | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'telegram_webhook_not_configured' }, { status: 503 });
  }
  const header = request.headers.get(HEADER) ?? '';
  if (!safeEqual(header, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

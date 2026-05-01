import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import {
  createTelegramLinkToken,
  TELEGRAM_LINK_TOKEN_TTL_SECONDS,
} from '../../../../lib/telegram-link-token';

export const runtime = 'nodejs';

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'TradeClaw_win_Bot';

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json(
      { error: 'Not signed in — sign in with Google at /signin first' },
      { status: 401 },
    );
  }

  const token = createTelegramLinkToken(session.userId);
  const deepLink = `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(token)}`;

  return NextResponse.json({
    token,
    deepLink,
    expiresInSeconds: TELEGRAM_LINK_TOKEN_TTL_SECONDS,
  });
}

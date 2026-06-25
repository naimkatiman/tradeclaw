import { NextRequest, NextResponse } from 'next/server';
import {
  verifyTelegramLogin,
  isTelegramAuthDateFresh,
} from '../../../../lib/telegram-login';
import { upsertTelegramUser } from '../../../../lib/db';
import {
  createSessionToken,
  sessionCookieOptions,
  USER_SESSION_COOKIE,
} from '../../../../lib/user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: 'telegram_not_configured' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const id = Number(body.id);
  const first_name = typeof body.first_name === 'string' ? body.first_name : '';
  const last_name =
    typeof body.last_name === 'string' ? body.last_name : undefined;
  const username =
    typeof body.username === 'string' ? body.username : undefined;
  const photo_url =
    typeof body.photo_url === 'string' ? body.photo_url : undefined;
  const auth_date = Number(body.auth_date);
  const hash = typeof body.hash === 'string' ? body.hash : '';

  if (!Number.isFinite(id) || id <= 0 || !hash) {
    return NextResponse.json(
      { error: 'missing_fields' },
      { status: 400 },
    );
  }

  if (!Number.isFinite(auth_date) || auth_date <= 0) {
    return NextResponse.json(
      { error: 'invalid_auth_date' },
      { status: 400 },
    );
  }

  const loginData = {
    id,
    first_name,
    last_name,
    username,
    photo_url,
    auth_date,
    hash,
  };

  if (!verifyTelegramLogin(loginData, botToken)) {
    return NextResponse.json(
      { error: 'invalid_hash' },
      { status: 401 },
    );
  }

  if (!isTelegramAuthDateFresh(auth_date)) {
    return NextResponse.json(
      { error: 'auth_expired' },
      { status: 401 },
    );
  }

  const displayName = [first_name, last_name]
    .filter((s): s is string => !!s)
    .join(' ') || username || 'Telegram User';

  try {
    const user = await upsertTelegramUser({
      telegramUserId: BigInt(id),
      displayName,
      avatarUrl: photo_url ?? null,
    });

    const sessionToken = createSessionToken(user.id);
    const res = NextResponse.json({ ok: true, userId: user.id });
    res.cookies.set(USER_SESSION_COOKIE, sessionToken, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[telegram-auth] upsert failed:', err);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 },
    );
  }
}

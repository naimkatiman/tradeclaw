import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import {
  getUserById,
  getUserSubscription,
  countRecentTelegramInvites,
} from '../../../../lib/db';
import { sendInviteWithRetry } from '../../../../lib/telegram';

export const dynamic = 'force-dynamic';

// Cap one paying user to RESEND_LIMIT invite creations per RESEND_WINDOW_SEC.
// Each invite is single-use 72h, so without this gate a Pro subscriber could
// mint dozens of links and share them to bypass the per-seat paywall.
const RESEND_LIMIT = 3;
const RESEND_WINDOW_SEC = 600;

/**
 * Self-serve resend of the Telegram group invite.
 *
 * Use case: the Stripe webhook tried to send the invite at checkout but the
 * user had blocked the bot, the chat was misconfigured, or all 3 retries
 * burned through transient errors. Once the user unblocks the bot (or admin
 * fixes the chat id), they hit this endpoint from the welcome page to get
 * a fresh invite without anyone having to run the resend script.
 *
 * Auth: standard session cookie. Tier check uses the live subscription row,
 * not the cached session payload, so a user who just upgraded can recover
 * on the same browser tab without re-signin.
 */
export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!user.telegramUserId) {
    return NextResponse.json(
      { ok: false, error: 'no_telegram_link' },
      { status: 409 },
    );
  }

  // Source the tier from the live subscription row rather than user.tier.
  // user.tier can lag behind a brand-new checkout if the resend is hit
  // before the webhook lands; the subscription row is updated synchronously
  // by the same handler so it's the more reliable signal here.
  const sub = await getUserSubscription(user.id);
  const tier =
    sub?.tier === 'pro' || sub?.tier === 'elite'
      ? sub.tier
      : user.tier === 'pro' || user.tier === 'elite'
        ? user.tier
        : null;

  if (!tier) {
    return NextResponse.json(
      { ok: false, error: 'free_tier' },
      { status: 403 },
    );
  }

  const recentCount = await countRecentTelegramInvites(user.id, RESEND_WINDOW_SEC);
  if (recentCount >= RESEND_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: 'rate_limited',
        retryAfterSeconds: RESEND_WINDOW_SEC,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(RESEND_WINDOW_SEC) },
      },
    );
  }

  const result = await sendInviteWithRetry(user.id, user.telegramUserId.toString(), tier);

  if (!result.ok) {
    console.error(
      '[resend-invite] failed:',
      `user=${user.id} attempts=${result.attempts} retryable=${result.retryable} err=${result.error}`,
    );
    // Map Telegram failures to actionable error codes so the welcome page
    // can show the right CTA. Both cases are user-recoverable, not 5xx
    // server faults — return 409 (conflict with current Telegram state).
    const errLower = (result.error ?? '').toLowerCase();
    if (errLower.includes('chat not found')) {
      return NextResponse.json(
        { ok: false, error: 'chat_not_found' },
        { status: 409 },
      );
    }
    if (errLower.includes('bot was blocked') || errLower.includes('forbidden')) {
      return NextResponse.json(
        { ok: false, error: 'bot_blocked' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'send_failed',
        retryable: result.retryable,
        attempts: result.attempts,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, attempts: result.attempts });
}

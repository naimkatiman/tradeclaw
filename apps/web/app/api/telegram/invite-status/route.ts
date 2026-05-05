import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import {
  getUserById,
  getUserSubscription,
  getLatestUserTelegramInvite,
} from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * Per-user Telegram invite delivery state for the dashboard badge.
 *
 * Returns enough state to render: sent (active + not expired), pending
 * (paying user, no row yet — webhook in flight or failed silently),
 * expired (stale row), or unlinked (no telegram_user_id). Free users get
 * `tier: 'free'` so the client can hide the badge entirely.
 *
 * Auth: standard session cookie. Tier read from the live subscription row
 * to mirror /api/telegram/resend-invite, so the badge does not lag behind
 * a fresh checkout.
 */
export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sub = await getUserSubscription(user.id);
  const tier =
    sub?.tier === 'pro' || sub?.tier === 'elite'
      ? sub.tier
      : user.tier === 'pro' || user.tier === 'elite'
        ? user.tier
        : 'free';

  if (tier === 'free') {
    return NextResponse.json({
      ok: true,
      tier: 'free' as const,
      linked: user.telegramUserId !== null,
      invite: null,
    });
  }

  const linked = user.telegramUserId !== null;
  const invite = await getLatestUserTelegramInvite(user.id);

  if (!invite) {
    return NextResponse.json({
      ok: true,
      tier,
      linked,
      invite: null,
    });
  }

  const now = Date.now();
  const isExpired =
    invite.expiresAt !== null && invite.expiresAt.getTime() < now;

  return NextResponse.json({
    ok: true,
    tier,
    linked,
    invite: {
      isActive: invite.isActive,
      isExpired,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    },
  });
}

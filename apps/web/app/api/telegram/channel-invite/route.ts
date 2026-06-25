import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserTier } from '../../../../lib/tier';

export const runtime = 'nodejs';

/**
 * GET /api/telegram/channel-invite
 *
 * Returns the private Telegram channel invite link for the authenticated
 * user's tier. Free users receive 403.
 *
 * This powers the "Join Premium Channel" card on the billing page.
 */
export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json(
      { error: 'Sign in to view your premium channel invite.' },
      { status: 401 },
    );
  }

  const tier = await getUserTier(session.userId);

  if (tier === 'elite') {
    const invite = process.env.TELEGRAM_ELITE_CHANNEL_INVITE ?? process.env.TELEGRAM_PRO_CHANNEL_INVITE ?? null;
    if (!invite) {
      return NextResponse.json(
        { error: 'Elite channel invite is not configured. Contact support.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ tier: 'elite', invite });
  }

  if (tier === 'pro' || tier === 'custom') {
    const invite = process.env.TELEGRAM_PRO_CHANNEL_INVITE ?? null;
    if (!invite) {
      return NextResponse.json(
        { error: 'Pro channel invite is not configured. Contact support.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ tier: 'pro', invite });
  }

  return NextResponse.json(
    { error: 'Premium channel access requires a Pro or Elite subscription.' },
    { status: 403 },
  );
}

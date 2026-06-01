import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../lib/user-session';
import {
  getReferralRevenueForReferrer,
  getReferredUsersCount,
  getUserById,
} from '../../../lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/referrals
 *
 * Returns the authenticated user's referral dashboard stats:
 * - referralCode
 * - referralLink
 * - referredCount (how many users signed up with their code)
 * - totalEarningsCents
 * - pendingEarningsCents
 * - paidOutEarningsCents
 * - recentRecords (last 20 revenue records)
 *
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json(
      { error: 'Sign in to view your referral dashboard.' },
      { status: 401 },
    );
  }

  try {
    const [revenue, referredCount, user] = await Promise.all([
      getReferralRevenueForReferrer(session.userId),
      getReferredUsersCount(session.userId),
      getUserById(session.userId),
    ]);

    const referralCode = user?.referralCode ?? null;
    const referralLink = referralCode
      ? `https://tradeclaw.win/pricing?ref=${referralCode}`
      : null;

    return NextResponse.json({
      referralCode,
      referralLink,
      referredCount,
      totalEarningsCents: revenue.totalShareCents,
      pendingEarningsCents: revenue.pendingShareCents,
      paidOutEarningsCents: revenue.paidOutShareCents,
      recentRecords: revenue.records.slice(0, 20).map((r) => ({
        id: r.id,
        referredId: r.referredId,
        amountCents: r.amountCents,
        shareCents: r.shareCents,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[referrals] stats error:', err);
    return NextResponse.json(
      { error: 'Unable to load referral stats.' },
      { status: 500 },
    );
  }
}

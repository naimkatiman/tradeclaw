import { NextRequest, NextResponse } from 'next/server';
import { getSocialSummaryStats } from '../../../../../lib/social-summary-stats';
import { enqueueSummaryPost } from '../../../../../lib/social-queue';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  // Resolved denominator identical to /track-record and the OG card
  // (getSocialSummaryStats → getResolvedSlice + isCountedResolved): excludes
  // simulated, gate-blocked, and auto-expired rows so the posted signal-study
  // statistics match the page this caption links to.
  const s = await getSocialSummaryStats('daily', today);
  if (s.total === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resolved signals today' });
  }

  const sumPriceMovePct = s.sumPriceMovePct;
  const winRate = s.winRatePct.toFixed(1);
  const sumPriceMoveStr = `${sumPriceMovePct >= 0 ? '+' : ''}${sumPriceMovePct.toFixed(2)}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const imageUrl = `${baseUrl}/api/og/summary?period=daily&date=${today}`;
  // UTM-tag the outbound link so social-driven signups are attributable in
  // analytics. (First-party auto-posts have no individual referrer, so a
  // user-to-user ref code is not used here — that belongs on user share links.)
  const trackUrl = `${baseUrl}/track-record?utm_source=x&utm_medium=social&utm_campaign=daily_summary`;
  const copy = [
    `Today on TradeClaw: ${s.total} signals resolved`,
    `${s.wins}W / ${s.losses}L (${winRate}%)`,
    `Unsized sum of per-signal 24h price moves: ${sumPriceMoveStr}%`,
    'Signal study; not portfolio P/L or broker fills.',
    '',
    `Track live: ${trackUrl}`,
    '#TradeClaw #Trading #Signals',
  ].join('\n');

  const post = await enqueueSummaryPost('daily_summary', copy, imageUrl, {
    date: today,
    total: s.total,
    wins: s.wins,
    losses: s.losses,
    winRate,
    sumPriceMovePct: sumPriceMovePct.toFixed(2),
    studyLimitations: 'not portfolio P/L or broker fills',
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

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
  // (getSocialSummaryStats → getResolvedSlice + isCountedResolved). Pair sums
  // are derived from the SAME resolved set, so the prior raw SQL's
  // gate-blocked/auto-expired leakage no longer inflates the recap.
  const s = await getSocialSummaryStats('weekly', today);
  if (s.total === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resolved signals this week' });
  }

  const sumPriceMovePct = s.sumPriceMovePct;
  const winRate = s.winRatePct.toFixed(1);
  const sumPriceMoveStr = `${sumPriceMovePct >= 0 ? '+' : ''}${sumPriceMovePct.toFixed(2)}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const imageUrl = `${baseUrl}/api/og/summary?period=weekly&date=${today}`;
  const lines = [
    'Weekly Signal Study on TradeClaw',
    `${s.total} signals | ${s.wins}W / ${s.losses}L (${winRate}%)`,
    `Unsized sum of per-signal 24h price moves: ${sumPriceMoveStr}%`,
  ];
  if (s.highestSumSymbol && s.highestSumPriceMovePct !== null) {
    lines.push(
      `Highest pair sum: ${s.highestSumSymbol} (${s.highestSumPriceMovePct >= 0 ? '+' : ''}${s.highestSumPriceMovePct.toFixed(2)}%)`,
    );
  }
  if (
    s.lowestSumSymbol
    && s.lowestSumSymbol !== s.highestSumSymbol
    && s.lowestSumPriceMovePct !== null
  ) {
    lines.push(
      `Lowest pair sum: ${s.lowestSumSymbol} (${s.lowestSumPriceMovePct >= 0 ? '+' : ''}${s.lowestSumPriceMovePct.toFixed(2)}%)`,
    );
  }
  // UTM-tag the outbound link for first-party channel attribution (see daily route).
  const trackUrl = `${baseUrl}/track-record?utm_source=x&utm_medium=social&utm_campaign=weekly_recap`;
  lines.push(
    'Signal study; not portfolio P/L or broker fills.',
    '',
    `Full breakdown: ${trackUrl}`,
    '#TradeClaw #WeeklyRecap #Trading',
  );

  const copy = lines.join('\n');
  const post = await enqueueSummaryPost('weekly_summary', copy, imageUrl, {
    date: today, total: s.total, wins: s.wins, losses: s.losses,
    winRate,
    sumPriceMovePct: sumPriceMovePct.toFixed(2),
    highestSumSymbol: s.highestSumSymbol,
    highestSumPriceMovePct: s.highestSumPriceMovePct,
    lowestSumSymbol: s.lowestSumSymbol,
    lowestSumPriceMovePct: s.lowestSumPriceMovePct,
    studyLimitations: 'not portfolio P/L or broker fills',
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

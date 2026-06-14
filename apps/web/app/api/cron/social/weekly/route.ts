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
  // (getSocialSummaryStats → getResolvedSlice + isCountedResolved). Best/worst
  // symbol is derived from the SAME resolved set, so the prior raw SQL's
  // gate-blocked/auto-expired leakage no longer inflates the recap.
  const s = await getSocialSummaryStats('weekly', today);
  if (s.total === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resolved signals this week' });
  }

  const pnl = s.totalPnlPct;
  const winRate = s.winRatePct.toFixed(1);
  const pnlStr = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const imageUrl = `${baseUrl}/api/og/summary?period=weekly&date=${today}`;
  const lines = [
    `Weekly Recap on TradeClaw`,
    `${s.total} signals | ${s.wins}W / ${s.losses}L (${winRate}%)`,
    `P/L: ${pnlStr}%`,
  ];
  if (s.bestSymbol && s.bestPnlPct !== null) {
    lines.push(`Best: ${s.bestSymbol} (${s.bestPnlPct >= 0 ? '+' : ''}${s.bestPnlPct.toFixed(2)}%)`);
  }
  if (s.worstSymbol && s.worstSymbol !== s.bestSymbol && s.worstPnlPct !== null) {
    lines.push(`Worst: ${s.worstSymbol} (${s.worstPnlPct >= 0 ? '+' : ''}${s.worstPnlPct.toFixed(2)}%)`);
  }
  lines.push('', `Full breakdown: ${baseUrl}/track-record`, '#TradeClaw #WeeklyRecap #Trading');

  const copy = lines.join('\n');
  const post = await enqueueSummaryPost('weekly_summary', copy, imageUrl, {
    date: today, total: s.total, wins: s.wins, losses: s.losses,
    winRate, totalPnl: pnl.toFixed(2),
    bestSymbol: s.bestSymbol, bestPnl: s.bestPnlPct,
    worstSymbol: s.worstSymbol, worstPnl: s.worstPnlPct,
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

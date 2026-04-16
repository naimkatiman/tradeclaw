import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db-pool';
import { enqueueSummaryPost } from '../../../../../lib/social-queue';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const rows = await query<{
    total: string; wins: string; losses: string; win_rate: string; total_pnl: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::text AS total,
      COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::text AS wins,
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL AND (outcome_24h->>'hit')::boolean = false)::text AS losses,
      CASE WHEN COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE (outcome_24h->>'hit')::boolean = true)::numeric
          / COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL) * 100, 1)::text
        ELSE '0' END AS win_rate,
      COALESCE(ROUND(SUM((outcome_24h->>'pnlPct')::numeric) FILTER (WHERE outcome_24h IS NOT NULL), 2)::text, '0') AS total_pnl
    FROM signal_history
    WHERE is_simulated = false
      AND created_at >= $1::date
      AND created_at < $1::date + INTERVAL '1 day'
  `, [today]);

  const s = rows[0] ?? { total: '0', wins: '0', losses: '0', win_rate: '0', total_pnl: '0' };
  if (Number(s.total) === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resolved signals today' });
  }

  const pnl = Number(s.total_pnl);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const imageUrl = `${baseUrl}/api/og/summary?period=daily&date=${today}`;
  const copy = [
    `Today on TradeClaw: ${s.total} signals resolved`,
    `${s.wins}W / ${s.losses}L (${s.win_rate}%)`,
    `P/L: ${pnl >= 0 ? '+' : ''}${s.total_pnl}%`,
    '',
    `Track live: ${baseUrl}/track-record`,
    '#TradeClaw #Trading #Signals',
  ].join('\n');

  const post = await enqueueSummaryPost('daily_summary', copy, imageUrl, {
    date: today, total: s.total, wins: s.wins, losses: s.losses, winRate: s.win_rate, totalPnl: s.total_pnl,
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

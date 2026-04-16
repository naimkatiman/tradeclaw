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
    best_symbol: string | null; best_pnl: string | null;
    worst_symbol: string | null; worst_pnl: string | null;
  }>(`
    WITH stats AS (
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
        AND created_at >= ($1::date - INTERVAL '7 days')
        AND created_at < $1::date + INTERVAL '1 day'
    ),
    by_symbol AS (
      SELECT pair, ROUND(SUM((outcome_24h->>'pnlPct')::numeric), 2) AS pnl
      FROM signal_history
      WHERE is_simulated = false AND outcome_24h IS NOT NULL
        AND created_at >= ($1::date - INTERVAL '7 days')
        AND created_at < $1::date + INTERVAL '1 day'
      GROUP BY pair
    )
    SELECT
      s.*,
      (SELECT pair FROM by_symbol ORDER BY pnl DESC LIMIT 1) AS best_symbol,
      (SELECT pnl::text FROM by_symbol ORDER BY pnl DESC LIMIT 1) AS best_pnl,
      (SELECT pair FROM by_symbol ORDER BY pnl ASC LIMIT 1) AS worst_symbol,
      (SELECT pnl::text FROM by_symbol ORDER BY pnl ASC LIMIT 1) AS worst_pnl
    FROM stats s
  `, [today]);

  const s = rows[0];
  if (!s || Number(s.total) === 0) {
    return NextResponse.json({ skipped: true, reason: 'No resolved signals this week' });
  }

  const pnl = Number(s.total_pnl);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const imageUrl = `${baseUrl}/api/og/summary?period=weekly&date=${today}`;
  const lines = [
    `Weekly Recap on TradeClaw`,
    `${s.total} signals | ${s.wins}W / ${s.losses}L (${s.win_rate}%)`,
    `P/L: ${pnl >= 0 ? '+' : ''}${s.total_pnl}%`,
  ];
  if (s.best_symbol) lines.push(`Best: ${s.best_symbol} (+${s.best_pnl}%)`);
  if (s.worst_symbol && s.worst_symbol !== s.best_symbol) lines.push(`Worst: ${s.worst_symbol} (${s.worst_pnl}%)`);
  lines.push('', `Full breakdown: ${baseUrl}/track-record`, '#TradeClaw #WeeklyRecap #Trading');

  const copy = lines.join('\n');
  const post = await enqueueSummaryPost('weekly_summary', copy, imageUrl, {
    date: today, total: s.total, wins: s.wins, losses: s.losses,
    winRate: s.win_rate, totalPnl: s.total_pnl,
    bestSymbol: s.best_symbol, bestPnl: s.best_pnl,
    worstSymbol: s.worst_symbol, worstPnl: s.worst_pnl,
  });

  return NextResponse.json({ ok: true, postId: post.id });
}

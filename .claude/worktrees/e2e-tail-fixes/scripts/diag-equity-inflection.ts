/**
 * One-shot read-only diagnostic: daily R distribution over the last 60 days.
 * Tests the hypothesis that the /track-record equity curve dropped because of
 * the May 6 resolution-math fix (commits d0bb6845, 219d7cca, 670e8840),
 * not because the engine actually started losing money.
 *
 * Run with: npx tsx scripts/diag-equity-inflection.ts
 */
import { query } from '../apps/web/lib/db-pool';

interface Row {
  day: string;
  total: number;
  resolved: number;
  avg_pnl_pct: number | null;
  avg_r: number | null;
  win_rate_pct: number | null;
}

async function main() {
  const rows = await query<Row>(`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL)::int AS resolved,
      round(AVG(((outcome_24h->>'pnlPct')::float))
        FILTER (WHERE outcome_24h IS NOT NULL)::numeric, 3)::float AS avg_pnl_pct,
      round(AVG(CASE
        WHEN outcome_24h IS NOT NULL
         AND sl IS NOT NULL
         AND entry_price > 0
         AND abs(entry_price - sl) > 0
        THEN ((outcome_24h->>'pnlPct')::float)
             / (abs(entry_price - sl) / entry_price * 100.0)
      END)::numeric, 3)::float AS avg_r,
      round((SUM(CASE WHEN (outcome_24h->>'hit')::boolean = true THEN 1 ELSE 0 END)::float
        / NULLIF(COUNT(*) FILTER (WHERE outcome_24h IS NOT NULL), 0) * 100)::numeric, 1)::float
        AS win_rate_pct
    FROM signal_history
    WHERE created_at >= NOW() - INTERVAL '60 days'
    GROUP BY 1
    ORDER BY 1
  `);

  console.log('day        | total | resolved | avg_pnl% | avg_R   | win%');
  console.log('-----------|-------|----------|----------|---------|-----');
  for (const r of rows) {
    const pad = (v: unknown, n: number) => String(v ?? '').padStart(n);
    console.log(
      `${r.day} | ${pad(r.total, 5)} | ${pad(r.resolved, 8)} | ${pad(r.avg_pnl_pct, 8)} | ${pad(r.avg_r, 7)} | ${pad(r.win_rate_pct, 4)}`,
    );
  }

  // Pre/post May 6 aggregate comparison
  const pre = rows.filter(r => r.day < '2026-05-06' && r.resolved > 0);
  const post = rows.filter(r => r.day >= '2026-05-06' && r.resolved > 0);
  const wAvg = (xs: Row[], k: 'avg_r' | 'avg_pnl_pct' | 'win_rate_pct') => {
    let num = 0,
      den = 0;
    for (const r of xs) {
      if (r[k] == null) continue;
      num += (r[k] as number) * r.resolved;
      den += r.resolved;
    }
    return den > 0 ? +(num / den).toFixed(3) : null;
  };

  console.log('\nWeighted aggregates (by resolved-row count):');
  console.log(`  Pre  May 6 (n=${pre.reduce((s, r) => s + r.resolved, 0)}): avg_R=${wAvg(pre, 'avg_r')}, avg_pnl%=${wAvg(pre, 'avg_pnl_pct')}, win%=${wAvg(pre, 'win_rate_pct')}`);
  console.log(`  Post May 6 (n=${post.reduce((s, r) => s + r.resolved, 0)}): avg_R=${wAvg(post, 'avg_r')}, avg_pnl%=${wAvg(post, 'avg_pnl_pct')}, win%=${wAvg(post, 'win_rate_pct')}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

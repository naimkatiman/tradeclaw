/**
 * Drill into the May 10–13 losing streak. Read-only.
 *
 * Run with:
 *   set -a; source .env; set +a; npx tsx scripts/diag-may10-13-breakdown.ts
 */
import { query } from '../apps/web/lib/db-pool';

const MAJORS = [
  'XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'SPYUSD', 'QQQUSD',
];

const PREMIUM_THRESHOLD = 85;

interface Bucket {
  bucket: string;
  resolved: number;
  avg_r: number | null;
  avg_pnl_pct: number | null;
  win_rate_pct: number | null;
}

const baseFilter = `
  outcome_24h IS NOT NULL
  AND created_at >= '2026-05-10'::date
  AND created_at <  '2026-05-14'::date
  AND sl IS NOT NULL
  AND entry_price > 0
  AND abs(entry_price - sl) > 0
`;

const rExpr = `((outcome_24h->>'pnlPct')::float)
               / (abs(entry_price - sl) / entry_price * 100.0)`;
const winExpr = `(outcome_24h->>'hit')::boolean`;

async function bucketBy(label: string, groupExpr: string): Promise<void> {
  const rows = await query<Bucket>(`
    SELECT
      ${groupExpr} AS bucket,
      COUNT(*)::int AS resolved,
      round(AVG(${rExpr})::numeric, 3)::float AS avg_r,
      round(AVG((outcome_24h->>'pnlPct')::float)::numeric, 3)::float AS avg_pnl_pct,
      round((SUM(CASE WHEN ${winExpr} THEN 1 ELSE 0 END)::float
        / NULLIF(COUNT(*), 0) * 100)::numeric, 1)::float AS win_rate_pct
    FROM signal_history
    WHERE ${baseFilter}
    GROUP BY 1
    ORDER BY avg_r ASC NULLS LAST
  `);
  console.log(`\n== ${label} ==`);
  console.log('bucket'.padEnd(28) + '| n     | avg_R   | avg_pnl%  | win%');
  console.log('-'.repeat(70));
  for (const r of rows) {
    const pad = (v: unknown, n: number) => String(v ?? '').padStart(n);
    console.log(
      `${(r.bucket ?? 'NULL').padEnd(28)}| ${pad(r.resolved, 5)} | ${pad(r.avg_r, 7)} | ${pad(r.avg_pnl_pct, 9)} | ${pad(r.win_rate_pct, 4)}`,
    );
  }
}

async function main(): Promise<void> {
  console.log('Window: 2026-05-10 → 2026-05-13 (4 calendar days, UTC by created_at)');
  console.log('Filter: outcome_24h resolved AND has SL data');

  await bucketBy('By category', `CASE WHEN pair = ANY (ARRAY[${MAJORS.map(s => `'${s}'`).join(',')}]) THEN 'majors' ELSE 'thematic' END`);
  await bucketBy('By direction', `direction`);
  await bucketBy('By timeframe', `timeframe`);
  await bucketBy('By strategy_id', `COALESCE(strategy_id, '(null)')`);
  await bucketBy('By mode', `COALESCE(mode, '(null)')`);
  await bucketBy('Premium band (conf>=85) vs standard', `CASE WHEN confidence >= ${PREMIUM_THRESHOLD} THEN 'premium' ELSE 'standard' END`);
  await bucketBy('By symbol (worst first)', `pair`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

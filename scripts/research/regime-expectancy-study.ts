/**
 * Regime expectancy study (spec docs/plans/2026-08-05-regime-expectancy-study.md).
 *
 * Read-only probe: can any regime subset of the losing track record clear its
 * costs? Splits counted 24h trades by regime-at-entry (EMA200 side + ADX/ER
 * strength on D1, lookahead-safe), runs the inversion test, the analytic
 * cost-vs-stop-width curve, and the per-strategy split. Interpretation is
 * BLOCKED unless the whole-stream reconciliation gate matches the public
 * dashboard decomposition (pre-registered tolerances, see assembly module).
 *
 * Mutates no database state. Reads signal_history and candles only.
 *
 * Run (needs Postgres — local checkout has none):
 *   1. Put DATABASE_PUBLIC_URL=postgresql://... in apps/web/.env.local, OR
 *   2. railway login && railway run -- npx tsx scripts/research/regime-expectancy-study.ts
 *
 *   npx tsx scripts/research/regime-expectancy-study.ts [--days N] [--min-n N] [--json path]
 *
 * D1 candle coverage comes from the candles store (migration 049); top up via
 *   railway run --service Postgres npx tsx scripts/research/backfill-candles.ts \
 *     --symbols <pairs> --timeframes D1 --years 2
 */
import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { connect, getStoredCandles, getCoverage } from './candle-db';
import {
  DAY_MS,
  VARIANTS,
  parseCliArgs,
  CliInputError,
  isCountedRow,
  toStudyTrade,
  buildRegimeSeries,
  regimeAt,
  classifyBucket,
  computeBucketStats,
  invertTrade,
  computeCostCurve,
  reconcile,
  type Bar,
  type BucketName,
  type BucketStats,
  type StudyRow,
  type StudyTrade,
  type VariantName,
} from './regime-study-assembly';

for (const p of ['apps/web/.env.local', '.env.local', 'apps/web/.env', '.env']) {
  const abs = path.resolve(process.cwd(), p);
  if (fs.existsSync(abs)) loadEnv({ path: abs });
}

const USAGE = `Usage: npx tsx scripts/research/regime-expectancy-study.ts [--days N] [--min-n N] [--json path]

Read-only regime expectancy study over resolved TradeClaw signal history.

Options:
  --days N     Restrict to the last N days (positive integer).
  --min-n N    Minimum bucket size to be conclusive (default 300, pre-registered).
  --json path  Write the full result JSON to a local artifact path.
  --help, -h   Print this help text without opening a database connection.`;

/** EMA200 + 20 slope + ADX warmup, with slack for missing bars. */
const LOOKBACK_BARS = 320;

function fmt(x: number, d = 4): string {
  return (x >= 0 ? '+' : '') + x.toFixed(d);
}

function renderBucketTable(title: string, rows: Array<{ label: string; stats: BucketStats }>): string {
  const lines = [title, 'bucket            n     win%   avgWinR  avgLossR   grossR    costR     netR  conclusive'];
  for (const { label, stats: s } of rows) {
    lines.push(
      [
        label.padEnd(14),
        String(s.n).padStart(6),
        s.winRatePct.toFixed(1).padStart(7),
        fmt(s.avgWinR, 2).padStart(9),
        fmt(s.avgLossR, 2).padStart(9),
        fmt(s.grossExpectancyR).padStart(9),
        s.avgCostR.toFixed(4).padStart(8),
        fmt(s.netExpectancyR).padStart(9),
        (s.conclusive ? 'yes' : 'NO').padStart(11),
      ].join(' '),
    );
  }
  return lines.join('\n');
}

async function main() {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CliInputError) {
      console.error(err.message);
      console.error(USAGE);
      process.exit(2);
    }
    throw err;
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const client = await connect();
  let rows: StudyRow[];
  const candlesBySymbol = new Map<string, Bar[]>();
  try {
    const where = [
      'is_simulated = FALSE',
      'outcome_24h IS NOT NULL',
      'COALESCE(gate_blocked, FALSE) = FALSE',
    ];
    const params: number[] = [];
    if (args.days) {
      params.push(args.days);
      where.push(`created_at >= NOW() - $${params.length}::int * INTERVAL '1 day'`);
    }
    const res = await client.query(
      `SELECT pair, timeframe, direction, confidence, entry_price, sl,
              cost_estimate_pct, strategy_id, created_at,
              (outcome_24h->>'pnlPct')::float  AS pnl_pct,
              (outcome_24h->>'hit')::boolean   AS hit,
              (outcome_24h->>'target')         AS target,
              (outcome_24h->>'source')         AS source
         FROM signal_history
        WHERE ${where.join(' AND ')}
        ORDER BY created_at ASC`,
      params,
    );
    rows = res.rows as StudyRow[];

    // Candles: one D1 fetch per distinct pair, window = lookback before the
    // earliest signal through the newest signal.
    const counted = rows.filter(isCountedRow);
    const pairs = [...new Set(counted.map((r) => r.pair))];
    const minTs = Math.min(...counted.map((r) => new Date(r.created_at).getTime()));
    const maxTs = Math.max(...counted.map((r) => new Date(r.created_at).getTime()));
    for (const pair of pairs) {
      const cov = await getCoverage(client, pair, 'D1');
      if (cov.count === 0) continue; // reported as excluded below
      const candles = await getStoredCandles(
        client, pair, 'D1', minTs - LOOKBACK_BARS * DAY_MS, maxTs,
      );
      candlesBySymbol.set(pair, candles);
    }
  } finally {
    await client.end();
  }

  // ── Trades ────────────────────────────────────────────────────────────────
  const trades: StudyTrade[] = [];
  let droppedUncounted = 0;
  let droppedNoSl = 0;
  for (const r of rows) {
    if (!isCountedRow(r)) { droppedUncounted++; continue; }
    const t = toStudyTrade(r);
    if (!t) { droppedNoSl++; continue; }
    trades.push(t);
  }

  // ── Reconciliation gate (must pass before ANY interpretation) ─────────────
  const rec = reconcile(trades);
  console.log('── Reconciliation vs public dashboard ──');
  console.log(`counted n=${rec.n}  gross=${fmt(rec.grossExpectancyR)}  cost=${rec.avgCostR.toFixed(4)}  net=${fmt(rec.netExpectancyR)}`);
  console.log(`dropped: uncounted=${droppedUncounted} noSl/badEntry=${droppedNoSl}`);
  if (!rec.pass) {
    console.error(`RECONCILIATION FAILED — results below are NOT interpretable:\n  ${rec.failures.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS — splits below are interpretable.\n');
  }

  // ── Regime classification (lookahead-safe by construction) ────────────────
  const seriesBySymbol = new Map(
    [...candlesBySymbol].map(([sym, bars]) => [sym, buildRegimeSeries(bars)]),
  );
  const excludedPairs = new Map<string, number>(); // pair -> counted signals lost
  let unclassified = 0;
  const byVariant = new Map<VariantName, Map<BucketName, StudyTrade[]>>(
    VARIANTS.map((v) => [v, new Map([['aligned', []], ['counter', []], ['sideways', []]])]),
  );
  let classified = 0;

  for (const t of trades) {
    const series = seriesBySymbol.get(t.pair);
    if (!series) {
      excludedPairs.set(t.pair, (excludedPairs.get(t.pair) ?? 0) + 1);
      continue;
    }
    const regime = regimeAt(series, t.ts);
    if (!regime) { unclassified++; continue; }
    classified++;
    for (const v of VARIANTS) {
      const bucket = classifyBucket(t.direction, regime, v);
      if (bucket) byVariant.get(v)!.get(bucket)!.push(t);
    }
  }

  console.log('── Coverage ──');
  console.log(`classified=${classified}  unclassified(warmup/no-closed-bar)=${unclassified}`);
  if (excludedPairs.size > 0) {
    const total = [...excludedPairs.values()].reduce((a, b) => a + b, 0);
    console.log(`EXCLUDED (no D1 candles): ${total} signals across ${excludedPairs.size} pairs:`);
    for (const [pair, n] of [...excludedPairs].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pair}: ${n}`);
    }
  } else {
    console.log('excluded pairs: none');
  }
  console.log('');

  // ── H1: regime split ──────────────────────────────────────────────────────
  const bucketJson: Record<string, Record<string, BucketStats>> = {};
  for (const v of VARIANTS) {
    const table = (['aligned', 'counter', 'sideways'] as BucketName[]).map((b) => ({
      label: b,
      stats: computeBucketStats(byVariant.get(v)!.get(b)!, args.minN),
    }));
    bucketJson[v] = Object.fromEntries(table.map((r) => [r.label, r.stats]));
    console.log(renderBucketTable(`── H1 regime split — variant ${v} ──`, table));
    console.log('');
  }

  // ── H2: inversion ─────────────────────────────────────────────────────────
  const inverted = computeBucketStats(trades.map(invertTrade), args.minN);
  const original = computeBucketStats(trades, args.minN);
  console.log(renderBucketTable('── H2 inversion test (approximation: flipped realized R, same cost) ──', [
    { label: 'original', stats: original },
    { label: 'inverted', stats: inverted },
  ]));
  console.log('');

  // ── H3: cost curve ────────────────────────────────────────────────────────
  const curve = computeCostCurve(trades);
  console.log('── H3 analytic cost curve (NOT a re-simulation) ──');
  console.log('stop×   avgCostR  (gross needed per trade to break even)');
  for (const p of curve) {
    console.log(`${String(p.multiple).padStart(4)}   ${p.avgCostR.toFixed(4).padStart(8)}   ${fmt(p.avgCostR)}`);
  }
  console.log('');

  // ── H4: per-strategy split ────────────────────────────────────────────────
  const byStrategy = new Map<string, StudyTrade[]>();
  for (const t of trades) {
    const list = byStrategy.get(t.strategyId) ?? [];
    list.push(t);
    byStrategy.set(t.strategyId, list);
  }
  const strategyRows = [...byStrategy]
    .map(([label, list]) => ({ label, stats: computeBucketStats(list, args.minN) }))
    .sort((a, b) => a.stats.netExpectancyR - b.stats.netExpectancyR);
  console.log(renderBucketTable('── H4 per-strategy split (worst first) ──', strategyRows));

  if (args.jsonPath) {
    const artifact = {
      generatedAt: new Date().toISOString(),
      args: { days: args.days, minN: args.minN },
      reconciliation: rec,
      dropped: { uncounted: droppedUncounted, noSl: droppedNoSl },
      coverage: {
        classified,
        unclassified,
        excludedPairs: Object.fromEntries(excludedPairs),
      },
      regimeSplit: bucketJson,
      inversion: { original, inverted },
      costCurve: curve,
      perStrategy: Object.fromEntries(strategyRows.map((r) => [r.label, r.stats])),
    };
    const abs = path.resolve(process.cwd(), args.jsonPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(artifact, null, 2));
    console.log(`\nJSON artifact written: ${abs}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

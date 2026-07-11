/**
 * Read-only edge experiment: re-cost the track record at the REAL per-row cost
 * and segment net expectancy by asset class x band.
 *
 * WHY: the live equity curve (apps/web/app/api/signals/equity/route.ts:31,192)
 * deducts a FLAT 0.02% per trade. The repo already records each row's real
 * round-trip cost (`cost_estimate_pct`, migration 051) which is ~0.40% on
 * crypto, ~0.10% on metals, ~0.04% on FX. The flat constant undercharges
 * crypto ~20x, so the published -42.5% curve is the OPTIMISTIC version. This
 * script answers the only question that matters before any strategy bet:
 * at the real cost, does ANY asset-class x band subset clear its own cost?
 *
 * It mutates no database state. It only reads signal_history; `--json` writes
 * (and can overwrite) the operator-selected local artifact path.
 *
 * Run (needs a Postgres connection — local checkout has none):
 *   1. Put DATABASE_PUBLIC_URL=postgresql://... in apps/web/.env.local
 *      (Railway dashboard -> Postgres -> Variables -> DATABASE_PUBLIC_URL), OR
 *   2. railway login && railway run -- npx tsx scripts/research/recost-segment.ts
 *
 *   npx tsx scripts/research/recost-segment.ts [--days N] [--min-n N] [--json path]
 *
 * `--days` and `--min-n` must be positive integers; unknown options,
 * duplicate flags, and missing flag values fail before any database connection
 * is opened.
 */
import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

// Load env from the usual local spots (first hit wins per key). Prefer the
// PUBLIC Railway URL — the internal DATABASE_URL hostname only resolves inside
// Railway's network, not from a local machine.
for (const p of ['apps/web/.env.local', '.env.local', 'apps/web/.env', '.env']) {
  const abs = path.resolve(process.cwd(), p);
  if (fs.existsSync(abs)) loadEnv({ path: abs });
}

// ── Constants mirrored from the live engine (cited, kept inline so this script
//    runs standalone via tsx without the Next module graph) ──────────────────

/** equity/route.ts:20 — each trade risks 1% of equity. 1R == 1% of equity. */
const RISK_PER_TRADE_PCT = 1.0;
/** equity/route.ts:44 — per-trade R cap for sizing (stat R stays uncapped). */
const HARD_R_CAP = 8;
/** equity/route.ts:11 — starting paper equity. */
const STARTING_EQUITY = 10_000;
/** equity/route.ts:31 — the FLAT cost the public curve uses today (% equity). */
const PUBLISHED_FLAT_COST_PCT = 0.02;
/** Historical >=85 analysis band retained for reproducibility; not a current product tier. */
const PRO_PREMIUM_MIN_CONFIDENCE = 85;
/** Keep the interval inside PostgreSQL's practical range and the probe's research horizon. */
const MAX_DAYS = 36_500;

type AssetClass = 'crypto' | 'metals' | 'fx' | 'stocks/cmdty';
type Band = 'all' | 'standard' | 'premium';

/**
 * Round-trip cost as % of NOTIONAL by asset class — fallback for rows where
 * cost_estimate_pct is null (pre-051). Mirrors backtest-options.ts:32-50
 * costModelFor: crypto 2*(0.05+0.15)=0.40, metals 2*0.05=0.10, FX 2*0.02=0.04.
 */
const FALLBACK_RT_COST_PCT: Record<AssetClass, number> = {
  crypto: 0.40,
  metals: 0.10,
  fx: 0.04,
  'stocks/cmdty': 0.04, // costModelFor treats non-crypto/non-metal as FX cost
};

const FX_SET = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF']);

function assetClassFor(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (/XAU|XAG/.test(s)) return 'metals';
  if (/BTC|ETH|SOL|BNB|XRP|ADA|DOGE|DOT|LINK|AVAX/.test(s) || /USDT$/.test(s)) return 'crypto';
  if (FX_SET.has(s)) return 'fx';
  return 'stocks/cmdty';
}

interface Row {
  pair: string;
  confidence: number;
  entry_price: number;
  sl: number | null;
  cost_estimate_pct: number | null;
  created_at: string;
  pnl_pct: number | null;
  hit: boolean | null;
  target: string | null;
}

interface Trade {
  ts: number;
  assetClass: AssetClass;
  confidence: number;
  /** sized (capped) R-multiple */
  rSized: number;
  /** raw (uncapped) R-multiple — for honest gross stats */
  rRaw: number;
  /** real round-trip cost expressed in R (cost%_notional / riskPct) */
  costR: number;
  isWin: boolean;
}

interface CellStats {
  n: number;
  winRatePct: number;
  grossExpectancyR: number;
  netExpectancyR: number;
  avgCostR: number;
  netReturnPct: number;
  maxDrawdownPct: number;
  conclusive: boolean;
}

function connString(): string {
  const s = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!s) {
    console.error(
      'No DATABASE_PUBLIC_URL or DATABASE_URL set.\n' +
        'Add DATABASE_PUBLIC_URL=postgresql://... to apps/web/.env.local (Railway -> Postgres -> Variables),\n' +
        'or run via: railway login && railway run -- npx tsx scripts/research/recost-segment.ts',
    );
    process.exit(1);
  }
  return s;
}

function isLocal(cs: string): boolean {
  return /@(localhost|127\.0\.0\.1)[:/]/.test(cs);
}

/** Mirror lib/signal-history.ts isCountedResolved for a raw outcome row. */
function isCounted(r: Row): boolean {
  if (r.pnl_pct === null || r.hit === null) return false;
  // auto-expire placeholder: pnl 0 and not a hit
  if (r.pnl_pct === 0 && !r.hit) return false;
  if (r.target === 'expired') return false;
  return true;
}

function toTrade(r: Row): Trade | null {
  if (!isCounted(r)) return null;
  if (r.sl === null || r.entry_price <= 0) return null;
  const riskPct = (Math.abs(r.entry_price - r.sl) / r.entry_price) * 100;
  if (riskPct <= 0) return null;

  const rRaw = (r.pnl_pct as number) / riskPct;
  const rSized = Math.max(-HARD_R_CAP, Math.min(HARD_R_CAP, rRaw));
  const assetClass = assetClassFor(r.pair);
  const costPctNotional =
    r.cost_estimate_pct != null && r.cost_estimate_pct > 0
      ? r.cost_estimate_pct
      : FALLBACK_RT_COST_PCT[assetClass];
  // cost in R: 1R == riskPct of price == 1% of equity. cost%_notional / riskPct
  // converts a notional cost into the same R units the equity path compounds.
  const costR = costPctNotional / riskPct;

  return {
    ts: new Date(r.created_at).getTime(),
    assetClass,
    confidence: Number(r.confidence),
    rSized,
    rRaw,
    costR,
    isWin: !!r.hit,
  };
}

function bandOf(t: Trade, band: Band): boolean {
  if (band === 'all') return true;
  if (band === 'premium') return t.confidence >= PRO_PREMIUM_MIN_CONFIDENCE;
  return t.confidence < PRO_PREMIUM_MIN_CONFIDENCE;
}

function computeCell(trades: Trade[], minN: number): CellStats {
  const n = trades.length;
  if (n === 0) {
    return { n: 0, winRatePct: 0, grossExpectancyR: 0, netExpectancyR: 0, avgCostR: 0, netReturnPct: 0, maxDrawdownPct: 0, conclusive: false };
  }
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let wins = 0;
  let grossSum = 0;
  let netSum = 0;
  let costSum = 0;
  let equity = STARTING_EQUITY;
  let peak = STARTING_EQUITY;
  let maxDd = 0;

  for (const t of sorted) {
    if (t.isWin) wins++;
    grossSum += t.rRaw;
    // net R uses the SIZED R (what the equity path actually compounds) minus cost
    const netR = t.rSized - t.costR;
    netSum += netR;
    costSum += t.costR;
    // tradeReturnPct (% equity) == netR * RISK_PER_TRADE_PCT (1R == 1% equity)
    const tradeReturnPct = netR * RISK_PER_TRADE_PCT;
    equity *= 1 + tradeReturnPct / 100;
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    n,
    winRatePct: +((wins / n) * 100).toFixed(1),
    grossExpectancyR: +(grossSum / n).toFixed(4),
    netExpectancyR: +(netSum / n).toFixed(4),
    avgCostR: +(costSum / n).toFixed(4),
    netReturnPct: +((equity / STARTING_EQUITY - 1) * 100).toFixed(2),
    maxDrawdownPct: +maxDd.toFixed(2),
    conclusive: n >= minN,
  };
}

class CliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliInputError';
  }
}

function printableArg(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function parsePositiveIntegerArg(name: string, value: string | undefined, fallback: number | null): number | null {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new CliInputError(`Invalid ${name}: expected a positive integer, got "${printableArg(value)}".`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new CliInputError(`Invalid ${name}: expected a positive integer, got "${printableArg(value)}".`);
  }
  return parsed;
}

interface CliArgs {
  days: number | null;
  minN: number;
  jsonPath: string | undefined;
}

function parseCliArgs(args: string[]): CliArgs {
  const raw: { days?: string; minN?: string; jsonPath?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (name !== '--days' && name !== '--min-n' && name !== '--json') {
      throw new CliInputError(`Unknown argument: ${printableArg(name)}. Expected --days, --min-n, or --json.`);
    }

    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new CliInputError(`Missing value for ${name}.`);
    }

    if (name === '--days') {
      if (raw.days !== undefined) throw new CliInputError('Duplicate argument: --days.');
      raw.days = value;
    }
    if (name === '--min-n') {
      if (raw.minN !== undefined) throw new CliInputError('Duplicate argument: --min-n.');
      raw.minN = value;
    }
    if (name === '--json') {
      if (raw.jsonPath !== undefined) throw new CliInputError('Duplicate argument: --json.');
      if (value.trim().length === 0) throw new CliInputError('Invalid --json: expected a non-empty path.');
      raw.jsonPath = value;
    }
    i++;
  }

  const days = parsePositiveIntegerArg('--days', raw.days, null);
  if (days !== null && days > MAX_DAYS) {
    throw new CliInputError(`Invalid --days: must be at most ${MAX_DAYS}, got "${days}".`);
  }

  return {
    days,
    minN: parsePositiveIntegerArg('--min-n', raw.minN, 100) as number,
    jsonPath: raw.jsonPath,
  };
}

async function main() {
  const { days, minN, jsonPath } = parseCliArgs(process.argv.slice(2));

  const cs = connString();
  const pool = new Pool({
    connectionString: cs,
    ssl: isLocal(cs) ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    max: 4,
  });

  const where = ['is_simulated = FALSE', 'outcome_24h IS NOT NULL', 'COALESCE(gate_blocked, FALSE) = FALSE'];
  const queryParams: number[] = [];
  if (days) {
    queryParams.push(days);
    where.push(`created_at >= NOW() - $${queryParams.length}::int * INTERVAL '1 day'`);
  }
  const sql = `
    SELECT pair, confidence, entry_price, sl, cost_estimate_pct, created_at,
           (outcome_24h->>'pnlPct')::float  AS pnl_pct,
           (outcome_24h->>'hit')::boolean   AS hit,
           (outcome_24h->>'target')         AS target
    FROM signal_history
    WHERE ${where.join(' AND ')}
    ORDER BY created_at ASC`;

  let rows: Row[];
  try {
    ({ rows } = await pool.query<Row>(sql, queryParams));
  } finally {
    await pool.end();
  }

  const trades: Trade[] = [];
  let droppedNoSl = 0;
  let droppedNotCounted = 0;
  for (const r of rows) {
    if (!isCounted(r)) { droppedNotCounted++; continue; }
    const t = toTrade(r);
    if (!t) { droppedNoSl++; continue; }
    trades.push(t);
  }

  const classes: AssetClass[] = ['crypto', 'metals', 'fx', 'stocks/cmdty'];
  const bands: Band[] = ['all', 'standard', 'premium'];

  // Headline: all-symbols re-costed vs published flat-2bps, to quantify the undercharge.
  const allCell = computeCell(trades, minN);
  const publishedEquivCostR = PUBLISHED_FLAT_COST_PCT / RISK_PER_TRADE_PCT; // 0.02R
  const realAvgCostR = allCell.avgCostR;

  console.log('\n=== RE-COST + SEGMENT (read-only) ===');
  console.log(`rows fetched: ${rows.length} | counted trades: ${trades.length} | dropped (not counted): ${droppedNotCounted} | dropped (no SL / unsized): ${droppedNoSl}`);
  console.log(`window: ${days ? days + ' days' : 'all history'} | conclusive threshold: n >= ${minN}`);
  console.log(`\nCost reality check (ALL symbols, ALL band):`);
  console.log(`  published flat cost  : ${publishedEquivCostR.toFixed(4)} R/trade  (0.02% equity)`);
  console.log(`  REAL avg cost        : ${realAvgCostR.toFixed(4)} R/trade  (${(realAvgCostR / publishedEquivCostR).toFixed(1)}x the published charge)`);
  console.log(`  gross expectancy     : ${allCell.grossExpectancyR.toFixed(4)} R/trade`);
  console.log(`  NET expectancy       : ${allCell.netExpectancyR.toFixed(4)} R/trade  ${allCell.netExpectancyR > 0 ? 'POSITIVE' : 'negative'}`);
  console.log(`  net return / maxDD   : ${allCell.netReturnPct}% / -${allCell.maxDrawdownPct}%`);

  console.log(`\nPer asset-class x band (net expectancy R after REAL cost):`);
  const header = ['class', 'band', 'n', 'win%', 'grossR', 'NETr', 'costR', 'netRet%', 'maxDD%', 'flag'];
  console.log(header.map((h, i) => h.padStart(i < 2 ? 13 : 9)).join(' '));

  const results: Array<{ assetClass: AssetClass; band: Band } & CellStats> = [];
  for (const c of classes) {
    for (const b of bands) {
      const cell = computeCell(trades.filter(t => t.assetClass === c && bandOf(t, b)), minN);
      results.push({ assetClass: c, band: b, ...cell });
      const flag = cell.n === 0 ? '—' : !cell.conclusive ? 'thin' : cell.netExpectancyR > 0 ? 'CLEARS COST' : 'net-neg';
      const cells = [
        c.padStart(13),
        b.padStart(13),
        String(cell.n).padStart(9),
        String(cell.winRatePct).padStart(9),
        cell.grossExpectancyR.toFixed(3).padStart(9),
        cell.netExpectancyR.toFixed(3).padStart(9),
        cell.avgCostR.toFixed(3).padStart(9),
        String(cell.netReturnPct).padStart(9),
        String(cell.maxDrawdownPct).padStart(9),
        flag.padStart(9),
      ];
      console.log(cells.join(' '));
    }
  }

  const survivors = results.filter(r => r.conclusive && r.netExpectancyR > 0);
  console.log(`\n=== VERDICT ===`);
  if (survivors.length === 0) {
    console.log('No asset-class x band cell clears its own cost at n >= ' + minN + '.');
    console.log('Selectivity does not rescue net edge at real cost — escalate to a different edge source.');
  } else {
    console.log('Subsets that CLEAR their real cost (net-positive, n >= ' + minN + '):');
    for (const s of survivors.sort((a, b) => b.netExpectancyR - a.netExpectancyR)) {
      console.log(`  ${s.assetClass}/${s.band}: net ${s.netExpectancyR.toFixed(4)} R/trade, n=${s.n}, win ${s.winRatePct}%, netRet ${s.netReturnPct}%`);
    }
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ window: days, minN, all: allCell, cells: results }, null, 2));
    console.log(`\nWrote ${jsonPath}`);
  }
}

main().catch(err => {
  if (err instanceof CliInputError) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});

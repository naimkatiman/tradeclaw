/**
 * Historical OHLCV backfill into the `candles` store (engine-makeover Phase 2).
 *
 * Crypto: Binance public market-data mirror (data-api.binance.vision — no key,
 * no geo block), paginated 1000 bars/page. FX/metals: Stooq daily CSV (full
 * history, D1 only — Stooq's free intraday depth is too shallow to bother).
 *
 * KNOWN BLOCKER (2026-06-10): Stooq fronts the CSV endpoint with a JS
 * proof-of-work challenge — programmatic FX/metals backfill returns 0 rows.
 * Acceptable for v1: the approved execution universe is crypto-only (plan
 * decision 4). Revisit with a licensed FX feed when the MT5 leg lands.
 *
 * Idempotent: re-runs insert only missing bars (ON CONFLICT DO NOTHING).
 * The LAST bar returned by Binance can be the still-open bar — it is dropped
 * so the store only ever contains closed candles.
 *
 * Usage:
 *   railway run --service Postgres npx tsx scripts/research/backfill-candles.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD --timeframes H1,H4,D1 --years 2
 *
 * With --out-dir the fetched candles are dumped to per-series JSON files
 * (`<SYMBOL>-<TF>.json`) instead of the database — no DATABASE_URL needed.
 * This is the input path for the regime trainer (Phase 3, plan D7): training
 * runs consume the dump via scripts/research/export-regime-features.ts.
 * Dump files are raw data and stay out of git (root /data/ is gitignored):
 *   npx tsx scripts/research/backfill-candles.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD --timeframes H1 --years 2 \
 *     --out-dir data/research/candles
 */

import fs from 'fs';
import path from 'path';
import { connect, upsertCandles, getCoverage, type StoredCandle } from './candle-db';

const BINANCE_BASE = 'https://data-api.binance.vision/api/v3/klines';
const BINANCE_PAGE = 1000;
const BINANCE_INTERVAL: Record<string, string> = { H1: '1h', H4: '4h', D1: '1d' };

// Canonical TradeClaw symbol -> Binance spot pair (market-data only; matches
// the USDT-perp universe the executor trades). Phase 5 extends the original
// 10 majors with 20 more liquid USDT pairs — the FROZEN cross-sectional
// universe (spec D3): fixed BEFORE any validation run, never edited after.
// EOS/MATIC/FTM excluded (renamed/delisted on Binance spot).
const BINANCE_MAP: Record<string, string> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT', AVAXUSD: 'AVAXUSDT',
  LTCUSD: 'LTCUSDT', BCHUSD: 'BCHUSDT', ETCUSD: 'ETCUSDT', XLMUSD: 'XLMUSDT',
  TRXUSD: 'TRXUSDT', ATOMUSD: 'ATOMUSDT', NEARUSD: 'NEARUSDT', FILUSD: 'FILUSDT',
  UNIUSD: 'UNIUSDT', AAVEUSD: 'AAVEUSDT', SANDUSD: 'SANDUSDT', MANAUSD: 'MANAUSDT',
  ICPUSD: 'ICPUSDT', ALGOUSD: 'ALGOUSDT', VETUSD: 'VETUSDT', AXSUSD: 'AXSUSDT',
  THETAUSD: 'THETAUSDT', GRTUSD: 'GRTUSDT', HBARUSD: 'HBARUSDT', INJUSD: 'INJUSDT',
};

// Canonical -> Stooq code (daily CSV).
const STOOQ_MAP: Record<string, string> = {
  EURUSD: 'eurusd', GBPUSD: 'gbpusd', USDJPY: 'usdjpy', AUDUSD: 'audusd',
  USDCAD: 'usdcad', XAUUSD: 'xauusd', XAGUSD: 'xagusd',
};

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchBinance(pair: string, timeframe: string, fromTs: number, toTs: number): Promise<StoredCandle[]> {
  const interval = BINANCE_INTERVAL[timeframe];
  if (!interval) throw new Error(`Unsupported timeframe for Binance: ${timeframe}`);
  // Snapshot BEFORE fetching: a bar that closes between the Binance response
  // and the filter below must still be treated as open, or a partial OHLCV
  // gets locked into the never-overwrite store forever.
  const fetchStartTs = Date.now();
  const out: StoredCandle[] = [];
  let cursor = fromTs;
  while (cursor < toTs) {
    const url = `${BINANCE_BASE}?symbol=${pair}&interval=${interval}&limit=${BINANCE_PAGE}&startTime=${cursor}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance ${res.status} for ${pair} ${interval} @${cursor}: ${(await res.text()).slice(0, 200)}`);
    const rows = (await res.json()) as Array<[number, string, string, string, string, string, number, ...unknown[]]>;
    if (rows.length === 0) break;
    for (const r of rows) {
      out.push({
        timestamp: r[0],
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
        volume: Number(r[5]),
      });
    }
    const last = rows[rows.length - 1][0];
    if (last <= cursor) break; // no forward progress — bail rather than loop
    cursor = last + 1;
    if (rows.length < BINANCE_PAGE) break;
    await sleep(250); // friendly pacing, well under public rate limits
  }
  // Drop any bar not provably closed BEFORE the fetch started.
  const barMs = { H1: 3_600_000, H4: 14_400_000, D1: 86_400_000 }[timeframe]!;
  return out.filter((c) => c.timestamp + barMs <= fetchStartTs && c.timestamp <= toTs);
}

async function fetchStooqDaily(code: string, fromTs: number, toTs: number): Promise<StoredCandle[]> {
  const url = `https://stooq.com/q/d/l/?s=${code}&i=d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stooq ${res.status} for ${code}`);
  const csv = await res.text();
  const lines = csv.trim().split('\n').slice(1); // header: Date,Open,High,Low,Close,Volume
  const out: StoredCandle[] = [];
  for (const line of lines) {
    const [date, open, high, low, close, volume] = line.split(',');
    const ts = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(ts) || ts < fromTs || ts > toTs) continue;
    const o = Number(open), h = Number(high), l = Number(low), c = Number(close);
    if (![o, h, l, c].every(Number.isFinite)) continue;
    out.push({ timestamp: ts, open: o, high: h, low: l, close: c, volume: Number(volume) || 0 });
  }
  return out;
}

(async () => {
  const symbols = arg('symbols', 'BTCUSD,ETHUSD,SOLUSD').split(',').map((s) => s.trim().toUpperCase());
  const timeframes = arg('timeframes', 'H1,H4,D1').split(',').map((s) => s.trim().toUpperCase());
  const years = Number(arg('years', '2'));
  const outDir = arg('out-dir', '');
  const toTs = Date.now();
  const fromTs = toTs - years * 365.25 * 86_400_000;

  // --out-dir: file-dump mode for trainer input — no DB connection at all.
  const client = outDir ? null : await connect();
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  console.log(
    `backfill: ${symbols.join(',')} × ${timeframes.join(',')} over ${years}y` +
    (outDir ? ` → ${outDir} (file dump, no DB)` : ''),
  );

  try {
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          let candles: StoredCandle[] = [];
          let source = '';
          if (BINANCE_MAP[symbol]) {
            candles = await fetchBinance(BINANCE_MAP[symbol], timeframe, fromTs, toTs);
            source = 'binance';
          } else if (STOOQ_MAP[symbol]) {
            if (timeframe !== 'D1') {
              console.log(`  ${symbol} ${timeframe}: skipped (Stooq backfill is D1-only)`);
              continue;
            }
            candles = await fetchStooqDaily(STOOQ_MAP[symbol], fromTs, toTs);
            source = 'stooq';
          } else {
            console.log(`  ${symbol}: no provider mapping — skipped`);
            continue;
          }
          if (client) {
            const inserted = await upsertCandles(client, symbol, timeframe, source, candles);
            const cov = await getCoverage(client, symbol, timeframe);
            console.log(
              `  ${symbol} ${timeframe}: fetched=${candles.length} new=${inserted} stored=${cov.count}` +
              (cov.minTs ? ` range=${new Date(cov.minTs).toISOString().slice(0, 10)}→${new Date(cov.maxTs!).toISOString().slice(0, 10)}` : ''),
            );
          } else {
            const outPath = path.join(outDir, `${symbol}-${timeframe}.json`);
            fs.writeFileSync(outPath, JSON.stringify({ symbol, timeframe, source, candles }));
            const range = candles.length > 0
              ? ` range=${new Date(candles[0].timestamp).toISOString().slice(0, 10)}→${new Date(candles[candles.length - 1].timestamp).toISOString().slice(0, 10)}`
              : '';
            console.log(`  ${symbol} ${timeframe}: fetched=${candles.length} → ${outPath}${range}`);
          }
        } catch (err) {
          console.error(`  ${symbol} ${timeframe}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
          process.exitCode = 1;
        }
      }
    }
  } finally {
    if (client) await client.end();
  }
})().catch((err) => {
  console.error('backfill-candles failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

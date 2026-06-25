/**
 * Backfill Binance USDT-perp funding-rate history (engine-makeover Phase 5,
 * Track A) into the funding_rates store (migration 052) or per-symbol JSON
 * dumps. Mirrors backfill-candles.ts: idempotent (ON CONFLICT DO NOTHING),
 * paginated, polite to the API.
 *
 * Source: GET https://fapi.binance.com/fapi/v1/fundingRate
 *   params symbol, startTime, endTime, limit (max 1000); returns
 *   [{symbol, fundingTime, fundingRate, markPrice}] oldest-first.
 *   Funding intervals vary by symbol/era (8h, some 4h) — events are stored
 *   AS THEY OCCURRED; nothing assumes a fixed interval.
 *
 * Usage (DB mode):
 *   railway run --service Postgres npx tsx scripts/research/backfill-funding.ts \
 *     --symbols BTCUSD,ETHUSD --from 2019-09-01
 * Usage (dump mode, no DB needed — the carry-validation input path):
 *   npx tsx scripts/research/backfill-funding.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD,BNBUSD,XRPUSD,ADAUSD,DOGEUSD,DOTUSD,LINKUSD,AVAXUSD \
 *     --from 2019-09-01 --out-dir data/research/funding
 */

import fs from 'fs';
import path from 'path';
import { connect, upsertFundingEvents, getFundingCoverage, type StoredFundingEvent } from './funding-db';

const FAPI_BASE = 'https://fapi.binance.com/fapi/v1/fundingRate';
const PAGE = 1000;

/** Canonical TradeClaw symbol -> Binance USDT-perp pair (same 10 majors as BINANCE_MAP). */
const PERP_MAP: Record<string, string> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT', AVAXUSD: 'AVAXUSDT',
};

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FapiFundingRow {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  markPrice?: string;
}

async function fetchFunding(pair: string, fromTs: number, toTs: number): Promise<StoredFundingEvent[]> {
  const out: StoredFundingEvent[] = [];
  let cursor = fromTs;
  for (;;) {
    const url = `${FAPI_BASE}?symbol=${pair}&startTime=${cursor}&endTime=${toTs}&limit=${PAGE}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`fapi ${res.status} for ${pair} at cursor ${new Date(cursor).toISOString()}: ${(await res.text()).slice(0, 200)}`);
    }
    const rows = (await res.json()) as FapiFundingRow[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      const rate = Number(r.fundingRate);
      if (!Number.isFinite(rate)) continue; // malformed row — skip, never fabricate
      const mark = r.markPrice !== undefined && r.markPrice !== '' ? Number(r.markPrice) : null;
      out.push({ ts: r.fundingTime, rate, markPrice: mark !== null && Number.isFinite(mark) ? mark : null });
    }
    const last = rows[rows.length - 1].fundingTime;
    if (rows.length < PAGE || last >= toTs) break;
    if (last < cursor) break; // no forward progress guard
    cursor = last + 1;
    await sleep(250); // polite pacing, same spirit as backfill-candles
  }
  return out;
}

(async () => {
  const symbols = arg('symbols', Object.keys(PERP_MAP).join(',')).split(',').map((s) => s.trim().toUpperCase());
  const fromTs = Date.parse(arg('from', '2019-09-01'));
  const toTs = arg('to', '') ? Date.parse(arg('to', '')) : Date.now();
  const outDir = arg('out-dir', '');

  if (!Number.isFinite(fromTs)) { console.error('--from must be an ISO date'); process.exit(2); }
  if (arg('to', '') && !Number.isFinite(toTs)) { console.error('--to must be an ISO date'); process.exit(2); }

  const client = outDir ? null : await connect();
  try {
    for (const symbol of symbols) {
      const pair = PERP_MAP[symbol];
      if (!pair) { console.error(`no perp mapping for ${symbol} — skipped`); continue; }
      const events = await fetchFunding(pair, fromTs, toTs);
      if (outDir) {
        fs.mkdirSync(outDir, { recursive: true });
        const file = path.join(outDir, `${symbol}-funding.json`);
        fs.writeFileSync(file, JSON.stringify({ symbol, source: 'binance-fapi', events }, null, 2));
        console.log(`${symbol}: ${events.length} events → ${file} (${events.length ? new Date(events[0].ts).toISOString().slice(0, 10) + '→' + new Date(events[events.length - 1].ts).toISOString().slice(0, 10) : 'EMPTY'})`);
      } else if (client) {
        const inserted = await upsertFundingEvents(client, symbol, 'binance-fapi', events);
        const cov = await getFundingCoverage(client, symbol);
        console.log(`${symbol}: fetched ${events.length}, new ${inserted}, coverage ${cov.count} rows ${cov.minTs ? new Date(cov.minTs).toISOString().slice(0, 10) : '-'}→${cov.maxTs ? new Date(cov.maxTs).toISOString().slice(0, 10) : '-'}`);
      }
    }
  } finally {
    if (client) await client.end();
  }
})().catch((err) => { console.error('backfill-funding failed:', err instanceof Error ? err.message : String(err)); process.exit(1); });

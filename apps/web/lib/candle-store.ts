/**
 * In-app access to the `candles` store — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * The research-side scripts/research/candle-db.ts is deliberately CLI-only
 * (own pg Client, DATABASE_PUBLIC_URL handling); this module is its in-app
 * counterpart over the shared db-pool. The append-only contract from
 * migration 049 applies here too: INSERTs use ON CONFLICT DO NOTHING so a
 * bar, once recorded, is never silently rewritten.
 */

import { query } from './db-pool';

const BINANCE_BASE = 'https://data-api.binance.vision/api/v3/klines';

/**
 * Latest closed H1 klines fetched per refresh (single page, ~2 days). Plenty
 * to bridge missed cron cycles; deeper history is the backfill script's job.
 */
const REFRESH_KLINE_LIMIT = 48;

const FETCH_TIMEOUT_MS = 10_000;

const H1_MS = 3_600_000;

// Canonical TradeClaw symbol -> Binance spot pair (market-data only).
// Copied from scripts/research/backfill-candles.ts (BINANCE_MAP), which is
// the source of truth for research backfills — keep the two in sync.
const BINANCE_MAP: Record<string, string> = {
  BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
  XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', DOTUSD: 'DOTUSDT',
  LINKUSD: 'LINKUSDT', AVAXUSD: 'AVAXUSDT',
};

/** The crypto symbols the regime writer classifies (all Binance-mapped). */
export const REGIME_CANDLE_UNIVERSE: readonly string[] = Object.freeze(
  Object.keys(BINANCE_MAP),
);

export interface StoredCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleRow {
  ts: string; // BIGINT comes back from pg as a string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Latest `limit` stored bars for a symbol/timeframe, returned ascending by ts. */
export async function getRecentCandles(
  symbol: string,
  timeframe: string,
  limit: number,
): Promise<StoredCandle[]> {
  const rows = await query<CandleRow>(
    `SELECT ts, open, high, low, close, volume
       FROM (
         SELECT ts, open, high, low, close, volume
           FROM candles
          WHERE symbol = $1 AND timeframe = $2
          ORDER BY ts DESC
          LIMIT $3
       ) latest
      ORDER BY ts ASC`,
    [symbol, timeframe, limit],
  );
  return rows.map((r) => ({
    timestamp: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

/**
 * Fetch the latest closed H1 klines for `symbol` from Binance and append the
 * new ones to the store. Returns the number of rows actually inserted.
 * Throws on HTTP/network failure — the caller owns per-symbol error policy.
 */
export async function refreshCandles(symbol: string): Promise<number> {
  const pair = BINANCE_MAP[symbol];
  if (!pair) throw new Error(`no Binance mapping for ${symbol}`);

  // Snapshot BEFORE fetching: a bar that closes between the Binance response
  // and the filter below must still be treated as open, or a partial OHLCV
  // gets locked into the never-overwrite store forever (same rationale as
  // backfill-candles.ts).
  const fetchStartTs = Date.now();

  const url = `${BINANCE_BASE}?symbol=${pair}&interval=1h&limit=${REFRESH_KLINE_LIMIT}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(
      `Binance ${res.status} for ${pair} 1h: ${(await res.text()).slice(0, 200)}`,
    );
  }
  const klines = (await res.json()) as Array<
    [number, string, string, string, string, string, ...unknown[]]
  >;

  // Drop any bar not provably closed BEFORE the fetch started.
  const closed = klines.filter((k) => k[0] + H1_MS <= fetchStartTs);
  if (closed.length === 0) return 0;

  const values: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  for (const k of closed) {
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
    params.push(symbol, 'H1', k[0], Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), Number(k[5]), 'binance');
  }

  // RETURNING reports only the rows actually inserted (conflict-skipped rows
  // are omitted), which yields the new-row count through db-pool's query API.
  const inserted = await query<{ ts: string }>(
    `INSERT INTO candles (symbol, timeframe, ts, open, high, low, close, volume, source)
     VALUES ${values.join(', ')}
     ON CONFLICT (symbol, timeframe, ts) DO NOTHING
     RETURNING ts`,
    params,
  );
  return inserted.length;
}

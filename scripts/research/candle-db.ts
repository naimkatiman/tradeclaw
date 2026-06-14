/**
 * Candle-store access for research scripts (engine-makeover Phase 2).
 *
 * Talks straight to the `candles` table (migration 049). Kept out of
 * apps/web on purpose: research runs are headless CLI processes; the web
 * app keeps its own live providers. Append-only: upserts never overwrite.
 */

import { Client } from 'pg';

export interface StoredCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function connect(): Promise<Client> {
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL (or DATABASE_PUBLIC_URL) is required — run via `railway run --service Postgres` or export it');
  }
  const client = new Client({
    connectionString: url,
    ssl: /\.railway\.internal/.test(url) ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  return client.connect().then(() => client);
}

/** Idempotent batch insert. Returns the number of NEW rows. */
export async function upsertCandles(
  client: Client,
  symbol: string,
  timeframe: string,
  source: string,
  candles: StoredCandle[],
): Promise<number> {
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < candles.length; i += BATCH) {
    const batch = candles.slice(i, i + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const c of batch) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(symbol, timeframe, c.timestamp, c.open, c.high, c.low, c.close, c.volume, source);
    }
    const res = await client.query(
      `INSERT INTO candles (symbol, timeframe, ts, open, high, low, close, volume, source)
       VALUES ${values.join(', ')}
       ON CONFLICT (symbol, timeframe, ts) DO NOTHING`,
      params,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

export async function getStoredCandles(
  client: Client,
  symbol: string,
  timeframe: string,
  fromTs: number,
  toTs: number,
): Promise<StoredCandle[]> {
  const res = await client.query(
    `SELECT ts, open, high, low, close, volume
       FROM candles
      WHERE symbol = $1 AND timeframe = $2 AND ts >= $3 AND ts <= $4
      ORDER BY ts ASC`,
    [symbol, timeframe, fromTs, toTs],
  );
  return res.rows.map((r) => ({
    timestamp: Number(r.ts),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

export async function getCoverage(
  client: Client,
  symbol: string,
  timeframe: string,
): Promise<{ count: number; minTs: number | null; maxTs: number | null }> {
  const res = await client.query(
    `SELECT COUNT(*)::int AS count, MIN(ts) AS min_ts, MAX(ts) AS max_ts
       FROM candles WHERE symbol = $1 AND timeframe = $2`,
    [symbol, timeframe],
  );
  const row = res.rows[0];
  return {
    count: row.count,
    minTs: row.min_ts !== null ? Number(row.min_ts) : null,
    maxTs: row.max_ts !== null ? Number(row.max_ts) : null,
  };
}

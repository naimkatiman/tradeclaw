/**
 * Funding-rate store access for research scripts (engine-makeover Phase 5).
 *
 * Talks straight to the `funding_rates` table (migration 052). Mirrors
 * candle-db.ts: research runs are headless CLI processes; append-only —
 * upserts never overwrite. Connection handling is candle-db's connect().
 */

import type { Client } from 'pg';
import { connect } from './candle-db';

export { connect };

export interface StoredFundingEvent {
  ts: number;
  rate: number;
  markPrice: number | null;
}

/** Idempotent batch insert. Returns the number of NEW rows. */
export async function upsertFundingEvents(
  client: Client,
  symbol: string,
  source: string,
  events: StoredFundingEvent[],
): Promise<number> {
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const e of batch) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(symbol, e.ts, e.rate, e.markPrice, source);
    }
    const res = await client.query(
      `INSERT INTO funding_rates (symbol, ts, rate, mark_price, source)
       VALUES ${values.join(', ')}
       ON CONFLICT (symbol, ts) DO NOTHING`,
      params,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

export async function getFundingEvents(
  client: Client,
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<StoredFundingEvent[]> {
  const res = await client.query(
    `SELECT ts, rate, mark_price
       FROM funding_rates
      WHERE symbol = $1 AND ts >= $2 AND ts <= $3
      ORDER BY ts ASC`,
    [symbol, fromTs, toTs],
  );
  return res.rows.map((r) => ({
    ts: Number(r.ts),
    rate: Number(r.rate),
    markPrice: r.mark_price !== null ? Number(r.mark_price) : null,
  }));
}

export async function getFundingCoverage(
  client: Client,
  symbol: string,
): Promise<{ count: number; minTs: number | null; maxTs: number | null }> {
  const res = await client.query(
    `SELECT COUNT(*)::int AS count, MIN(ts) AS min_ts, MAX(ts) AS max_ts
       FROM funding_rates WHERE symbol = $1`,
    [symbol],
  );
  const row = res.rows[0];
  return {
    count: row.count,
    minTs: row.min_ts !== null ? Number(row.min_ts) : null,
    maxTs: row.max_ts !== null ? Number(row.max_ts) : null,
  };
}

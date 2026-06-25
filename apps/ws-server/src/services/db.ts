import pg from 'pg';
import type { NormalizedTick } from '@tradeclaw/signals';

const { Pool } = pg;

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1_000;
const MAX_BUFFER_SIZE = 10_000;

export class DatabaseService {
  private pool: pg.Pool | null = null;
  private buffer: NormalizedTick[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  // Serializes flush(): only one INSERT runs at a time. A flush requested while
  // one is in flight sets the dirty flag, and the running flush loops once more
  // on completion. This prevents concurrent splices of a mutating buffer and
  // overlapping failure re-queues from duplicating or reordering rows.
  private flushing = false;
  private flushDirty = false;

  constructor(databaseUrl?: string) {
    if (!databaseUrl) return;

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  async ensureTable(): Promise<void> {
    if (!this.pool) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ticks (
        time TIMESTAMPTZ NOT NULL,
        symbol TEXT NOT NULL,
        bid NUMERIC,
        ask NUMERIC,
        mid NUMERIC,
        provider TEXT
      );
    `);

    // Try to create hypertable (TimescaleDB extension)
    try {
      await this.pool.query(`SELECT create_hypertable('ticks', 'time', if_not_exists => TRUE);`);
    } catch {
      // TimescaleDB extension might not be available — table still works as regular table
    }

    // Retention: drop data older than 7 days
    try {
      await this.pool.query(`SELECT add_retention_policy('ticks', INTERVAL '7 days', if_not_exists => TRUE);`);
    } catch {
      // Non-fatal
    }
  }

  addTick(tick: NormalizedTick): void {
    this.buffer.push(tick);
    if (this.buffer.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    // Serialize: if a flush is already running, mark dirty and let the running
    // flush pick up the newly buffered ticks on its next loop iteration.
    if (this.flushing) {
      this.flushDirty = true;
      return;
    }

    this.flushing = true;
    try {
      let ok = true;
      do {
        this.flushDirty = false;
        ok = await this.flushOnce();
        // Loop again only when more ticks arrived during the INSERT and the
        // last INSERT succeeded. On failure, stop and let the 1s interval retry
        // so a persistent DB outage can't spin a hot retry loop.
      } while (ok && this.flushDirty && this.buffer.length > 0);
    } finally {
      this.flushing = false;
    }
  }

  private async flushOnce(): Promise<boolean> {
    if (!this.pool || this.buffer.length === 0) return true;

    const batch = this.buffer.splice(0);

    const values: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const tick of batch) {
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(
        new Date(tick.timestamp).toISOString(),
        tick.symbol,
        tick.bid,
        tick.ask,
        tick.mid,
        tick.provider,
      );
    }

    try {
      await this.pool.query(
        `INSERT INTO ticks (time, symbol, bid, ask, mid, provider) VALUES ${values.join(', ')}`,
        params,
      );
      return true;
    } catch {
      // Re-add the failed batch at the front (it holds the oldest ticks), then
      // cap total buffer to prevent memory exhaustion by dropping the OLDEST
      // excess from the front — newer ticks are kept.
      this.buffer.unshift(...batch);
      if (this.buffer.length > MAX_BUFFER_SIZE) {
        this.buffer.splice(0, this.buffer.length - MAX_BUFFER_SIZE);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
    await this.pool?.end();
  }
}

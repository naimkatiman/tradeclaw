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
    if (!this.pool || this.buffer.length === 0) return;

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
    } catch {
      // Re-add failed batch, but cap total buffer to prevent memory exhaustion
      this.buffer.unshift(...batch);
      if (this.buffer.length > MAX_BUFFER_SIZE) {
        this.buffer.splice(MAX_BUFFER_SIZE);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
    await this.pool?.end();
  }
}

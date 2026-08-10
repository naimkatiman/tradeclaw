import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'apps/web/migrations/054_d1_alpha_ledger.sql'),
  'utf8',
);

describe('054 D1 alpha ledger migration', () => {
  it('creates one versioned portfolio row per bar with explicit evidence fields', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS d1_alpha_ledger');
    expect(migration).toContain('PRIMARY KEY (strategy_version, bar_ts)');
    expect(migration).toContain('canonical_payload');
    expect(migration).toContain('previous_hash');
    expect(migration).toContain('row_hash');
    expect(migration).toContain('strategy_liquidation_nav');
    expect(migration).toContain('benchmark_liquidation_nav');
    expect(migration).toContain('closed_trades_increment');
    expect(migration).toContain("CHECK (btc_source = 'binance')");
    expect(migration).toContain("CHECK (eth_source = 'binance')");
    expect(migration).toContain('canonical_payload ?& ARRAY[');
  });

  it('pins the frozen version and both predeclared fingerprints', () => {
    expect(migration).toContain("strategy_version = 'd1-slow-gate-v1-2026-08-09'");
    expect(migration).toContain(
      "rule_sha256 = 'a9c222a33f3e1e0c70e8fb5f0bfa930dc6433297d9dcb27ef2b825f08da3b171'",
    );
    expect(migration).toContain(
      "artifact_sha256 = '1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90'",
    );
  });

  it('rejects UPDATE and DELETE at the database layer', () => {
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON d1_alpha_ledger');
    expect(migration).toContain("d1_alpha_ledger is append-only; % is forbidden");
  });
});

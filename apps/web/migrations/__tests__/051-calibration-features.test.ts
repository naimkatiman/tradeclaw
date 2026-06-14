/**
 * Migration 051 (calibration features) — static SQL assertions.
 *
 * The migration runner (scripts/run-migrations.mjs) tracks applied files in a
 * _migrations table and skips already-applied ones, but the DDL itself must
 * ALSO be re-runnable (idempotent) and additive: every ADD COLUMN uses
 * IF NOT EXISTS, every new column is nullable with no DEFAULT (no backfill),
 * mirroring 048_broadcast_scope.sql per Phase 4 D4. Asserting on the SQL text
 * keeps that contract from silently regressing.
 */

import fs from 'fs';
import path from 'path';

const SQL_PATH = path.join(__dirname, '..', '051_calibration_features.sql');
const sql = fs.readFileSync(SQL_PATH, 'utf-8');

const EXPECTED_COLUMNS = [
  'pre_boost_confidence',
  'mtf_agreement',
  'confluence_bonus',
  'cost_estimate_pct',
];

describe('051_calibration_features.sql', () => {
  it('adds exactly the four expected columns', () => {
    const addColumnLines = sql
      .split('\n')
      .filter((l) => /ADD COLUMN/i.test(l));
    expect(addColumnLines).toHaveLength(EXPECTED_COLUMNS.length);
    for (const col of EXPECTED_COLUMNS) {
      expect(sql).toContain(col);
    }
  });

  it('is idempotent — every ADD COLUMN uses IF NOT EXISTS', () => {
    const addColumnLines = sql
      .split('\n')
      .filter((l) => /ADD COLUMN/i.test(l));
    for (const line of addColumnLines) {
      expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
    }
  });

  it('adds only nullable columns — no NOT NULL, no DEFAULT (no backfill)', () => {
    const addColumnLines = sql
      .split('\n')
      .filter((l) => /ADD COLUMN/i.test(l));
    for (const line of addColumnLines) {
      expect(line).not.toMatch(/NOT NULL/i);
      expect(line).not.toMatch(/DEFAULT/i);
    }
  });

  it('documents cost_estimate_pct as a percent-of-notional round-trip estimate', () => {
    // The unit + formula must be documented in the migration so downstream
    // readers (the calibrator) know what the number means.
    expect(sql).toMatch(/PERCENT OF NOTIONAL/i);
    expect(sql).toMatch(/2 \* \(feePctPerSide \+ slippagePctPerSide\)/);
    expect(sql).toMatch(/[Ff]unding.*EXCLUDED|EXCLUDED.*funding/i);
  });
});

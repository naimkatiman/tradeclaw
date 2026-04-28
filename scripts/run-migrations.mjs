#!/usr/bin/env node
// Idempotent migration runner for apps/web/migrations/*.sql.
//
// Tracks applied migrations in a `_migrations` table (filename + applied_at).
// Skips files already recorded; runs the rest in lexicographic order, each
// inside its own transaction. Fails loud on first error.
//
// Usage (local):     DATABASE_URL=... node scripts/run-migrations.mjs
// Usage (Railway):   railway run -s web -- node scripts/run-migrations.mjs
//
// Pass --pretend to preview the queue without executing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'apps', 'web', 'migrations');
const PRETEND = process.argv.includes('--pretend');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql') && !f.startsWith('earningsedge_'))
  .sort();

const earningsedge = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql') && f.startsWith('earningsedge_'))
  .sort();
files.push(...earningsedge); // EarningsEdge migrations after core

if (files.length === 0) {
  console.log('No .sql files in', MIGRATIONS_DIR);
  process.exit(0);
}

const c = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const applied = new Set(
  (await c.query(`SELECT filename FROM _migrations`)).rows.map((r) => r.filename),
);

const pending = files.filter((f) => !applied.has(f));

console.log(`Total: ${files.length}, applied: ${applied.size}, pending: ${pending.length}`);
if (pending.length === 0) {
  console.log('Nothing to do.');
  await c.end();
  process.exit(0);
}

if (PRETEND) {
  console.log('Pending (dry run):');
  pending.forEach((f) => console.log('  ', f));
  await c.end();
  process.exit(0);
}

let failed = false;
for (const f of pending) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
  process.stdout.write(`→ ${f} ... `);
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query(`INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [f]);
    await c.query('COMMIT');
    console.log('OK');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => undefined);
    console.error('FAILED');
    console.error('  ', err?.message ?? err);
    failed = true;
    break;
  }
}

await c.end();
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// Apply a single SQL file to DATABASE_URL using pg.
// Usage:
//   railway run --service web -- node scripts/apply-migration.mjs apps/web/migrations/013_user_scoped_webhooks.sql

import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql>');
  process.exit(2);
}
const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

const sql = fs.readFileSync(abs, 'utf-8');
const client = new Client({
  connectionString,
  ssl: connectionString.includes('railway.app') ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();
  console.log(`Applying ${file} to ${connectionString.replace(/:[^:@]*@/, ':***@')}`);
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('OK — migration applied.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('FAILED:', err?.message ?? err);
  process.exit(1);
} finally {
  await client.end();
}

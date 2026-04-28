#!/usr/bin/env node
// Read-only schema audit. Run via:
//   railway run -s web -- node scripts/check-schema.mjs
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL not set'); process.exit(2); }

const c = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await c.connect();

const all = (await c.query(
  `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
)).rows.map(r => r.tablename);
console.log('TABLES:', all.join(', '));

const want = [
  'users','subscriptions','telegram_invites','strategy_licenses',
  'strategy_license_grants','signal_history','live_signals',
  'contact_sales_inquiries','social_post_queue','price_alerts',
  'user_webhooks','paper_portfolios','paper_positions','paper_trades',
  'telegram_subscribers','signal_atr_telemetry',
];
const missing = want.filter(t => !all.includes(t));
console.log('MISSING:', missing.length ? missing.join(', ') : 'none');

const usersCols = (await c.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name='users' AND table_schema='public' ORDER BY column_name`
)).rows.map(r => r.column_name);
console.log('users.cols:', usersCols.join(','));

const shCols = (await c.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name='signal_history' AND table_schema='public' ORDER BY column_name`
)).rows.map(r => r.column_name);
console.log('signal_history.cols:', shCols.join(','));

const tierCk = (await c.query(
  `SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint
   WHERE conrelid='public.users'::regclass AND contype='c'`
)).rows.map(r => r.d);
console.log('users.checks:', JSON.stringify(tierCk));

await c.end();

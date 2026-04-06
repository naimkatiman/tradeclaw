# Supabase Setup Guide

Migrate TradeClaw from file-based JSON storage to **Supabase** (managed Postgres). Persistent data, real multi-user support, Row Level Security, and a built-in admin dashboard.

## Overview

By default, TradeClaw stores all data in `data/*.json` files. This works great for single-instance deployments and quick demos, but has limitations:

- Data is lost when containers restart (unless volumes are mounted)
- No concurrent write safety
- Performance degrades past ~10K records
- No built-in auth or access control

Supabase solves all of these with a managed Postgres database, automatic backups, and a web dashboard.

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier is fine)
- Node.js 18+
- A running TradeClaw instance (local or deployed)

## Quick Start (5 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com/dashboard/new](https://supabase.com/dashboard/new)
2. Create a new project (any region, free tier works)
3. Once created, go to **Settings > API** and copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 2. Run the Schema

Option A — SQL Editor (recommended):
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste the contents of [`supabase/schema.sql`](../supabase/schema.sql)
4. Click **Run**

Option B — CLI:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/schema.sql
```

This creates 20+ tables with proper indexes and constraints.

### 3. Set Environment Variables

Add these to your `.env.local` (or your deployment platform):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### 4. Migrate Existing Data

If you have existing `data/*.json` files:

```bash
# Preview what will be migrated (no writes)
node supabase/migrate.js --dry-run

# Run the migration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=ey... \
node supabase/migrate.js
```

The script reads every JSON data file and upserts into the corresponding Supabase table. It is **idempotent** — safe to run multiple times.

### 5. (Optional) Insert Seed Data

For a fresh instance with demo data:

1. Open **SQL Editor** in your Supabase dashboard
2. Paste the contents of [`supabase/seed.sql`](../supabase/seed.sql)
3. Click **Run**

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only, never expose to client) |

## Schema Reference

The schema creates these tables (see `supabase/schema.sql` for full DDL):

| Table | Source | Description |
|-------|--------|-------------|
| `api_keys` | `lib/api-keys.ts` | API key management and rate limiting |
| `api_key_usage` | `lib/api-keys.ts` | Per-key rate limit windows |
| `users` | `lib/user-wall.ts` | Community user wall entries |
| `signal_history` | `lib/signal-history.ts` | All trading signals with outcomes |
| `paper_portfolio_meta` | `lib/paper-trading.ts` | Paper trading balance |
| `paper_positions` | `lib/paper-trading.ts` | Open paper trading positions |
| `paper_trades` | `lib/paper-trading.ts` | Closed paper trades (history) |
| `paper_equity` | `lib/paper-trading.ts` | Equity curve data points |
| `webhooks` | `lib/webhooks.ts` | Webhook configurations |
| `webhook_deliveries` | `lib/webhooks.ts` | Webhook delivery log |
| `plugins` | `lib/plugin-system.ts` | Custom indicator plugins |
| `price_alerts` | `lib/price-alerts.ts` | Price alert rules |
| `waitlist` | `lib/waitlist.ts` | Waitlist with referral codes |
| `email_subscribers` | `lib/email-subscribers.ts` | Email notification subscribers |
| `telegram_subscribers` | `lib/telegram-subscribers.ts` | Telegram bot subscribers |
| `sms_subscribers` | `lib/sms-subscribers.ts` | SMS alert subscribers |
| `votes` | `lib/votes.ts` | Community pair votes (weekly) |
| `pledges` | `lib/pledges.ts` | Milestone pledge wall |
| `performance_metrics` | `lib/performance-metrics.ts` | System performance data (JSONB) |
| `tradingview_alerts` | `lib/tradingview-alerts.ts` | Incoming TradingView alerts |
| `push_subscriptions` | `lib/push-subscriptions.ts` | Web push notification subscriptions |
| `slack_integrations` | `lib/slack-integration.ts` | Slack webhook integrations |
| `slack_deliveries` | `lib/slack-integration.ts` | Slack delivery log |
| `broadcast_state` | `lib/telegram-broadcast.ts` | Telegram broadcast state |
| `app_users` | `lib/db.ts` | App users with Stripe/tier info |
| `subscriptions` | `lib/db.ts` | Stripe subscription records |
| `telegram_invites` | `lib/db.ts` | Telegram group invite links |

## Migration Script

```
node supabase/migrate.js              # migrate all data/*.json files
node supabase/migrate.js --dry-run    # preview without writing
node supabase/migrate.js --seed       # show seed data instructions
```

The script:
- Reads each `data/*.json` file
- Transforms camelCase fields to snake_case
- Handles nested structures (webhook deliveries, paper trading portfolio)
- Uses Supabase REST API with `upsert` (merge-duplicates)
- Batches in groups of 500 rows
- Reports per-table migration counts

### Handling Missing Files

If a JSON file doesn't exist, the script skips it with a "skipped (no file)" message. This is normal for fresh installs.

## Gradual Adoption

Currently, TradeClaw's lib files still read/write JSON files at runtime. The Supabase migration is a **data persistence layer** — your JSON data is copied into Postgres for durability.

Future versions will auto-detect `NEXT_PUBLIC_SUPABASE_URL` and use Postgres directly at runtime. For now, the migration script is the bridge.

## Row Level Security (RLS)

The schema includes commented-out RLS policies at the bottom. To enable for multi-tenant deployments:

```sql
-- Enable RLS on a table
ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;

-- Allow public reads
CREATE POLICY "Public read" ON signal_history
  FOR SELECT USING (true);

-- Restrict writes to service role
CREATE POLICY "Service insert" ON signal_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

## Deploy with Supabase

### Railway

1. Deploy TradeClaw on Railway: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
2. Add your Supabase env vars to the Railway service
3. Run schema.sql in your Supabase SQL Editor

### Railway

1. Deploy on Railway: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)
2. Add Supabase env vars in Railway project settings
3. Run schema.sql in your Supabase SQL Editor

## Troubleshooting

### "relation does not exist"
You haven't run `schema.sql` yet. Paste it into the Supabase SQL Editor and run it.

### "new row violates row-level security policy"
RLS is enabled but no policies allow the operation. Either disable RLS on the table or add appropriate policies (see RLS section above).

### "permission denied for table"
You're using the anon key instead of the service_role key for server-side operations. The migration script requires `SUPABASE_SERVICE_ROLE_KEY`.

### "could not connect to server"
Check that `NEXT_PUBLIC_SUPABASE_URL` is correct and your Supabase project is active (free projects pause after 7 days of inactivity).

## FAQ

**Can I use self-hosted Supabase?**
Yes. Set `NEXT_PUBLIC_SUPABASE_URL` to your self-hosted instance URL. Everything works the same.

**Does this replace the Docker Postgres from docker-compose.yml?**
No. The `DATABASE_URL` in docker-compose is used by the db.ts module (users, subscriptions, invites). Supabase is an additional persistence layer for the JSON-backed data. You can use both.

**What about the existing DATABASE_URL?**
Keep it. `DATABASE_URL` is used by Prisma/db.ts for user accounts and subscriptions. Supabase handles the 19 JSON-backed data stores.

**Is the free tier enough?**
Yes for most deployments. Supabase free tier includes 500 MB storage and 50K monthly active users. Signal history is the highest-volume table — at ~1KB per signal, you can store 500K+ signals on the free tier.

**Can I run migrate.js multiple times?**
Yes. It uses upsert with conflict resolution, so running it again just updates existing rows. No duplicates.

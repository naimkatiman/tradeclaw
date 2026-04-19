# Webhooks → Postgres Migration (user_id scoped)

Goal: replace file-backed `data/webhooks.json` with a user-scoped Postgres store so `collectServerData(userId)` can return the caller's own webhooks instead of `[]`.

## Files

- `apps/web/migrations/013_user_scoped_webhooks.sql` — new tables
- `apps/web/lib/webhooks.ts` — rewrite storage layer as async DB; keep delivery/fan-out logic intact
- `apps/web/lib/__tests__/webhooks-db.test.ts` — new, gated by `describeDb`
- `apps/web/lib/data-export.ts` — async `collectServerData`, real webhooks for userId case
- `apps/web/app/api/export/route.ts` — await the async call
- `apps/web/app/api/import/preview/route.ts` — await the async call (check)
- `apps/web/app/api/import/route.ts` — await the async call (check)
- `apps/web/app/api/webhooks/route.ts` — session-gated + userId-scoped GET/POST/PATCH/DELETE
- `apps/web/app/api/webhooks/[id]/route.ts` — ownership check on PATCH/DELETE
- `apps/web/app/api/webhooks/[id]/test/route.ts` — ownership check
- `apps/web/app/api/webhooks/[id]/deliveries/route.ts` — ownership check
- `apps/web/app/api/webhooks/test/route.ts` — ownership check
- `apps/web/app/api/webhooks/deliver/route.ts` — unchanged (internal, fans to all users)
- `apps/web/app/api/webhooks/dispatch/route.ts` — unchanged (internal)

## Schema

```sql
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  secret TEXT,
  pairs JSONB NOT NULL DEFAULT '"all"'::jsonb,
  min_confidence SMALLINT NOT NULL DEFAULT 0 CHECK (min_confidence BETWEEN 0 AND 100),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = TRUE;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_code INTEGER,
  success BOOLEAN NOT NULL,
  attempt INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_whid_ts
  ON webhook_deliveries(webhook_id, timestamp DESC);
```

## Contract changes

- All read/write functions become `async` returning `Promise<T>`.
- `readWebhooks(userId: string)` — scoped to the caller. No more no-arg form.
- `readAllEnabledForDispatch()` — new, internal only, returns enabled rows across all users. Used by `dispatchToAll`.
- `addWebhook({ userId, ... })` — takes `userId` in opts.
- `removeWebhook({ userId, id })` — `DELETE WHERE id = $1 AND user_id = $2`. Returns false if mismatch.
- `updateWebhook({ userId, id }, patch)` — same ownership clause.
- `getWebhookDeliveries({ userId, id })` — same.
- `appendDeliveryLog(id, entry)` — inserts into `webhook_deliveries`, increments counters. No user check (delivery runs in dispatch context).

## Verification

1. `npx tsc --noEmit` — clean
2. `npx jest apps/web/lib` — existing suites green; new webhooks-db suite skipped (no DATABASE_URL locally)
3. Manual: user applies SQL to Railway, then:
   - `curl -i -b "tc_user_session=..." /api/webhooks` → 200 with own rows
   - Same curl with no session → 401
   - Cross-user: create wh as A, try DELETE with B's session → 404

## Out of scope

- Backfilling any rows from `data/webhooks.json` — production doesn't persist the file across Railway deploys, so no legacy data. New Postgres table starts empty.
- Encrypting `secret` at rest — currently stored plaintext on disk, keeping plaintext in DB for parity. Separate follow-up.

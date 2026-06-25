-- Operator memory subsystem — per-user persistent key/value store backed by
-- JSONB. Phase A of TC-171 (AI Operator Dashboard, see STATE.yaml).
--
-- Use cases (Phase B+): operator preferences, pinned watchlists, alert
-- history, free-form notes. Each row is one (user_id, key) addressable slot
-- holding an arbitrary JSON document — callers are responsible for shape.
--
-- Callers:
--   apps/web/lib/operator-memory.ts        → typed CRUD helpers
--   apps/web/app/api/operator/memory/...   → admin-session GET/PUT/DELETE
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/032_operator_memory.sql
--
-- Idempotent (CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS operator_memory (
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT         NOT NULL,
  value      JSONB        NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_operator_memory_user
  ON operator_memory (user_id);

CREATE INDEX IF NOT EXISTS idx_operator_memory_updated_at
  ON operator_memory (updated_at DESC);

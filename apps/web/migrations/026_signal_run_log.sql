-- signal_run_log: per-cron-run audit row.
--
-- Today the .github/workflows/signal-log.yml cron commits a JSON snapshot of
-- signal_history to data/signal-log.json on every run, 4× daily. The commits
-- pollute main and slow CI diffs (TC daily intel 2026-05-04 item #2).
--
-- The marketing claim "each commit proves signals existed before outcomes were
-- known" is preserved here by writing one immutable row per cron run with:
--   * UTC timestamp of the run
--   * Cumulative counts at run-time (total / verified / wins)
--   * SHA-256 of the canonicalised signal_history snapshot at run-time
-- The hash makes after-the-fact tampering of signal_history detectable: anyone
-- can re-hash the rows that existed at run_started_at and compare.
--
-- This migration is *additive only*. The GitHub Actions workflow is NOT
-- removed by this change — that decision is gated on a separate sign-off
-- (see Today's Daily Intel item #2). Once removed, this table becomes the
-- canonical source for "did this signal exist at time T".
--
-- Apply on Railway with:
--   psql "$DATABASE_URL" -f apps/web/migrations/026_signal_run_log.sql
-- (or via the run-migrations.mjs runner on the next next-start cycle).

CREATE TABLE IF NOT EXISTS signal_run_log (
  id                BIGSERIAL PRIMARY KEY,
  run_started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_finished_at   TIMESTAMPTZ,

  -- Counts captured at run time
  total_signals     INTEGER NOT NULL DEFAULT 0,
  verified_signals  INTEGER NOT NULL DEFAULT 0,
  win_count         INTEGER NOT NULL DEFAULT 0,
  loss_count        INTEGER NOT NULL DEFAULT 0,
  pending_count     INTEGER NOT NULL DEFAULT 0,

  -- Tamper-evidence: hash over canonicalised signal_history rows that
  -- existed at run_started_at. See lib/signal-run-log.ts for the exact
  -- canonical form (sorted keys, no whitespace, ISO-8601 timestamps).
  history_sha256    TEXT,

  -- Free-form notes for ops (e.g. "first run after migration",
  -- "skipped — outage 03:14 UTC"). Bounded so it cannot bloat row size.
  notes             TEXT CHECK (notes IS NULL OR length(notes) <= 1024),

  -- Trigger source: "github-actions", "vercel-cron", "manual", etc.
  trigger_source    TEXT NOT NULL DEFAULT 'unknown'
);

-- Recent runs for the public verification page.
CREATE INDEX IF NOT EXISTS idx_signal_run_log_started
  ON signal_run_log (run_started_at DESC);

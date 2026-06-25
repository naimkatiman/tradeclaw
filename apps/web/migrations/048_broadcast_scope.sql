-- 048: Broadcast-scope recording (engine-makeover Phase 1).
--
-- Records the regime + winning-cells + risk-pipeline decision that shapes the
-- Pro broadcast AT EMISSION TIME, so the broadcast-filtered subset becomes
-- measurable. Until now the cron recorded the raw firehose and only
-- console-warned the gate decision — the Pro-deployed strategy's performance
-- was never recorded (docs/plans/2026-06-10-engine-makeover.md, Phase 1;
-- PR #110 deferred item 1).
--
-- All columns nullable, no backfill: NULL = "decision not recorded at
-- emission" (pre-migration rows). FALSE = decision ran and approved for
-- broadcast. TRUE = decision ran and blocked.

ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS regime VARCHAR(16);
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS broadcast_blocked BOOLEAN;
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS broadcast_block_reason TEXT;
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS allocation_pct REAL;

-- Wall-clock publish stamp, distinct from the writer-supplied bar-time
-- created_at. Added WITHOUT a default first: ADD COLUMN ... DEFAULT NOW()
-- (now() is STABLE in PG>=11, no rewrite) would take the attmissingval fast
-- path and stamp the single migration-time value onto ALL existing rows —
-- falsifying history. Split this way, existing rows stay NULL and the
-- catalog-only SET DEFAULT applies to future inserts only.
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE signal_history ALTER COLUMN published_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_signal_history_broadcast
  ON signal_history (broadcast_blocked, created_at DESC)
  WHERE broadcast_blocked IS NOT NULL;

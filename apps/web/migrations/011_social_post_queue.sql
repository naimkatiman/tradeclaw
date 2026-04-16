-- Social post approval queue for automated X/Twitter posting.
-- Posts are enqueued when signals are recorded or summaries generated,
-- then approved/rejected via admin UI before posting.

CREATE TABLE IF NOT EXISTS social_post_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('signal', 'daily_summary', 'weekly_summary')),
  signal_id     TEXT REFERENCES signal_history(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  image_url     TEXT,
  copy          TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'rejected')),
  post_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  posted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_queue_status ON social_post_queue (status) WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS idx_social_queue_created ON social_post_queue (created_at DESC);

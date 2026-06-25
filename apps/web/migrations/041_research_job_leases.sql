ALTER TABLE research_jobs
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_token TEXT,
  ADD COLUMN IF NOT EXISTS leased_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_research_jobs_queue_ready
  ON research_jobs (status, next_attempt_at, lease_expires_at, created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_research_jobs_lease_token
  ON research_jobs (lease_token)
  WHERE lease_token IS NOT NULL;

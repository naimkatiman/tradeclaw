CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'H1',
  requested_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'queued',
  analyses JSONB DEFAULT '[]',
  final_verdict JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs (status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_user ON research_jobs (requested_by, created_at DESC);

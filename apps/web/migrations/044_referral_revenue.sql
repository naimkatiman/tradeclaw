-- Migration 044: Referral revenue tracking for 20% revenue-share program
-- ROADMAP 4.3 — Affiliate/Referral Program

CREATE TABLE IF NOT EXISTS referral_revenue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  amount_cents    INT NOT NULL,
  share_cents     INT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid_out', 'cancelled')),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (referred_id, stripe_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_revenue_referrer ON referral_revenue(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_revenue_referred ON referral_revenue(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_revenue_status ON referral_revenue(status);

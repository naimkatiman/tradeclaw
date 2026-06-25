-- Referral tracking for TradeClaw Pro subscriptions
-- Adds referred_by to users and a referral_rewards tracking table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type  VARCHAR(20) NOT NULL CHECK (reward_type IN ('trial_extension', 'subscription_credit')),
  reward_value INT NOT NULL DEFAULT 7, -- days
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  applied_at   TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);

-- Migration 043: Add referral_code to users for affiliate program
-- ROADMAP 4.3 — Affiliate/Referral Program

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

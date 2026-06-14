/**
 * Database access layer — backed by PostgreSQL via db-pool.
 *
 * Maps to the schema in migrations/001_monetization.sql.
 */

import { query, queryOne, execute } from './db-pool';
import { randomBytes } from 'node:crypto';

/**
 * E2E test gate — same shape as the one in tier.ts. When all three conditions
 * hold, the read-side user/subscription helpers return a synthetic Pro record
 * for the configured test userId so Playwright suites that forge an HMAC
 * session cookie can hit /api/auth/session without a real DB row.
 *
 * Hard-gated by NODE_ENV !== 'production' so the bypass cannot ship live.
 */
function isE2EProUser(userId: string): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.E2E_FORCE_PRO_TIER === 'true' &&
    userId === (process.env.E2E_PRO_USER_ID ?? 'e2e-pro-user')
  );
}

const E2E_STUB_EMAIL = 'e2e-pro@tradeclaw.test';

export interface UserRecord {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  tier: 'free' | 'pro' | 'elite' | 'custom';
  tierExpiresAt: Date | null;
  telegramUserId: bigint | null;
  displayName: string | null;
  avatarUrl: string | null;
  authProvider: 'google' | 'github' | 'telegram' | null;
  referralCode: string | null;
  referredBy: string | null;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  tier: 'pro' | 'elite';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  trialReminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramInviteRecord {
  id: string;
  userId: string;
  tier: 'pro' | 'elite';
  inviteLink: string;
  telegramChatId: bigint;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

// ---------------------------------------------------------------------------
// Row → Record mappers
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  tier: string;
  tier_expires_at: string | null;
  telegram_user_id: string | null;
  name: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  referral_code: string | null;
  referred_by: string | null;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    tier: row.tier as UserRecord['tier'],
    tierExpiresAt: row.tier_expires_at ? new Date(row.tier_expires_at) : null,
    telegramUserId: row.telegram_user_id ? BigInt(row.telegram_user_id) : null,
    displayName: row.name,
    avatarUrl: row.avatar_url,
    authProvider:
      row.auth_provider === 'google' ||
      row.auth_provider === 'github' ||
      row.auth_provider === 'telegram'
        ? row.auth_provider
        : null,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
  };
}

const USER_COLUMNS = `id, email, stripe_customer_id, tier, tier_expires_at,
  telegram_user_id, name, avatar_url, auth_provider, referral_code, referred_by`;

interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  tier: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  trial_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function toSubscriptionRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeCustomerId: row.stripe_customer_id,
    tier: row.tier as SubscriptionRecord['tier'],
    status: row.status as SubscriptionRecord['status'],
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    trialReminderSentAt: row.trial_reminder_sent_at ? new Date(row.trial_reminder_sent_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const SUBSCRIPTION_COLUMNS = `id, user_id, stripe_subscription_id, stripe_customer_id,
  tier, status, current_period_start, current_period_end, cancel_at_period_end,
  trial_end, trial_reminder_sent_at, created_at, updated_at`;

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<UserRecord | null> {
  if (isE2EProUser(userId)) {
    return {
      id: userId,
      email: E2E_STUB_EMAIL,
      stripeCustomerId: null,
      tier: 'pro',
      tierExpiresAt: null,
      telegramUserId: null,
      displayName: 'E2E Pro User',
      avatarUrl: null,
      authProvider: null,
      referralCode: null,
      referredBy: null,
    };
  }
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  );
  return row ? toUserRecord(row) : null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return row ? toUserRecord(row) : null;
}

/**
 * Find-or-create a user by email. Used by the passwordless session flow so
 * first-time visitors get a row on their first signin attempt.
 */
function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function upsertUserByEmail(email: string): Promise<UserRecord> {
  const normalized = email.trim().toLowerCase();
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, referral_code)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING ${USER_COLUMNS}`,
    [normalized, generateReferralCode()],
  );
  if (!row) throw new Error('upsertUserByEmail: insert returned no row');
  return toUserRecord(row);
}

export interface UserProfileInput {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  /**
   * Provider used for THIS sign-in. Only persisted on the first row insert —
   * we never overwrite an existing auth_provider so the UI doesn't flip
   * between Google and GitHub when the same email signs in via both.
   */
  authProvider: 'google' | 'github';
}

/**
 * Find-or-create a user by email and refresh their profile fields. Display
 * name and avatar mirror what the provider returned on this sign-in — so a
 * user who changes their Google photo gets the new one (and a user who
 * removes it gets a null, which the UserMenu falls back to initials for).
 *
 * `auth_provider` is set only when the row is first created; subsequent
 * sign-ins via a different provider don't overwrite it (avoids confusing
 * "via google" / "via github" flips when the same email signs in via both).
 */
export async function upsertUserProfile(input: UserProfileInput): Promise<UserRecord> {
  const normalized = input.email.trim().toLowerCase();
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, name, avatar_url, auth_provider, referral_code)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       name       = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()
     RETURNING ${USER_COLUMNS}`,
    [normalized, input.displayName, input.avatarUrl, input.authProvider, generateReferralCode()],
  );
  if (!row) throw new Error('upsertUserProfile: insert returned no row');
  return toUserRecord(row);
}

export interface TelegramUserInput {
  telegramUserId: bigint;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Find-or-create a user from Telegram Login Widget data.
 *
 * Telegram does not always provide an email, so we use a deterministic
 * synthetic email (`telegram_<id>@tradeclaw.local`) to satisfy the NOT NULL
 * UNIQUE constraint. If a user with this telegram_user_id already exists we
 * update their name/avatar; otherwise we insert a new row.
 */
export async function upsertTelegramUser(
  input: TelegramUserInput,
): Promise<UserRecord> {
  const email = `telegram_${input.telegramUserId.toString()}@tradeclaw.local`;
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, name, avatar_url, auth_provider, telegram_user_id, referral_code)
     VALUES ($1, $2, $3, 'telegram', $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       name             = EXCLUDED.name,
       avatar_url       = EXCLUDED.avatar_url,
       telegram_user_id = EXCLUDED.telegram_user_id,
       updated_at       = NOW()
     RETURNING ${USER_COLUMNS}`,
    [email, input.displayName, input.avatarUrl, input.telegramUserId.toString(), generateReferralCode()],
  );
  if (!row) throw new Error('upsertTelegramUser: insert returned no row');
  return toUserRecord(row);
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE stripe_customer_id = $1`,
    [stripeCustomerId],
  );
  return row ? toUserRecord(row) : null;
}

export async function updateUserStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await execute(
    `UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
    [stripeCustomerId, userId],
  );
}

export async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'elite' | 'custom',
  tierExpiresAt: Date | null,
): Promise<void> {
  await execute(
    `UPDATE users SET tier = $1, tier_expires_at = $2, updated_at = NOW() WHERE id = $3`,
    [tier, tierExpiresAt, userId],
  );
}

export async function linkTelegramUser(
  userId: string,
  telegramUserId: bigint,
): Promise<void> {
  await execute(
    `UPDATE users SET telegram_user_id = $1, updated_at = NOW() WHERE id = $2`,
    [telegramUserId.toString(), userId],
  );
}

export async function getUserByTelegramId(
  telegramUserId: bigint,
): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE telegram_user_id = $1`,
    [telegramUserId.toString()],
  );
  return row ? toUserRecord(row) : null;
}

// ---------------------------------------------------------------------------
// Subscription operations
// ---------------------------------------------------------------------------

export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionRecord | null> {
  if (isE2EProUser(userId)) {
    return null; // Stub user has no real Stripe sub — null is the documented
    // shape for "no active subscription" and avoids the route hitting DB at all.
  }
  const row = await queryOne<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions
     WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return row ? toSubscriptionRecord(row) : null;
}

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRecord | null> {
  const row = await queryOne<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
  return row ? toSubscriptionRecord(row) : null;
}

export async function upsertSubscription(
  data: Omit<SubscriptionRecord, 'id' | 'trialReminderSentAt' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  await execute(
    `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id, tier, status,
        current_period_start, current_period_end, cancel_at_period_end, trial_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (stripe_subscription_id)
     DO UPDATE SET
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       trial_end = EXCLUDED.trial_end,
       updated_at = NOW()`,
    [
      data.userId,
      data.stripeSubscriptionId,
      data.stripeCustomerId,
      data.tier,
      data.status,
      data.currentPeriodStart,
      data.currentPeriodEnd,
      data.cancelAtPeriodEnd,
      data.trialEnd,
    ],
  );
}

export async function setTrialEnd(
  stripeSubscriptionId: string,
  trialEnd: Date | null,
): Promise<void> {
  await execute(
    `UPDATE subscriptions SET trial_end = $1, updated_at = NOW()
     WHERE stripe_subscription_id = $2`,
    [trialEnd, stripeSubscriptionId],
  );
}

/**
 * Returns trialing subscriptions whose trial ends within the given window
 * AND haven't received a reminder yet. Used by /api/cron/trial-reminders.
 */
export async function getTrialingExpiringWithin(
  hoursFrom: number,
  hoursTo: number,
): Promise<SubscriptionRecord[]> {
  const rows = await query<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions
     WHERE status = 'trialing'
       AND trial_end IS NOT NULL
       AND trial_end BETWEEN NOW() + ($1 || ' hours')::interval
                         AND NOW() + ($2 || ' hours')::interval
       AND trial_reminder_sent_at IS NULL`,
    [hoursFrom, hoursTo],
  );
  return rows.map(toSubscriptionRecord);
}

export async function getTrialingMissingTrialEnd(): Promise<SubscriptionRecord[]> {
  const rows = await query<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions
     WHERE status = 'trialing' AND trial_end IS NULL`,
  );
  return rows.map(toSubscriptionRecord);
}

export async function markTrialReminderSent(stripeSubscriptionId: string): Promise<void> {
  await execute(
    `UPDATE subscriptions SET trial_reminder_sent_at = NOW(), updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
}

/**
 * Trialing subs in the T-3d window that haven't received the T-3d email.
 * Mirrors getTrialingExpiringWithin but predicates on the new column added
 * in migration 029 so the T-1d and T-3d sweeps stay independent.
 */
export async function getTrialingExpiringT3D(
  hoursFrom: number,
  hoursTo: number,
): Promise<SubscriptionRecord[]> {
  const rows = await query<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLUMNS}
     FROM subscriptions
     WHERE status = 'trialing'
       AND trial_end IS NOT NULL
       AND trial_end BETWEEN NOW() + ($1 || ' hours')::interval
                         AND NOW() + ($2 || ' hours')::interval
       AND trial_reminder_t3d_sent_at IS NULL`,
    [hoursFrom, hoursTo],
  );
  return rows.map(toSubscriptionRecord);
}

export async function markTrialReminderT3DSent(stripeSubscriptionId: string): Promise<void> {
  await execute(
    `UPDATE subscriptions SET trial_reminder_t3d_sent_at = NOW(), updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  await execute(
    `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: SubscriptionRecord['status'],
  currentPeriodEnd?: Date,
): Promise<void> {
  if (currentPeriodEnd) {
    await execute(
      `UPDATE subscriptions
       SET status = $1, current_period_end = $2, updated_at = NOW()
       WHERE stripe_subscription_id = $3`,
      [status, currentPeriodEnd, stripeSubscriptionId],
    );
  } else {
    await execute(
      `UPDATE subscriptions SET status = $1, updated_at = NOW()
       WHERE stripe_subscription_id = $2`,
      [status, stripeSubscriptionId],
    );
  }
}

// ---------------------------------------------------------------------------
// Stripe webhook idempotency ledger
// ---------------------------------------------------------------------------

/**
 * Try to claim a Stripe event id for processing. Returns `true` when the row
 * was inserted (this caller owns the work) and `false` when another delivery
 * already recorded the event (caller should short-circuit).
 *
 * Uses INSERT … ON CONFLICT DO NOTHING and inspects rowCount to avoid an
 * unnecessary SELECT round-trip.
 */
export async function tryClaimStripeEvent(
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const client = await (await import('./db-pool')).getPool().connect();
  try {
    const result = await client.query(
      `INSERT INTO processed_stripe_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType],
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

/**
 * Release a previously-claimed event id so Stripe's next retry can re-enter
 * the handler. Used by the webhook when a handler throws — without this, the
 * dedup gate would short-circuit every retry and the work would be lost.
 */
export async function releaseStripeEvent(eventId: string): Promise<void> {
  await execute(
    `DELETE FROM processed_stripe_events WHERE event_id = $1`,
    [eventId],
  );
}

// ---------------------------------------------------------------------------
// Telegram invite operations
// ---------------------------------------------------------------------------

/**
 * Count invites created for a user within the last N seconds. Used by the
 * resend-invite endpoint to rate-limit a paying user from spamming the
 * createChatInviteLink call and minting bulk single-use links to share with
 * non-payers.
 */
export async function countRecentTelegramInvites(
  userId: string,
  withinSeconds: number,
): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM telegram_invites
      WHERE user_id = $1
        AND created_at > NOW() - ($2 || ' seconds')::interval`,
    [userId, withinSeconds],
  );
  return row ? Number(row.count) : 0;
}

export async function createTelegramInvite(
  data: Omit<TelegramInviteRecord, 'id' | 'createdAt'>,
): Promise<void> {
  await execute(
    `INSERT INTO telegram_invites
       (user_id, tier, invite_link, telegram_chat_id, is_active, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.userId,
      data.tier,
      data.inviteLink,
      data.telegramChatId.toString(),
      data.isActive,
      data.expiresAt,
    ],
  );
}

/**
 * Most recent invite row for the user, regardless of tier or active flag.
 * Powers the dashboard badge: present + active + not expired = "Sent".
 * Absent = "Pending" for paying users (between checkout and webhook), or
 * "Connect Telegram" prompt when the user has not linked yet.
 */
export async function getLatestUserTelegramInvite(
  userId: string,
): Promise<TelegramInviteRecord | null> {
  interface InviteRow {
    id: string;
    user_id: string;
    tier: string;
    invite_link: string;
    telegram_chat_id: string;
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
  }

  const row = await queryOne<InviteRow>(
    `SELECT id, user_id, tier, invite_link, telegram_chat_id, is_active, created_at, expires_at
       FROM telegram_invites
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );

  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier as 'pro' | 'elite',
    inviteLink: row.invite_link,
    telegramChatId: BigInt(row.telegram_chat_id),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  };
}

export async function deactivateUserTelegramInvites(
  userId: string,
  tier: 'pro' | 'elite',
): Promise<TelegramInviteRecord[]> {
  interface InviteRow {
    id: string;
    user_id: string;
    tier: string;
    invite_link: string;
    telegram_chat_id: string;
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
  }

  const rows = await query<InviteRow>(
    `UPDATE telegram_invites
     SET is_active = FALSE
     WHERE user_id = $1 AND tier = $2 AND is_active = TRUE
     RETURNING id, user_id, tier, invite_link, telegram_chat_id, is_active, created_at, expires_at`,
    [userId, tier],
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    tier: row.tier as 'pro' | 'elite',
    inviteLink: row.invite_link,
    telegramChatId: BigInt(row.telegram_chat_id),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  }));
}

// ---------------------------------------------------------------------------
// Pro email grants (admin-granted Pro outside Stripe)
// Maps to migrations/020_pro_email_grants.sql
// ---------------------------------------------------------------------------

export interface ProEmailGrantRecord {
  id: string;
  email: string;
  grantedBy: string;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

interface ProEmailGrantRow {
  id: string;
  email: string;
  granted_by: string;
  note: string | null;
  expires_at: string | null;
  created_at: string;
}

function toProEmailGrantRecord(row: ProEmailGrantRow): ProEmailGrantRecord {
  return {
    id: row.id,
    email: row.email,
    grantedBy: row.granted_by,
    note: row.note,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Insert a new active grant for an email. If the email already has an
 * active grant we return its row instead of inserting a duplicate. Re-
 * granting after a revoke creates a new row so the audit trail is preserved.
 */
export async function addProEmailGrant(
  email: string,
  grantedBy: string,
  note: string | null,
  expiresAt: Date | null,
): Promise<ProEmailGrantRecord> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('addProEmailGrant: empty email');

  const existing = await queryOne<ProEmailGrantRow>(
    `SELECT id, email, granted_by, note, expires_at::text, created_at::text
     FROM pro_email_grants
     WHERE LOWER(email) = $1 AND revoked_at IS NULL
     LIMIT 1`,
    [normalized],
  );
  if (existing) return toProEmailGrantRecord(existing);

  const row = await queryOne<ProEmailGrantRow>(
    `INSERT INTO pro_email_grants (email, granted_by, note, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, granted_by, note, expires_at::text, created_at::text`,
    [normalized, grantedBy, note, expiresAt],
  );
  if (!row) throw new Error('addProEmailGrant: insert returned no row');
  return toProEmailGrantRecord(row);
}

/**
 * Mark an active grant as revoked. No-op when no active grant exists.
 * Returns true when something was actually revoked.
 */
export async function revokeProEmailGrant(
  email: string,
  revokedBy: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const rows = await query<{ id: string }>(
    `UPDATE pro_email_grants
     SET revoked_at = NOW(), revoked_by = $2
     WHERE LOWER(email) = $1 AND revoked_at IS NULL
     RETURNING id`,
    [normalized, revokedBy],
  );
  return rows.length > 0;
}

/** All active grants. Used by the admin UI list and the tier-resolution cache. */
export async function listActiveProEmailGrants(): Promise<ProEmailGrantRecord[]> {
  const rows = await query<ProEmailGrantRow>(
    `SELECT id, email, granted_by, note, expires_at::text, created_at::text
     FROM pro_email_grants
     WHERE revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`,
  );
  return rows.map(toProEmailGrantRecord);
}

// ---------------------------------------------------------------------------
// Admin audit log (admin-granted actions, append-only)
// Maps to migrations/028_admin_audit_log.sql
// ---------------------------------------------------------------------------

export interface AdminAuditLogInput {
  actor: string;
  via: 'email' | 'secret';
  action: string;
  target?: string | null;
  payload?: unknown;
}

export async function insertAdminAuditLog(input: AdminAuditLogInput): Promise<void> {
  await execute(
    `INSERT INTO admin_audit_log (actor, via, action, target, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.actor,
      input.via,
      input.action,
      input.target ?? null,
      input.payload === undefined ? null : JSON.stringify(input.payload),
    ],
  );
}

// ---------------------------------------------------------------------------
// Referral rewards
// ---------------------------------------------------------------------------

export interface ReferralRewardInput {
  referrerId: string;
  referredId: string;
  rewardType: 'trial_extension' | 'subscription_credit';
  rewardValue: number;
}

export async function createReferralReward(input: ReferralRewardInput): Promise<void> {
  await execute(
    `INSERT INTO referral_rewards (referrer_id, referred_id, reward_type, reward_value, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
    [input.referrerId, input.referredId, input.rewardType, input.rewardValue],
  );
}

export async function setUserReferredBy(userId: string, referrerId: string): Promise<void> {
  await execute(
    `UPDATE users SET referred_by = $1 WHERE id = $2 AND referred_by IS NULL`,
    [referrerId, userId],
  );
}

export interface ReferralRevenueInput {
  referrerId: string;
  referredId: string;
  stripeInvoiceId: string;
  amountCents: number;
  shareCents: number;
}

export async function createReferralRevenue(input: ReferralRevenueInput): Promise<void> {
  await execute(
    `INSERT INTO referral_revenue (referrer_id, referred_id, stripe_invoice_id, amount_cents, share_cents, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (referred_id, stripe_invoice_id) DO NOTHING`,
    [input.referrerId, input.referredId, input.stripeInvoiceId, input.amountCents, input.shareCents],
  );
}

export interface ReferralRevenueRecord {
  id: string;
  referrerId: string;
  referredId: string;
  stripeInvoiceId: string;
  amountCents: number;
  shareCents: number;
  status: 'pending' | 'paid_out' | 'cancelled';
  createdAt: Date;
}

export async function getReferralRevenueForReferrer(referrerId: string): Promise<{
  totalShareCents: number;
  pendingShareCents: number;
  paidOutShareCents: number;
  records: ReferralRevenueRecord[];
}> {
  const rows = await query<{
    id: string;
    referrer_id: string;
    referred_id: string;
    stripe_invoice_id: string;
    amount_cents: number;
    share_cents: number;
    status: string;
    created_at: string;
  }>(
    `SELECT id, referrer_id, referred_id, stripe_invoice_id, amount_cents, share_cents, status, created_at
     FROM referral_revenue WHERE referrer_id = $1 ORDER BY created_at DESC`,
    [referrerId],
  );

  const records: ReferralRevenueRecord[] = rows.map((r) => ({
    id: r.id,
    referrerId: r.referrer_id,
    referredId: r.referred_id,
    stripeInvoiceId: r.stripe_invoice_id,
    amountCents: r.amount_cents,
    shareCents: r.share_cents,
    status: r.status as ReferralRevenueRecord['status'],
    createdAt: new Date(r.created_at),
  }));

  // Exclude cancelled rows so Total == Pending + Paid Out always holds in the UI.
  const totalShareCents = records
    .filter((r) => r.status !== 'cancelled')
    .reduce((s, r) => s + r.shareCents, 0);
  const pendingShareCents = records.filter((r) => r.status === 'pending').reduce((s, r) => s + r.shareCents, 0);
  const paidOutShareCents = records.filter((r) => r.status === 'paid_out').reduce((s, r) => s + r.shareCents, 0);

  return { totalShareCents, pendingShareCents, paidOutShareCents, records };
}

export async function getReferredUsersCount(referrerId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users WHERE referred_by = $1`,
    [referrerId],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}


/**
 * Database access layer — backed by PostgreSQL via db-pool.
 *
 * Maps to the schema in migrations/001_monetization.sql.
 */

import { query, queryOne, execute } from './db-pool';
import { readSessionFromCookies } from './user-session';
import type { Tier } from './stripe';

export interface UserRecord {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  tier: 'free' | 'pro' | 'elite' | 'custom';
  tierExpiresAt: Date | null;
  telegramUserId: bigint | null;
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
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    tier: row.tier as UserRecord['tier'],
    tierExpiresAt: row.tier_expires_at ? new Date(row.tier_expires_at) : null,
    telegramUserId: row.telegram_user_id ? BigInt(row.telegram_user_id) : null,
  };
}

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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, stripe_customer_id, tier, tier_expires_at, telegram_user_id
     FROM users WHERE id = $1`,
    [userId],
  );
  return row ? toUserRecord(row) : null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, stripe_customer_id, tier, tier_expires_at, telegram_user_id
     FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return row ? toUserRecord(row) : null;
}

/**
 * Find-or-create a user by email. Used by the passwordless session flow so
 * first-time visitors get a row on their first signin attempt.
 */
export async function upsertUserByEmail(email: string): Promise<UserRecord> {
  const normalized = email.trim().toLowerCase();
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING id, email, stripe_customer_id, tier, tier_expires_at, telegram_user_id`,
    [normalized],
  );
  if (!row) throw new Error('upsertUserByEmail: insert returned no row');
  return toUserRecord(row);
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<UserRecord | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, stripe_customer_id, tier, tier_expires_at, telegram_user_id
     FROM users WHERE stripe_customer_id = $1`,
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

// ---------------------------------------------------------------------------
// Subscription operations
// ---------------------------------------------------------------------------

export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionRecord | null> {
  const row = await queryOne<SubscriptionRow>(
    `SELECT id, user_id, stripe_subscription_id, stripe_customer_id,
            tier, status, current_period_start, current_period_end,
            cancel_at_period_end, created_at, updated_at
     FROM subscriptions
     WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return row ? toSubscriptionRecord(row) : null;
}

export async function upsertSubscription(
  data: Omit<SubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  await execute(
    `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id, tier, status,
        current_period_start, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (stripe_subscription_id)
     DO UPDATE SET
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
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
    ],
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
// Telegram invite operations
// ---------------------------------------------------------------------------

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
// Tier resolution from session
// ---------------------------------------------------------------------------

/** Get user tier from the current session cookie. Returns 'free' if no valid session. */
export async function getUserTierFromSession(): Promise<Tier> {
  const session = await readSessionFromCookies();
  if (!session) return 'free';
  const user = await getUserById(session.userId);
  return (user?.tier as Tier) ?? 'free';
}

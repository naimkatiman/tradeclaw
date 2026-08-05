/**
 * Database access layer — backed by PostgreSQL via db-pool.
 *
 * Monetization (subscriptions, tiers, Telegram invites, referrals) was
 * removed in Phase 2 of the free/open-source pivot — see
 * migrations/053_drop_monetization.sql. What remains is core user CRUD,
 * the admin audit log, and the Stripe-event idempotency ledger that the
 * EarningsEdge webhook still shares (ee:-prefixed rows).
 */

import { queryOne, execute } from './db-pool';

export interface UserRecord {
  id: string;
  email: string;
  telegramUserId: bigint | null;
  displayName: string | null;
  avatarUrl: string | null;
  authProvider: 'google' | 'github' | 'telegram' | null;
}

// ---------------------------------------------------------------------------
// Row → Record mappers
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  telegram_user_id: string | null;
  name: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    telegramUserId: row.telegram_user_id ? BigInt(row.telegram_user_id) : null,
    displayName: row.name,
    avatarUrl: row.avatar_url,
    authProvider:
      row.auth_provider === 'google' ||
      row.auth_provider === 'github' ||
      row.auth_provider === 'telegram'
        ? row.auth_provider
        : null,
  };
}

const USER_COLUMNS = `id, email, telegram_user_id, name, avatar_url, auth_provider`;

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<UserRecord | null> {
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
export async function upsertUserByEmail(email: string): Promise<UserRecord> {
  const normalized = email.trim().toLowerCase();
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING ${USER_COLUMNS}`,
    [normalized],
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
    `INSERT INTO users (email, name, avatar_url, auth_provider)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       name       = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()
     RETURNING ${USER_COLUMNS}`,
    [normalized, input.displayName, input.avatarUrl, input.authProvider],
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
    `INSERT INTO users (email, name, avatar_url, auth_provider, telegram_user_id)
     VALUES ($1, $2, $3, 'telegram', $4)
     ON CONFLICT (email) DO UPDATE SET
       name             = EXCLUDED.name,
       avatar_url       = EXCLUDED.avatar_url,
       telegram_user_id = EXCLUDED.telegram_user_id,
       updated_at       = NOW()
     RETURNING ${USER_COLUMNS}`,
    [email, input.displayName, input.avatarUrl, input.telegramUserId.toString()],
  );
  if (!row) throw new Error('upsertTelegramUser: insert returned no row');
  return toUserRecord(row);
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

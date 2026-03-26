/**
 * Database access layer.
 *
 * This module abstracts all DB operations required by the monetization system.
 * Replace the stub implementations below with real DB calls once a database
 * (Postgres via Prisma, Drizzle, or raw pg) is configured.
 *
 * See prisma/schema.prisma and migrations/001_monetization.sql for the schema.
 */

export interface UserRecord {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  tier: 'free' | 'pro' | 'elite';
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
// User operations
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<UserRecord | null> {
  // TODO: replace with real DB query
  // Example (Prisma): return prisma.user.findUnique({ where: { id: userId } })
  console.log('[db stub] getUserById', userId);
  return null;
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserRecord | null> {
  console.log('[db stub] getUserByStripeCustomerId', stripeCustomerId);
  return null;
}

export async function updateUserStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  console.log('[db stub] updateUserStripeCustomerId', userId, stripeCustomerId);
}

export async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'elite',
  tierExpiresAt: Date | null
): Promise<void> {
  console.log('[db stub] updateUserTier', userId, tier, tierExpiresAt);
}

export async function linkTelegramUser(
  userId: string,
  telegramUserId: bigint
): Promise<void> {
  console.log('[db stub] linkTelegramUser', userId, telegramUserId.toString());
}

// ---------------------------------------------------------------------------
// Subscription operations
// ---------------------------------------------------------------------------

export async function getUserSubscription(
  userId: string
): Promise<SubscriptionRecord | null> {
  console.log('[db stub] getUserSubscription', userId);
  return null;
}

export async function upsertSubscription(
  data: Omit<SubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  console.log('[db stub] upsertSubscription', data.stripeSubscriptionId);
}

export async function cancelSubscription(
  stripeSubscriptionId: string
): Promise<void> {
  console.log('[db stub] cancelSubscription', stripeSubscriptionId);
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: SubscriptionRecord['status'],
  currentPeriodEnd?: Date
): Promise<void> {
  console.log('[db stub] updateSubscriptionStatus', stripeSubscriptionId, status);
}

// ---------------------------------------------------------------------------
// Telegram invite operations
// ---------------------------------------------------------------------------

export async function createTelegramInvite(
  data: Omit<TelegramInviteRecord, 'id' | 'createdAt'>
): Promise<void> {
  console.log('[db stub] createTelegramInvite', data.inviteLink);
}

export async function deactivateUserTelegramInvites(
  userId: string,
  tier: 'pro' | 'elite'
): Promise<TelegramInviteRecord[]> {
  console.log('[db stub] deactivateUserTelegramInvites', userId, tier);
  return [];
}

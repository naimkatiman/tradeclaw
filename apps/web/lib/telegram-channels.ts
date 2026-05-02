import 'server-only';

/**
 * Canonical resolver for Telegram channel/group IDs.
 *
 * Three legacy env-var names existed for the free public channel
 * (`TELEGRAM_CHANNEL_ID`, `TELEGRAM_PUBLIC_CHANNEL_ID`, `TELEGRAM_FREE_CHANNEL_ID`).
 * This module is the single source of truth: callers ask for `getFreeChannelId()`
 * or `getProGroupId()` and get back a string or null. Backwards-compat aliases
 * keep older deploys working until they migrate.
 *
 * Set on Railway (preferred names):
 *   TELEGRAM_BOT_TOKEN       — the bot that posts to both channels
 *   TELEGRAM_FREE_CHANNEL_ID — public channel ID for free-tier broadcasts
 *   TELEGRAM_PRO_GROUP_ID    — private group ID for Pro subscribers
 */

export function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

/** Free public channel — accepts the canonical name and two legacy aliases. */
export function getFreeChannelId(): string | null {
  return (
    process.env.TELEGRAM_FREE_CHANNEL_ID ??
    process.env.TELEGRAM_PUBLIC_CHANNEL_ID ??
    process.env.TELEGRAM_CHANNEL_ID ??
    null
  );
}

/** Private Pro group — only accepts the canonical name. */
export function getProGroupId(): string | null {
  return process.env.TELEGRAM_PRO_GROUP_ID ?? null;
}

/** Legacy elite group — kept for invite-link revocation continuity. */
export function getEliteGroupId(): string | null {
  return process.env.TELEGRAM_ELITE_GROUP_ID ?? null;
}

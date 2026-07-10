import 'server-only';

/**
 * Canonical resolver for Telegram channel IDs.
 *
 * Three legacy env-var names existed for the free public channel
 * (`TELEGRAM_CHANNEL_ID`, `TELEGRAM_PUBLIC_CHANNEL_ID`, `TELEGRAM_FREE_CHANNEL_ID`).
 * This module is the single source of truth: callers ask for `getFreeChannelId()`
 * and get back a string or null. Backwards-compat aliases keep older deploys
 * working until they migrate. The private Pro/Elite groups are gone —
 * TradeClaw is fully free and broadcasts to the public channel only.
 *
 * Set on Railway (preferred names):
 *   TELEGRAM_BOT_TOKEN         — the bot that posts to the channel
 *   TELEGRAM_FREE_CHANNEL_ID   — public channel ID for signal broadcasts
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

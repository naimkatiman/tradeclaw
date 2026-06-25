/**
 * Telegram bot command handlers for the Weekly Regime Card.
 *
 * Wired into the live webhook (`app/api/telegram/route.ts` -> `handleBotUpdate`).
 * Three commands, admin-gated where they write:
 *   /setregime <note>   parse the note, stash a pending input, reply a preview.
 *   /confirmregime      write the stashed pending input for the current KL week.
 *   /regime             show the current week's card (read-only, public).
 *
 * Admin allowlist is the `ADMIN_TELEGRAM_IDS` env var (comma-separated numeric
 * Telegram user ids). If unset/empty, every write is denied.
 *
 * Pending stash uses the same Redis + in-memory `Map` fallback pattern as
 * `lib/leaderboard-cache.ts` so it works without Redis in test/local envs. It
 * is a SEPARATE store from the weekly-regime card cache (`./cache.ts`): the
 * payload is a not-yet-written {@link RegimeInput}, keyed per Telegram user with
 * a short 5-minute TTL.
 *
 * This module is NOT `server-only`: `route.ts` (a server route) imports it, but
 * keeping it free of the `server-only` marker lets the handlers stay unit
 * testable. The real `parseAdminNote` / service functions it calls are the only
 * things that touch I/O, and the read handler accepts an injected fetcher so it
 * can be exercised without a DB.
 */

import { redis, isRedisAvailable, ensureRedis, redisKey } from '../redis';
import { parseAdminNote } from './parser';
import { classifyRegime } from './classifier';
import { weekStartFor } from './discipline';
import { setWeeklyRegime, getCurrentWeeklyRegime } from './service';
import {
  ASSET_CLASSES,
  type AssetClass,
  type RegimeInput,
  type ClassRegime,
  type WeeklyRegimeCard,
} from './types';

/** Minutes a stashed `/setregime` preview survives before it must be redone. */
const PENDING_TTL_MS = 5 * 60 * 1000;

/** Human label per asset class for bot replies. */
const CLASS_LABEL: Record<AssetClass, string> = {
  crypto: 'Crypto',
  commodities: 'Commodities',
  stocks: 'Stocks',
  forex: 'Forex',
  indices: 'Indices',
};

// ---------------------------------------------------------------------------
// Admin allowlist
// ---------------------------------------------------------------------------

/**
 * True if `id` is in the `ADMIN_TELEGRAM_IDS` allowlist (comma-separated). When
 * the env var is unset or empty, NO user is admin (deny by default).
 */
export function isAdminTelegramUser(id: number): boolean {
  const raw = process.env.ADMIN_TELEGRAM_IDS;
  if (!raw) return false;
  const allowed = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (allowed.length === 0) return false;
  return allowed.includes(String(id));
}

// ---------------------------------------------------------------------------
// Pending stash (Redis + in-memory Map fallback, mirrors leaderboard-cache.ts)
// ---------------------------------------------------------------------------

interface PendingEntry {
  input: RegimeInput;
  expiresAt: number;
}

const pendingMemory = new Map<number, PendingEntry>();

function pendingKey(telegramUserId: number): string {
  return redisKey(`wregime:pending:${telegramUserId}`);
}

async function getRedisPending(key: string): Promise<PendingEntry | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as PendingEntry;
  } catch {
    return null;
  }
}

async function setRedisPending(key: string, entry: PendingEntry, ttlMs: number): Promise<void> {
  try {
    if (isRedisAvailable() && redis) {
      await redis.set(key, JSON.stringify(entry), 'PX', ttlMs);
    }
  } catch {
    // ignore
  }
}

async function delRedisPending(key: string): Promise<void> {
  try {
    if (isRedisAvailable() && redis) {
      await redis.del(key);
    }
  } catch {
    // ignore
  }
}

async function stashPending(telegramUserId: number, input: RegimeInput, now: Date): Promise<void> {
  const entry: PendingEntry = { input, expiresAt: now.getTime() + PENDING_TTL_MS };
  pendingMemory.set(telegramUserId, entry);
  await setRedisPending(pendingKey(telegramUserId), entry, PENDING_TTL_MS);
}

async function readPending(telegramUserId: number, now: Date): Promise<RegimeInput | null> {
  const mem = pendingMemory.get(telegramUserId);
  if (mem && now.getTime() < mem.expiresAt) {
    return mem.input;
  }

  const fromRedis = await getRedisPending(pendingKey(telegramUserId));
  if (fromRedis && fromRedis.expiresAt > now.getTime()) {
    pendingMemory.set(telegramUserId, fromRedis);
    return fromRedis.input;
  }

  return null;
}

async function clearPending(telegramUserId: number): Promise<void> {
  pendingMemory.delete(telegramUserId);
  await delRedisPending(pendingKey(telegramUserId));
}

// ---------------------------------------------------------------------------
// Formatting (plain text for Telegram; no emoji)
// ---------------------------------------------------------------------------

/**
 * Escape the HTML metacharacters Telegram's `parse_mode: 'HTML'` cares about.
 * Free-text fields (thesis, override reason) are admin-authored but still must
 * be escaped or a stray `<`, `>`, or `&` breaks the whole message render.
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** One plain-text line summarising a class's bias + conviction + derived regime. */
function formatClassLine(label: string, bias: string, conviction: number, regime: string, thesis: string): string {
  const head = `${label}: ${regime} (${bias} c${conviction})`;
  const tail = thesis.trim().length > 0 ? ` - ${escapeHtml(thesis.trim())}` : '';
  return `${head}${tail}`;
}

/**
 * Preview block for a parsed-but-not-written {@link RegimeInput}. Shows the
 * derived TRENDING/NEUTRAL per class (via {@link classifyRegime}) and the KL
 * week the write would land on, then the confirm/redo instruction.
 */
export function formatPreview(input: RegimeInput, weekStart: string): string {
  const lines: string[] = [`Weekly Regime preview (week of ${weekStart}):`, ''];
  for (const cls of ASSET_CLASSES) {
    const entry = input[cls];
    const regime = classifyRegime(entry);
    lines.push(formatClassLine(CLASS_LABEL[cls], entry.bias, entry.conviction, regime, entry.thesis));
  }
  lines.push('');
  lines.push('Send /confirmregime to write, or /setregime <new note> to redo.');
  return lines.join('\n');
}

/** Full read-out of a persisted card, all five classes + attribution. */
export function formatCard(card: WeeklyRegimeCard): string {
  const lines: string[] = [`Weekly Regime (week of ${card.week_start}):`, ''];
  for (const cls of ASSET_CLASSES) {
    const entry: ClassRegime = card.classes[cls];
    lines.push(formatClassLine(CLASS_LABEL[cls], entry.bias, entry.conviction, entry.regime, entry.thesis));
  }
  if (card.override_used) {
    lines.push('');
    lines.push(`Override used${card.override_reason ? `: ${escapeHtml(card.override_reason)}` : ''}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/** Strip a leading `/command` token from raw message text, return the rest trimmed. */
function stripCommand(text: string, command: string): string {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith(command)) {
    return trimmed.slice(command.length).trim();
  }
  return trimmed;
}

/**
 * `/setregime <note>` — admin-only. Parse the free-text note. On an ambiguous
 * note reply the parser's clarifying question. Otherwise stash the parsed input
 * as pending (5-min TTL) and reply a preview ending with the confirm/redo line.
 */
export async function handleSetRegime(args: {
  text: string;
  telegramUserId: number;
  now?: Date;
}): Promise<{ reply: string }> {
  if (!isAdminTelegramUser(args.telegramUserId)) {
    return { reply: 'You are not authorized to set the weekly regime.' };
  }

  const note = stripCommand(args.text, '/setregime');
  if (note.length === 0) {
    return {
      reply:
        'Usage: /setregime <note>. Example: /setregime crypto long strong, gold short medium, forex flat.',
    };
  }

  const parsed = parseAdminNote(note);
  if (!parsed.ok) {
    return { reply: parsed.clarify };
  }

  const now = args.now ?? new Date();
  const weekStart = weekStartFor(now);
  await stashPending(args.telegramUserId, parsed.input, now);

  return { reply: formatPreview(parsed.input, weekStart) };
}

/**
 * `/confirmregime` — admin-only. Read the user's pending input and write it for
 * the current KL week via {@link setWeeklyRegime}. Reports the lock/override
 * outcome and clears the pending stash on success.
 */
export async function handleConfirmRegime(args: {
  telegramUserId: number;
  now?: Date;
}): Promise<{ reply: string }> {
  if (!isAdminTelegramUser(args.telegramUserId)) {
    return { reply: 'You are not authorized to set the weekly regime.' };
  }

  const now = args.now ?? new Date();
  const pending = await readPending(args.telegramUserId, now);
  if (!pending) {
    return { reply: 'No pending regime to confirm. Send /setregime <note> first.' };
  }

  const result = await setWeeklyRegime(pending, {
    setBy: `tg:${args.telegramUserId}`,
    via: 'telegram',
    now,
  });

  if (!result.ok) {
    if (result.requiresOverride) {
      return {
        reply:
          'Weekly regime is locked after Monday 12:00 (Asia/Kuala_Lumpur). ' +
          'A post-lock change needs an override + reason via the admin panel.',
      };
    }
    return { reply: `Could not write the weekly regime: ${result.error ?? 'unknown error'}` };
  }

  await clearPending(args.telegramUserId);
  const card = result.card;
  return {
    reply: card
      ? `Weekly regime saved for week of ${card.week_start}.\n\n${formatCard(card)}`
      : 'Weekly regime saved.',
  };
}

/** Fetcher for the current week's card. Injectable so the handler is unit-testable. */
export type CurrentRegimeFetcher = () => Promise<WeeklyRegimeCard | null>;

/**
 * `/regime` — read-only, public. Show the current KL week's card formatted, or a
 * "not set yet" message. Accepts an injected `fetch` (defaults to the real
 * service) so it can be tested without a DB.
 */
export async function handleShowRegime(
  fetchCurrent: CurrentRegimeFetcher = getCurrentWeeklyRegime,
): Promise<{ reply: string }> {
  const card = await fetchCurrent();
  if (!card) {
    return { reply: 'No regime card set for this week yet.' };
  }
  return { reply: formatCard(card) };
}

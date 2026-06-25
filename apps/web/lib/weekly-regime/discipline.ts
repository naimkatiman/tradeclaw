/**
 * Pure write-discipline math for the Weekly Regime Card.
 *
 * The card week is anchored to Asia/Kuala_Lumpur, which is a FIXED UTC+8 with
 * NO daylight saving. We therefore do all timezone math with a constant +8h
 * offset rather than fragile locale/Intl parsing: shift the epoch by +8h and
 * read UTC calendar fields to get the KL wall-clock day.
 *
 * The lock cutoff is Monday 12:00 KL. Past that, writes for the week require an
 * explicit override + reason. This file is pure (no I/O, no DB, no server-only).
 */

import type { WeeklyRegimeCard } from './types';

/** IANA identifier for the card timezone. KL is a fixed UTC+8, no DST. */
export const KL_TZ = 'Asia/Kuala_Lumpur';

/** Kuala Lumpur offset in milliseconds (UTC+8, no DST). */
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Two-digit zero pad. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Monday (`YYYY-MM-DD`) of the KL week containing `date`. Week starts Monday.
 */
export function weekStartFor(date: Date): string {
  // Shift into KL wall-clock, then read UTC fields as if they were KL fields.
  const kl = new Date(date.getTime() + KL_OFFSET_MS);
  const day = kl.getUTCDay(); // 0=Sun .. 6=Sat (KL wall-clock day-of-week)
  const mondayOffset = (day + 6) % 7; // Mon=0, Sun=6
  const monday = new Date(
    Date.UTC(kl.getUTCFullYear(), kl.getUTCMonth(), kl.getUTCDate() - mondayOffset),
  );
  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

/** Parse a `YYYY-MM-DD` week-start string into numeric Y/M/D parts. */
function parseWeekStart(weekStart: string): { year: number; month: number; day: number } {
  const [year, month, day] = weekStart.split('-').map((p) => Number.parseInt(p, 10));
  return { year, month, day };
}

/**
 * The lock cutoff instant: Monday 12:00 KL of `weekStart`, as a UTC Date.
 * KL noon == 04:00 UTC.
 */
export function lockCutoffFor(weekStart: string): Date {
  const { year, month, day } = parseWeekStart(weekStart);
  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
}

/**
 * End-of-week instant: Sunday 23:59 KL of `weekStart`, as a UTC Date.
 * Sunday is `weekStart + 6 days`; 23:59 KL == 15:59 UTC. Used for cache TTL.
 */
export function weekEndFor(weekStart: string): Date {
  const { year, month, day } = parseWeekStart(weekStart);
  return new Date(Date.UTC(year, month - 1, day + 6, 15, 59, 0));
}

/** True once `now` is at or past the Monday-noon-KL lock cutoff for the week. */
export function isPastLockCutoff(now: Date, weekStart: string): boolean {
  return now.getTime() >= lockCutoffFor(weekStart).getTime();
}

/** Result of the write-discipline gate. */
export interface WriteGateResult {
  allowed: boolean;
  requiresOverride: boolean;
  error?: string;
}

/**
 * Decide whether a card write for `weekStart` is permitted at `now`.
 *
 * - Before the Monday-noon-KL cutoff: allowed (override flags ignored).
 * - At/after the cutoff without override: blocked, requires override.
 * - At/after the cutoff with `override === true` and a non-empty `reason`: allowed.
 * - At/after the cutoff with override but a missing/blank reason: blocked.
 */
export function evaluateWriteGate(
  now: Date,
  weekStart: string,
  opts: { override?: boolean; reason?: string },
): WriteGateResult {
  if (!isPastLockCutoff(now, weekStart)) {
    return { allowed: true, requiresOverride: false };
  }

  const reason = opts.reason?.trim() ?? '';

  if (opts.override === true && reason.length > 0) {
    return { allowed: true, requiresOverride: true };
  }

  if (opts.override === true && reason.length === 0) {
    return {
      allowed: false,
      requiresOverride: true,
      error: 'Override requires a non-empty reason after the Monday 12:00 KL lock cutoff.',
    };
  }

  return {
    allowed: false,
    requiresOverride: true,
    error:
      'Weekly regime is locked after Monday 12:00 (Asia/Kuala_Lumpur). Provide override + reason to write.',
  };
}

/**
 * Cache TTL in milliseconds: from `now` until Sunday 23:59 KL of the card's
 * week. Clamped to a minimum of 1000ms so a write near end-of-week still caches.
 */
export function cacheTtlMsFor(card: WeeklyRegimeCard, now: Date): number {
  const end = weekEndFor(card.week_start).getTime();
  return Math.max(end - now.getTime(), 1000);
}

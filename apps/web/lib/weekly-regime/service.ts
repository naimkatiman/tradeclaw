/**
 * Weekly Regime Card service — server-only persistence + read path.
 *
 * Read path: cache -> Postgres row (JSONB classes mapped to the card).
 * Write path: discipline gate -> UPSERT into `weekly_regime` -> best-effort
 * cache write + admin audit log (neither is allowed to break the write).
 *
 * Maps to migration `046_weekly_regime.sql`.
 */

import 'server-only';

import { queryOne, execute } from '../db-pool';
import { insertAdminAuditLog } from '../db';
import { deriveCard } from './classifier';
import {
  weekStartFor,
  isPastLockCutoff,
  evaluateWriteGate,
} from './discipline';
import { getCachedCard, setCachedCard, invalidateCard } from './cache';
import {
  ASSET_CLASSES,
  type RegimeInput,
  type ClassRegime,
  type WeeklyRegimeCard,
} from './types';

/** Shape of a `weekly_regime` row as read by pg (with week_start cast to text). */
interface WeeklyRegimeRow {
  week_start: string;
  classes: Record<string, ClassRegime>;
  locked: boolean;
  override_used: boolean;
  override_reason: string | null;
  set_by: string;
  set_at: string;
}

/** Build a card from a DB row. `classes` JSONB is already an object (no parse). */
function rowToCard(row: WeeklyRegimeRow): WeeklyRegimeCard {
  const classes = {} as Record<(typeof ASSET_CLASSES)[number], ClassRegime>;
  for (const cls of ASSET_CLASSES) {
    classes[cls] = row.classes[cls];
  }
  return {
    week_start: row.week_start,
    classes,
    locked: row.locked,
    override_used: row.override_used,
    override_reason: row.override_reason,
    set_by: row.set_by,
    // node-pg returns TIMESTAMPTZ as a Date; normalize to ISO so a DB read and
    // a cache (JSON) read carry the same string format the write path emits.
    set_at: new Date(row.set_at).toISOString(),
  };
}

/** Read a specific week's card (cache first, then DB). */
export async function getWeeklyRegime(weekStart: string): Promise<WeeklyRegimeCard | null> {
  const cached = await getCachedCard(weekStart);
  if (cached) return cached;

  const row = await queryOne<WeeklyRegimeRow>(
    `SELECT week_start::text AS week_start, classes, locked, override_used,
            override_reason, set_by, set_at
       FROM weekly_regime
      WHERE week_start = $1`,
    [weekStart],
  );
  if (!row) return null;

  const card = rowToCard(row);
  // Warm the cache best-effort; never let it break the read.
  try {
    await setCachedCard(card);
  } catch {
    // ignore
  }
  return card;
}

/**
 * Read the current KL week's card. Returns `null` when no card is set for the
 * week — consumers (e.g. a signal filter) MUST treat `null` as the conservative
 * NEUTRAL fail-safe rather than as an error.
 */
export async function getCurrentWeeklyRegime(now?: Date): Promise<WeeklyRegimeCard | null> {
  const weekStart = weekStartFor(now ?? new Date());
  return getWeeklyRegime(weekStart);
}

/** Options controlling a regime write. */
export interface SetWeeklyRegimeOptions {
  setBy: string;
  via?: 'email' | 'secret' | 'telegram';
  override?: boolean;
  reason?: string;
  now?: Date;
}

/** Result of a regime write attempt. */
export interface SetWeeklyRegimeResult {
  ok: boolean;
  card?: WeeklyRegimeCard;
  error?: string;
  requiresOverride?: boolean;
}

/**
 * Set (UPSERT) the regime card for the current KL week.
 *
 * Runs the write-discipline gate first; a blocked write returns
 * `{ ok:false, error, requiresOverride }` and touches nothing. On success the
 * derived card is upserted, then cache + audit log are written best-effort.
 */
export async function setWeeklyRegime(
  input: RegimeInput,
  opts: SetWeeklyRegimeOptions,
): Promise<SetWeeklyRegimeResult> {
  const now = opts.now ?? new Date();
  const weekStart = weekStartFor(now);

  const gate = evaluateWriteGate(now, weekStart, {
    override: opts.override,
    reason: opts.reason,
  });
  if (!gate.allowed) {
    return { ok: false, error: gate.error, requiresOverride: gate.requiresOverride };
  }

  const locked = isPastLockCutoff(now, weekStart);
  // An override is only "used" when it actually relaxes the post-lock gate.
  // Stamping it on a pre-lock write would record a spurious override_used=true.
  const overrideUsed = locked && opts.override === true;
  const overrideReason = overrideUsed ? (opts.reason?.trim() ?? null) : null;
  // Single timestamp shared by the persisted row and the returned card so they
  // match without a re-read.
  const setAt = now.toISOString();

  const card = deriveCard(input, {
    week_start: weekStart,
    set_by: opts.setBy,
    set_at: setAt,
    locked,
    override_used: overrideUsed,
    override_reason: overrideReason,
  });

  await execute(
    `INSERT INTO weekly_regime
       (week_start, classes, locked, override_used, override_reason, set_by, set_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (week_start) DO UPDATE SET
       classes = EXCLUDED.classes,
       locked = EXCLUDED.locked,
       override_used = EXCLUDED.override_used,
       override_reason = EXCLUDED.override_reason,
       set_by = EXCLUDED.set_by,
       set_at = EXCLUDED.set_at`,
    [
      weekStart,
      JSON.stringify(card.classes),
      locked,
      overrideUsed,
      overrideReason,
      opts.setBy,
      setAt,
    ],
  );

  // Best-effort cache refresh — invalidate any stale entry, then warm with the
  // freshly written card. Never let a cache failure break the write.
  try {
    await invalidateCard(weekStart);
    await setCachedCard(card);
  } catch {
    // ignore
  }

  // Best-effort audit log. The shared audit helper only accepts 'email'|'secret';
  // a 'telegram' write is recorded as 'secret' with the true channel in payload.
  try {
    await insertAdminAuditLog({
      actor: opts.setBy,
      via: opts.via === 'telegram' ? 'secret' : (opts.via ?? 'secret'),
      action: 'weekly_regime_set',
      target: weekStart,
      payload: {
        via: opts.via ?? 'secret',
        override: overrideUsed,
        reason: overrideReason,
        classes: card.classes,
      },
    });
  } catch {
    // ignore
  }

  return { ok: true, card };
}

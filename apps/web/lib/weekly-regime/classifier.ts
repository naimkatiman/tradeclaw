/**
 * Pure classification for the Weekly Regime Card.
 *
 * Client-safe: intentionally free of `server-only` and DB imports so the admin
 * client component can import {@link classifyRegime} for live preview. Do not
 * add I/O here.
 */

import {
  ASSET_CLASSES,
  type Bias,
  type Conviction,
  type Regime,
  type RegimeInput,
  type ClassRegime,
  type WeeklyRegimeCard,
} from './types';

/**
 * Derive the two-state regime from an admin's per-class input.
 *
 * Rule (single source of truth): `bias === 'NONE' || conviction === 0` => NEUTRAL,
 * otherwise TRENDING. The `regime` field is ALWAYS derived here, never hand-set.
 */
export function classifyRegime(input: { bias: Bias; conviction: Conviction }): Regime {
  if (input.bias === 'NONE' || input.conviction === 0) {
    return 'NEUTRAL';
  }
  return 'TRENDING';
}

/** Attribution + lock metadata applied to a derived card. */
export interface DeriveCardMeta {
  week_start: string;
  set_by: string;
  /** ISO-8601 timestamp. */
  set_at: string;
  locked?: boolean;
  override_used?: boolean;
  override_reason?: string | null;
}

/**
 * Build a full {@link WeeklyRegimeCard} from raw admin input by classifying
 * every asset class and stamping attribution from `meta`. Every one of the
 * five {@link ASSET_CLASSES} is always present on the result.
 */
export function deriveCard(input: RegimeInput, meta: DeriveCardMeta): WeeklyRegimeCard {
  const classes = {} as Record<(typeof ASSET_CLASSES)[number], ClassRegime>;

  for (const cls of ASSET_CLASSES) {
    const entry = input[cls];
    classes[cls] = {
      bias: entry.bias,
      conviction: entry.conviction,
      regime: classifyRegime(entry),
      thesis: entry.thesis,
      set_by: meta.set_by,
      set_at: meta.set_at,
    };
  }

  return {
    week_start: meta.week_start,
    classes,
    locked: meta.locked ?? false,
    override_used: meta.override_used ?? false,
    override_reason: meta.override_reason ?? null,
    set_by: meta.set_by,
    set_at: meta.set_at,
  };
}

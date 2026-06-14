/**
 * Strict schema validation for the Weekly Regime Card model.
 *
 * Two entrypoints:
 *  - {@link validateRegimeInput}: validates raw admin input (all five classes,
 *    bias/conviction in range, thesis a string).
 *  - {@link validateCard}: validates a persisted/derived card AND recomputes the
 *    derived `regime` per class, asserting it matches {@link classifyRegime}.
 *
 * Client-safe: imports only from `./types` and `./classifier`. No `server-only`,
 * no DB. The admin client component may import this for live validation.
 */

import { classifyRegime } from './classifier';
import {
  ASSET_CLASSES,
  type AssetClass,
  type Bias,
  type Conviction,
  type ClassInput,
  type ClassRegime,
  type RegimeInput,
  type Regime,
  type WeeklyRegimeCard,
} from './types';

const BIAS_VALUES: readonly Bias[] = ['LONG', 'SHORT', 'NONE'];
const CONVICTION_VALUES: readonly Conviction[] = [0, 1, 2, 3];
const REGIME_VALUES: readonly Regime[] = ['TRENDING', 'NEUTRAL'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBias(value: unknown): value is Bias {
  return typeof value === 'string' && (BIAS_VALUES as readonly string[]).includes(value);
}

function isConviction(value: unknown): value is Conviction {
  return typeof value === 'number' && (CONVICTION_VALUES as readonly number[]).includes(value);
}

function isRegime(value: unknown): value is Regime {
  return typeof value === 'string' && (REGIME_VALUES as readonly string[]).includes(value);
}

/** Validate one `ClassInput` shape, pushing prefixed errors. */
function checkClassInput(label: AssetClass, raw: unknown, errors: string[]): void {
  if (!isRecord(raw)) {
    errors.push(`${label}: must be an object`);
    return;
  }
  if (!isBias(raw.bias)) {
    errors.push(`${label}.bias: must be one of LONG | SHORT | NONE`);
  }
  if (!isConviction(raw.conviction)) {
    errors.push(`${label}.conviction: must be an integer 0-3`);
  }
  if (typeof raw.thesis !== 'string') {
    errors.push(`${label}.thesis: must be a string`);
  }
}

/**
 * Validate raw admin input. On success, returns the value narrowed to
 * {@link RegimeInput}. Checks every one of the five {@link ASSET_CLASSES}.
 */
export function validateRegimeInput(
  obj: unknown,
): { ok: true; input: RegimeInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(obj)) {
    return { ok: false, errors: ['input: must be an object'] };
  }

  for (const cls of ASSET_CLASSES) {
    if (!(cls in obj)) {
      errors.push(`${cls}: missing asset class`);
      continue;
    }
    checkClassInput(cls, obj[cls], errors);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, input: obj as RegimeInput };
}

/** Validate one persisted `ClassRegime` entry, including the derived-regime check. */
function checkClassRegime(label: AssetClass, raw: unknown, errors: string[]): void {
  if (!isRecord(raw)) {
    errors.push(`${label}: must be an object`);
    return;
  }

  const biasOk = isBias(raw.bias);
  const convictionOk = isConviction(raw.conviction);

  if (!biasOk) errors.push(`${label}.bias: must be one of LONG | SHORT | NONE`);
  if (!convictionOk) errors.push(`${label}.conviction: must be an integer 0-3`);
  if (typeof raw.thesis !== 'string') errors.push(`${label}.thesis: must be a string`);
  if (typeof raw.set_by !== 'string' || raw.set_by.length === 0) {
    errors.push(`${label}.set_by: must be a non-empty string`);
  }
  if (typeof raw.set_at !== 'string' || raw.set_at.length === 0) {
    errors.push(`${label}.set_at: must be a non-empty string`);
  }
  if (!isRegime(raw.regime)) {
    errors.push(`${label}.regime: must be TRENDING or NEUTRAL`);
    return;
  }

  // The discriminating check: the stored regime MUST equal the derived one.
  if (biasOk && convictionOk) {
    const expected = classifyRegime({
      bias: raw.bias as Bias,
      conviction: raw.conviction as Conviction,
    });
    if (raw.regime !== expected) {
      errors.push(
        `${label}.regime: ${String(raw.regime)} does not match derived ${expected} for bias=${String(raw.bias)} conviction=${String(raw.conviction)}`,
      );
    }
  }
}

/**
 * Validate a full {@link WeeklyRegimeCard}: required string fields, all five
 * classes present, each class shape valid, and each class's `regime` field
 * consistent with {@link classifyRegime}.
 */
export function validateCard(
  obj: unknown,
): { ok: true; card: WeeklyRegimeCard } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(obj)) {
    return { ok: false, errors: ['card: must be an object'] };
  }

  if (typeof obj.week_start !== 'string' || obj.week_start.length === 0) {
    errors.push('week_start: must be a non-empty string');
  }
  if (typeof obj.set_by !== 'string' || obj.set_by.length === 0) {
    errors.push('set_by: must be a non-empty string');
  }
  if (typeof obj.set_at !== 'string' || obj.set_at.length === 0) {
    errors.push('set_at: must be a non-empty string');
  }
  if (typeof obj.locked !== 'boolean') {
    errors.push('locked: must be a boolean');
  }
  if (typeof obj.override_used !== 'boolean') {
    errors.push('override_used: must be a boolean');
  }
  if (obj.override_reason !== null && typeof obj.override_reason !== 'string') {
    errors.push('override_reason: must be a string or null');
  }

  if (!isRecord(obj.classes)) {
    errors.push('classes: must be an object with all five asset classes');
  } else {
    const classes = obj.classes;
    for (const cls of ASSET_CLASSES) {
      if (!(cls in classes)) {
        errors.push(`classes.${cls}: missing asset class`);
        continue;
      }
      checkClassRegime(cls, classes[cls], errors);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, card: obj as unknown as WeeklyRegimeCard };
}

// Re-export commonly paired types for downstream callers without re-importing.
export type { ClassInput, ClassRegime };

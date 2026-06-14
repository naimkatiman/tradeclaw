/**
 * Deterministic free-text -> {@link RegimeInput} parser for the Weekly Regime Card.
 *
 * No LLM, no I/O — pure string math. This is the PRIMARY mapping path;
 * `mapping-prompt.ts` only adds an optional LLM layer that falls back here.
 *
 * Client-safe: imports only from `./types`. No `server-only`, no DB. The admin
 * client component may import this for a live preview of a typed note.
 *
 * Strategy (see docs/plans/2026-06-03-weekly-regime-engine.md):
 *  1. Split the note into segments on `,` / `;` / newline.
 *  2. Per segment, word-boundary match class keywords + bias + conviction words.
 *  3. Accumulate onto a base record of all five classes = NONE/0/'' , overlaying
 *     parsed classes. Always return the full RegimeInput.
 *  4. Ambiguity (conflicting bias for one class, OR a class mentioned with no
 *     parseable direction) => `{ ok:false, clarify }` with ONE specific question,
 *     for the FIRST problematic class in {@link ASSET_CLASSES} order. Conflict is
 *     detected both within a single segment and ACROSS segments (a class that
 *     resolves LONG in one segment and SHORT in another).
 */

import {
  ASSET_CLASSES,
  type AssetClass,
  type Bias,
  type Conviction,
  type ClassInput,
  type RegimeInput,
} from './types';

/** Word-boundary, case-insensitive keyword families mapping text -> asset class. */
const CLASS_KEYWORDS: Record<AssetClass, readonly string[]> = {
  crypto: ['crypto', 'btc', 'bitcoin'],
  commodities: ['gold', 'oil', 'commodity', 'commodities'],
  stocks: ['stocks', 'equities', 'equity'],
  forex: ['forex', 'fx', 'eurusd', 'gbpusd', 'usd', 'currency'],
  indices: ['indices', 'spx', 'nasdaq', 'index', 'sp500'],
};

/** Directional bias keyword families. */
const LONG_WORDS = ['long', 'bull', 'bullish', 'up', 'buy'] as const;
const SHORT_WORDS = ['short', 'bear', 'bearish', 'down', 'sell'] as const;
/** Words that explicitly assert "no directional edge" => NONE bias, conviction 0. */
const NONE_WORDS = ['flat', 'neutral', 'range', 'sideways', 'chop', 'none', 'no edge'] as const;

/** Conviction qualifier families, highest precedence first. */
const STRONG_WORDS = ['strong', 'high', 'max', 'conviction', 'aggressive'] as const;
const MEDIUM_WORDS = ['medium', 'moderate'] as const;
const WEAK_WORDS = ['weak', 'slight', 'small', 'low'] as const;

/** Compile a `\b…\b` case-insensitive matcher for a (possibly multi-word) keyword. */
function wordRegex(keyword: string): RegExp {
  // Allow internal whitespace runs (e.g. "no edge") to match any whitespace.
  const escaped = keyword
    .split(/\s+/)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

function anyMatch(segment: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => wordRegex(kw).test(segment));
}

/** Which asset classes does this segment mention? */
function classesInSegment(segment: string): AssetClass[] {
  const hits: AssetClass[] = [];
  for (const cls of ASSET_CLASSES) {
    if (anyMatch(segment, CLASS_KEYWORDS[cls])) hits.push(cls);
  }
  return hits;
}

/** Resolve conviction from a segment given a directional (non-NONE) bias. */
function convictionFor(segment: string): Conviction {
  if (anyMatch(segment, STRONG_WORDS)) return 3;
  if (anyMatch(segment, MEDIUM_WORDS)) return 2;
  if (anyMatch(segment, WEAK_WORDS)) return 1;
  // Directional bias present with no qualifier => 2 (per contract).
  return 2;
}

/** Per-segment bias resolution. Returns a discriminated result. */
type SegmentBias =
  | { kind: 'long' | 'short' | 'none' }
  | { kind: 'conflict' }
  | { kind: 'absent' };

function resolveBias(segment: string): SegmentBias {
  const hasLong = anyMatch(segment, LONG_WORDS);
  const hasShort = anyMatch(segment, SHORT_WORDS);
  const hasNone = anyMatch(segment, NONE_WORDS);

  if (hasLong && hasShort) return { kind: 'conflict' };
  if (hasLong) return { kind: 'long' };
  if (hasShort) return { kind: 'short' };
  if (hasNone) return { kind: 'none' };
  return { kind: 'absent' };
}

/** Accumulated parse state per class before we decide ok/clarify. */
interface ClassParse {
  input: ClassInput;
  /** True if any segment mentioned this class. */
  mentioned: boolean;
  /** Set when a class had conflicting directions (within or across segments). */
  conflict: boolean;
  /** Set when a segment mentioned the class but had no parseable direction. */
  noDirection: boolean;
  /** The directional bias resolved so far (LONG/SHORT), to catch cross-segment flips. */
  resolvedDirection: 'LONG' | 'SHORT' | null;
}

/**
 * Parse a free-text admin note into a full {@link RegimeInput}, or return a
 * single clarifying question when the note is genuinely ambiguous.
 */
export function parseAdminNote(
  text: string,
): { ok: true; input: RegimeInput } | { ok: false; clarify: string } {
  const state = {} as Record<AssetClass, ClassParse>;
  for (const cls of ASSET_CLASSES) {
    state[cls] = {
      input: { bias: 'NONE', conviction: 0, thesis: '' },
      mentioned: false,
      conflict: false,
      noDirection: false,
      resolvedDirection: null,
    };
  }

  const segments = (text ?? '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const segment of segments) {
    const hits = classesInSegment(segment);
    if (hits.length === 0) continue; // orphan bias / noise: ignore.

    const bias = resolveBias(segment);

    for (const cls of hits) {
      const slot = state[cls];
      slot.mentioned = true;
      // First non-empty thesis mention wins; keep the raw segment text.
      if (slot.input.thesis === '') slot.input.thesis = segment;

      if (bias.kind === 'conflict') {
        slot.conflict = true;
        continue;
      }
      if (bias.kind === 'absent') {
        slot.noDirection = true;
        continue;
      }
      if (bias.kind === 'none') {
        slot.input = { ...slot.input, bias: 'NONE', conviction: 0 };
        continue;
      }
      const resolved: 'LONG' | 'SHORT' = bias.kind === 'long' ? 'LONG' : 'SHORT';
      // Cross-segment conflict: this class already resolved the opposite direction.
      if (slot.resolvedDirection && slot.resolvedDirection !== resolved) {
        slot.conflict = true;
        continue;
      }
      slot.resolvedDirection = resolved;
      slot.input = {
        ...slot.input,
        bias: resolved as Bias,
        conviction: convictionFor(segment),
      };
    }
  }

  // Ambiguity check, in ASSET_CLASSES order — first problematic class wins the
  // single clarifying question. A class is problematic if it had conflicting
  // directions, OR was mentioned but never resolved a direction.
  for (const cls of ASSET_CLASSES) {
    const slot = state[cls];
    if (!slot.mentioned) continue;
    if (slot.conflict) {
      return {
        ok: false,
        clarify: `You set conflicting directions for ${cls}. Should ${cls} be LONG, SHORT, or NONE this week?`,
      };
    }
    // Mentioned, no NONE word, no direction resolved => can't tell the bias.
    if (slot.noDirection && slot.input.bias === 'NONE' && slot.input.conviction === 0) {
      return {
        ok: false,
        clarify: `You mentioned ${cls} but no direction. Should ${cls} be LONG, SHORT, or NONE this week?`,
      };
    }
  }

  const input = {} as RegimeInput;
  for (const cls of ASSET_CLASSES) {
    input[cls] = state[cls].input;
  }
  return { ok: true, input };
}

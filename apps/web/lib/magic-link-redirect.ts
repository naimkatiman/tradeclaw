import { safeNext } from './oauth-state';

/**
 * Redirect intent carried through the magic-link flow so a user who started
 * on a specific page, then chose "email me a sign-in link", lands back there
 * instead of a generic dashboard. Mirrors the `next` that the OAuth state
 * blob preserves.
 */
export interface MagicLinkIntent {
  next?: string | null;
}

export interface SanitizedIntent {
  next?: string;
}

/**
 * Drop anything that isn't a safe redirect target. `next` is run through the
 * shared safeNext (same-origin relative paths only) so the magic link can
 * never become an open redirect.
 */
export function sanitizeIntent(intent: MagicLinkIntent): SanitizedIntent {
  const out: SanitizedIntent = {};
  const n = safeNext(intent.next ?? undefined);
  if (n) out.next = n;
  return out;
}

/**
 * Query-string fragment (with a leading '&') of sanitized intent params, for
 * appending to the emailed verify link. Empty string when there is no intent.
 */
export function buildVerifyIntentQuery(intent: MagicLinkIntent): string {
  const s = sanitizeIntent(intent);
  const p = new URLSearchParams();
  if (s.next) p.set('next', s.next);
  const qs = p.toString();
  return qs ? `&${qs}` : '';
}

/**
 * Post-verify redirect target: honor a safe `next`, else /dashboard. Values
 * are re-sanitized here because the verify link query is attacker-visible.
 */
export function resolveMagicLinkTarget(intent: MagicLinkIntent, origin: string): string {
  const s = sanitizeIntent(intent);
  if (s.next) return new URL(s.next, origin).toString();
  return new URL('/dashboard', origin).toString();
}

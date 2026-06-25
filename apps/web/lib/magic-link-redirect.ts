import { safeNext } from './oauth-state';

/**
 * Checkout-intent carried through the magic-link flow so a user who started a
 * purchase, then chose "email me a sign-in link", lands back on checkout
 * instead of a generic dashboard. Mirrors the priceId/tier/interval/next that
 * the Google OAuth state blob already preserves.
 */
export interface MagicLinkIntent {
  priceId?: string | null;
  tier?: string | null;
  interval?: string | null;
  next?: string | null;
}

export interface SanitizedIntent {
  priceId?: string;
  tier?: string;
  interval?: string;
  next?: string;
}

const TIERS = new Set(['pro', 'elite']);
const INTERVALS = new Set(['monthly', 'annual']);
// Stripe price ids look like `price_…`; the checkout route re-validates the
// price→tier mapping, this is just a cheap shape guard before it travels.
const PRICE_ID_RE = /^price_[A-Za-z0-9]+$/;

/**
 * Drop anything that isn't a recognized checkout intent value. `next` is run
 * through the shared safeNext (same-origin relative paths only) so the magic
 * link can never become an open redirect.
 */
export function sanitizeIntent(intent: MagicLinkIntent): SanitizedIntent {
  const out: SanitizedIntent = {};
  if (typeof intent.priceId === 'string' && PRICE_ID_RE.test(intent.priceId)) {
    out.priceId = intent.priceId;
  }
  if (typeof intent.tier === 'string' && TIERS.has(intent.tier)) {
    out.tier = intent.tier;
  }
  if (typeof intent.interval === 'string' && INTERVALS.has(intent.interval)) {
    out.interval = intent.interval;
  }
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
  if (s.priceId) p.set('priceId', s.priceId);
  if (s.tier) p.set('tier', s.tier);
  if (s.interval) p.set('interval', s.interval);
  if (s.next) p.set('next', s.next);
  const qs = p.toString();
  return qs ? `&${qs}` : '';
}

/**
 * Post-verify redirect target, mirroring the Google OAuth callback exactly:
 * a checkout payload (priceId, or tier=pro + interval) bounces through /signin
 * — whose client effect fires the checkout POST once the session cookie is set
 * — otherwise honor a safe `next`, else /dashboard. All values are re-sanitized
 * here because the verify link query is attacker-visible.
 */
export function resolveMagicLinkTarget(intent: MagicLinkIntent, origin: string): string {
  const s = sanitizeIntent(intent);
  const hasCheckoutPayload =
    !!s.priceId || (s.tier === 'pro' && (s.interval === 'monthly' || s.interval === 'annual'));

  if (hasCheckoutPayload) {
    const target = new URL('/signin', origin);
    if (s.priceId) target.searchParams.set('priceId', s.priceId);
    if (s.tier) target.searchParams.set('tier', s.tier);
    if (s.interval) target.searchParams.set('interval', s.interval);
    if (s.next) target.searchParams.set('next', s.next);
    return target.toString();
  }
  if (s.next) return new URL(s.next, origin).toString();
  return new URL('/dashboard', origin).toString();
}

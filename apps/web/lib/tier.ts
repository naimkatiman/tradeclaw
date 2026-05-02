import type { Tier } from './stripe';
import { TIER_LEVEL } from './stripe';
import type { TradingSignal } from '../app/lib/signals';
import { FREE_HISTORY_DAYS, FREE_SYMBOLS, isFreeSymbol } from './tier-client';

export { TIER_LEVEL, FREE_HISTORY_DAYS, FREE_SYMBOLS, isFreeSymbol };
export type { Tier };

const ALL_SYMBOLS = [
  'XAUUSD',
  'XAGUSD',
  'BTCUSD',
  'ETHUSD',
  'XRPUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'NZDUSD',
  'USDCHF',
  // Commodities (Pro+) — oil
  'WTIUSD',
  'BNOUSD',
  // Stocks (Pro+) — US mega-caps + index ETFs
  'NVDAUSD',
  'TSLAUSD',
  'AAPLUSD',
  'MSFTUSD',
  'GOOGLUSD',
  'AMZNUSD',
  'METAUSD',
  'SPYUSD',
  'QQQUSD',
];

// Symbols accessible per tier. Custom tier inherits Elite's coverage by default —
// bespoke symbol lists are negotiated out-of-band per deal.
export const TIER_SYMBOLS: Record<Tier, string[]> = {
  free: [...FREE_SYMBOLS],
  pro: ALL_SYMBOLS,
  elite: ALL_SYMBOLS,
  custom: ALL_SYMBOLS,
};

// History window per tier (free derived from FREE_HISTORY_DAYS for single source of truth)
export const TIER_HISTORY_DAYS: Record<Tier, number | null> = {
  free: FREE_HISTORY_DAYS,
  pro: null, // unlimited
  elite: null,
  custom: null,
};

// Signal delay in ms (free gets 15-min delay)
export const TIER_DELAY_MS: Record<Tier, number> = {
  free: 15 * 60 * 1000,
  pro: 0,
  elite: 0,
  custom: 0,
};

/**
 * Public-safe stub for a delayed free-tier signal.
 *
 * Free callers see this in a separate `lockedSignals` array on the
 * dashboard's `/api/signals` response. Carries only the fields needed to
 * render a countdown card and an upgrade CTA — no price levels, no
 * indicators. Network inspection cannot reveal the trade.
 */
export interface LockedSignalStub {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  timeframe: string;
  confidence: number;
  /** ISO timestamp when the signal becomes visible to the free tier. */
  availableAt: string;
  locked: true;
}

/**
 * Build a `LockedSignalStub` from a full signal. The stub is intentionally
 * narrow — adding fields here is a privacy/disclosure decision, not a
 * convenience one.
 */
export function toLockedStub(
  signal: Pick<TradingSignal, 'id' | 'symbol' | 'direction' | 'timeframe' | 'confidence' | 'timestamp'>,
  delayMs: number,
): LockedSignalStub {
  const publishedMs = new Date(signal.timestamp).getTime();
  return {
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction as 'BUY' | 'SELL',
    timeframe: signal.timeframe,
    confidence: signal.confidence,
    availableAt: new Date(publishedMs + delayMs).toISOString(),
    locked: true,
  };
}

/**
 * Pro-tier signals include higher-confidence MTF confluence signals
 * that free users don't see. This threshold gates the "premium" band.
 */
export const PRO_PREMIUM_MIN_CONFIDENCE = 85;

/**
 * Single source of truth for the strategies a Pro tier unlocks.
 *
 * Mirrors `ALLOWED_PREMIUM_STRATEGIES` from `./licenses` plus the always-free
 * `classic` strategy. Hardcoded here so the canonical access API does NOT
 * depend on the license module — the license system is being retired and the
 * dependency direction is intentionally inverted.
 *
 * If this list drifts from `licenses.ts`, the cross-check test in
 * `tier.test.ts` will fail. Keep them in sync until `licenses.ts` is removed.
 */
const PRO_STRATEGIES: ReadonlySet<string> = new Set([
  // Always-free preset
  'classic',
  // Built-in TA presets
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
  // TradingView Pine-Script strategies (via /api/webhooks/tradingview)
  'tv-zaky-classic',
  'tv-hafiz-synergy',
  'tv-impulse-hunter',
]);

/**
 * Strategies a tier is allowed to read.
 *
 * Returns a fresh `Set` per call so callers can mutate it locally without
 * affecting other callers or the module-scope source of truth.
 *
 * Today: free → `classic` only; pro/elite/custom → all `PRO_STRATEGIES`.
 * Custom inherits Elite by default per the existing `TIER_SYMBOLS` pattern.
 */
export function getStrategiesForTier(tier: Tier): Set<string> {
  switch (tier) {
    case 'free':
      return new Set(['classic']);
    case 'pro':
    case 'elite':
    case 'custom':
      return new Set(PRO_STRATEGIES);
    default: {
      // Exhaustiveness check — if `Tier` grows, tsc errors here so the
      // monetization gate can't silently grant Pro access to a new tier.
      const _exhaustive: never = tier;
      void _exhaustive;
      return new Set(['classic']);
    }
  }
}

/**
 * Resolved access surface for an incoming request — the canonical access API
 * that downstream phases (B-D) will migrate license-key readers onto.
 *
 * Carries the caller's tier alongside the strategy set they're allowed to
 * read so consumers can gate by tier OR strategy without re-deriving either.
 */
export interface AccessContext {
  tier: Tier;
  unlockedStrategies: Set<string>;
}

/**
 * Resolve the caller's `AccessContext` from an incoming Request.
 *
 * Fail-closed: any error → `{ tier: 'free', unlockedStrategies: new Set(['classic']) }`.
 * Mirrors `getTierFromRequest`'s posture so a thrown error in session/DB
 * lookup never accidentally upgrades a caller.
 */
export async function resolveAccessContext(req: Request): Promise<AccessContext> {
  try {
    const tier = await getTierFromRequest(req);
    return { tier, unlockedStrategies: getStrategiesForTier(tier) };
  } catch {
    return { tier: 'free', unlockedStrategies: new Set(['classic']) };
  }
}

/**
 * Resolve the caller's `AccessContext` from the next/headers cookie store.
 *
 * Use from server components / RSC paths that don't have a Request in hand.
 * Same fail-closed posture as `resolveAccessContext`.
 */
export async function resolveAccessContextFromCookies(): Promise<AccessContext> {
  try {
    const { readSessionFromCookies } = await import('./user-session');
    const session = await readSessionFromCookies();
    if (!session?.userId) {
      return { tier: 'free', unlockedStrategies: getStrategiesForTier('free') };
    }
    const tier = await getUserTier(session.userId);
    return { tier, unlockedStrategies: getStrategiesForTier(tier) };
  } catch {
    return { tier: 'free', unlockedStrategies: getStrategiesForTier('free') };
  }
}

/**
 * Days a past_due subscription continues to count as paid before it
 * downgrades to free. Stripe Smart Retries run for ~3 weeks; cutting
 * access at the first failed invoice churns customers whose card needed
 * one update. We give them a window to fix it without losing signals.
 */
export const PAST_DUE_GRACE_DAYS = 7;

/**
 * Retrieve the tier for a given user ID from the database.
 * Falls back to 'free' if no active subscription is found.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  // Avoid importing DB at top-level so this module is safe in edge runtimes
  // that don't have DB access. Callers that need real tier checks should
  // import this only in Node.js API routes.
  try {
    const { getUserSubscription, getUserById } = await import('./db');
    const sub = await getUserSubscription(userId);
    let tier: Tier = 'free';
    if (sub) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        tier = sub.tier as Tier;
      } else if (sub.status === 'past_due') {
        // Smart-retries grace: keep paid access for PAST_DUE_GRACE_DAYS
        // past current_period_end so customers whose card needs an update
        // for one cycle do not lose signals on day 1 of past_due.
        const graceMs = PAST_DUE_GRACE_DAYS * 86400 * 1000;
        if (Date.now() <= sub.currentPeriodEnd.getTime() + graceMs) {
          tier = sub.tier as Tier;
        }
      }
    }

    // Email-based Pro grant: owner / team / demo accounts that don't have a
    // Stripe sub but should still see Pro features. Admin emails are also
    // granted Pro automatically so admin dashboards aren't gated by billing.
    // The deep check consults both the PRO_EMAILS env (bootstrap) and the
    // admin-granted pro_email_grants table.
    if (tier === 'free') {
      const user = await getUserById(userId);
      if (user?.email) {
        const { isProGrantedEmailDeep, isAdminEmail } = await import('./admin-emails');
        if (isAdminEmail(user.email) || (await isProGrantedEmailDeep(user.email))) {
          tier = 'pro';
        }
      }
    }
    return tier;
  } catch {
    return 'free';
  }
}

/**
 * Filter a list of signals to only include what the tier is allowed to see.
 * Applies symbol filtering, TP level masking, and delay offset.
 */
export function filterSignalByTier(
  signal: TradingSignal,
  tier: Tier
): TradingSignal | null {
  const allowedSymbols = TIER_SYMBOLS[tier];
  if (!allowedSymbols.includes(signal.symbol)) return null;

  // Premium band: signals at or above PRO_PREMIUM_MIN_CONFIDENCE are Pro-only.
  // Free callers get the "Standard" band (70-84) — Pro sees the full range.
  if (tier === 'free' && signal.confidence >= PRO_PREMIUM_MIN_CONFIDENCE) {
    return null;
  }

  const filtered: TradingSignal = { ...signal };

  // Mask TP2/TP3 for free tier
  if (tier === 'free') {
    filtered.takeProfit2 = null;
    filtered.takeProfit3 = null;
  }

  // Mask advanced indicators for free tier
  if (tier === 'free') {
    filtered.indicators = {
      ...signal.indicators,
      macd: { histogram: 0, signal: 'neutral' },
      bollingerBands: { position: 'middle', bandwidth: 0 },
      stochastic: { k: 0, d: 0, signal: 'neutral' },
    };
  }

  return filtered;
}

/**
 * Check whether a user tier meets the minimum required tier.
 */
export function meetsMinimumTier(userTier: Tier, minimumTier: Tier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[minimumTier];
}

/**
 * Resolve the caller's tier from an incoming Request.
 *
 * Fail-closed: any error during session read or DB lookup resolves to
 * 'free' — the least-privileged tier. Anonymous callers are 'free'.
 *
 * Used by every tier-gated API route so gating logic is uniform and
 * has one failure mode (treat as free) instead of a mix of 401/500/free.
 */
export async function getTierFromRequest(req: Request): Promise<Tier> {
  try {
    const { readSessionFromRequest } = await import('./user-session');
    const session = readSessionFromRequest(req as unknown as import('next/server').NextRequest);
    if (!session?.userId) return 'free';
    return await getUserTier(session.userId);
  } catch {
    return 'free';
  }
}

/**
 * Stable body shape for HTTP 402 "upgrade required" responses across every
 * tier-gated API route. Clients (UI, curl, scripts) can branch on
 * `error === 'upgrade_required'` without string-matching human copy.
 */
export interface UpgradeRequiredBody {
  error: 'upgrade_required';
  reason: string;
  limit?: {
    kind: 'rate' | 'count';
    used: number;
    max: number;
    windowHours?: number;
  };
  upgradeUrl: string;
}

export function upgradeRequiredBody(input: {
  reason: string;
  source: string;
  limit?: UpgradeRequiredBody['limit'];
}): UpgradeRequiredBody {
  return {
    error: 'upgrade_required',
    reason: input.reason,
    upgradeUrl: `/pricing?from=${encodeURIComponent(input.source)}`,
    ...(input.limit ? { limit: input.limit } : {}),
  };
}

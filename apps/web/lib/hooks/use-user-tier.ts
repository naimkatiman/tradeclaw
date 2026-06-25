'use client';

import { useEffect, useState } from 'react';

export type ClientTier = 'free' | 'pro' | 'elite' | 'custom';
export type ClientSubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | null;
export type ClientAuthProvider = 'google' | 'github' | 'telegram' | null;

export interface ClientSession {
  userId: string;
  email: string;
  tier: ClientTier;
  isAdmin: boolean;
  /**
   * Raw subscription state from Stripe. `tier` already accounts for the
   * past_due grace window via `getUserTier`; this field is the unmasked
   * billing state used by the past-due banner to nudge the user before the
   * grace expires. `null` means no Stripe sub on file (free or email-grant).
   */
  subscriptionStatus: ClientSubscriptionStatus;
  /** Period end of the current billing cycle. Used to compute the grace deadline. */
  currentPeriodEnd: string | null;
  /**
   * Stripe sub is set to cancel when the current period ends. Surfaced so the
   * billing page can show a "Cancels on <date>" banner — otherwise a user who
   * clicked Cancel in the Stripe portal sees no indication on tradeclaw.win
   * until access actually drops at period end.
   */
  cancelAtPeriodEnd: boolean;
  /**
   * ISO timestamp of the trial cut-off. Drives the trial countdown banner —
   * shown only when subscriptionStatus === 'trialing' and this is in the
   * future. Null for non-trial subs.
   */
  trialEnd: string | null;
  /** Display name from Google's `name` or GitHub's `name`/`login`. Null for legacy email-only rows. */
  displayName: string | null;
  /** Profile image from Google `picture` or GitHub `avatar_url`. Always https. */
  avatarUrl: string | null;
  /** Provider used for the row's first-ever sign-in. Never updated thereafter. */
  authProvider: ClientAuthProvider;
  /** Affiliate referral code for the 20% revenue-share program. */
  referralCode?: string;
}

interface SessionResponse {
  success: boolean;
  data: ClientSession | null;
}

export interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous';
  session: ClientSession | null;
}

/**
 * Client hook that resolves the signed-in user's full session from
 * /api/auth/session. Returns a discriminated state so consumers can
 * distinguish "still loading" from "signed out".
 */
export function useUserSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    session: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const json = (await res.json()) as SessionResponse;
        if (cancelled) return;
        if (json.data) {
          setState({ status: 'authenticated', session: json.data });
        } else {
          setState({ status: 'anonymous', session: null });
        }
      } catch {
        if (!cancelled) setState({ status: 'anonymous', session: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Convenience hook: returns just the tier string or null. Treat null as
 * "free" for gating purposes at render time — anonymous visitors share
 * the free tier's UX (locked TPs, 24h history, etc.) since the server has
 * already filtered their signal payload.
 */
export function useUserTier(): ClientTier | null {
  const { session } = useUserSession();
  return session?.tier ?? null;
}

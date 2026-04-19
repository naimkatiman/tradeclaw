'use client';

import { useEffect, useState } from 'react';

export type ClientTier = 'free' | 'pro' | 'elite' | 'custom';

export interface ClientSession {
  userId: string;
  email: string;
  tier: ClientTier;
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

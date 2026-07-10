'use client';

import { useEffect, useState } from 'react';

export type ClientAuthProvider = 'google' | 'github' | 'telegram' | null;

export interface ClientSession {
  userId: string;
  email: string;
  isAdmin: boolean;
  /** Display name from Google's `name` or GitHub's `name`/`login`. Null for legacy email-only rows. */
  displayName: string | null;
  /** Profile image from Google `picture` or GitHub `avatar_url`. Always https. */
  avatarUrl: string | null;
  /** Provider used for the row's first-ever sign-in. Never updated thereafter. */
  authProvider: ClientAuthProvider;
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
 * Client hook that resolves the signed-in user's session from
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

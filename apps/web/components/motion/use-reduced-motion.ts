'use client';

/**
 * Single source of truth for the reduced-motion preference.
 * SSR-safe: the server snapshot is `false`; the client syncs to
 * matchMedia and live-updates on preference change.
 * useSyncExternalStore avoids the setState-in-effect the lint rule forbids.
 */

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

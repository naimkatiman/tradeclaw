'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from '../motion/use-reduced-motion';
import {
  getPublicClawBackdropVariant,
  shouldAnimatePublicClawBackdrop,
} from '../../lib/public-brand-routes';

const RemotionClawPlayer = dynamic(
  () => import('./remotion-claw-player').then((module) => module.RemotionClawPlayer),
  { ssr: false },
);

const DESKTOP_MOTION_QUERY = '(min-width: 1024px)';

function subscribeDesktop(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useDesktopViewport(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_MOTION_QUERY).matches,
    () => false,
  );
}

/**
 * Site-wide decorative sculpture layer.
 *
 * Remotion is client-only and only mounts on desktop when motion is allowed.
 * Mobile, first paint, and reduced-motion visitors receive the complete static
 * composition. The layer is aria-hidden and cannot intercept interaction.
 */
export function GlobalClawBackdrop() {
  const pathname = usePathname() ?? '/';
  const variant = getPublicClawBackdropVariant(pathname);
  const reducedMotion = useReducedMotion();
  const desktopViewport = useDesktopViewport();
  const shouldAnimate = shouldAnimatePublicClawBackdrop({
    variant,
    desktopViewport,
    reducedMotion,
  });
  const [playerReady, setPlayerReady] = useState(false);
  const markPlayerReady = useCallback(() => setPlayerReady(true), []);

  const motionState = shouldAnimate
    ? playerReady
      ? 'active'
      : 'loading'
    : 'static';

  if (variant === null) return null;

  return (
    <div
      className="global-claw-backdrop"
      data-motion={motionState}
      data-variant={variant}
      data-testid="global-claw-backdrop"
      aria-hidden="true"
    >
      <div className="global-claw-backdrop__stage">
        <div className="global-claw-backdrop__static">
          <span className="global-claw-backdrop__asset global-claw-backdrop__asset--market" />
          <span className="global-claw-backdrop__asset global-claw-backdrop__asset--orbit" />
          <span className="global-claw-backdrop__asset global-claw-backdrop__asset--shard" />
        </div>
        {shouldAnimate && (
          <RemotionClawPlayer variant={variant} onReady={markPlayerReady} />
        )}
      </div>
    </div>
  );
}

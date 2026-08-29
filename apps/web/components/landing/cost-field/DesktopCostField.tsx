'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';
const CostFieldHero = dynamic(
  () => import('./CostFieldHero').then((module) => module.CostFieldHero),
  {
    ssr: false,
    loading: () => (
      <div className="premium-grid-bg h-full w-full opacity-40" aria-hidden="true" />
    ),
  },
);

/**
 * Avoids fetching the WebGL dataset or loading Three.js for a visualization
 * that the mobile hero intentionally does not render.
 */
export function DesktopCostField() {
  const enabled = useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(DESKTOP_QUERY);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );

  if (!enabled) {
    return (
      <div className="premium-grid-bg h-full w-full opacity-40" aria-hidden="true" />
    );
  }

  return <CostFieldHero />;
}

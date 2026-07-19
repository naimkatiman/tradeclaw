'use client';

/**
 * MarketingChromeGate — keeps floating widgets and product chrome OFF the
 * layer-1 marketing surface (DESIGN.md Layering: one idea, one action, zero
 * interruptions). Client-side pathname gate, same pattern as
 * StarProgressBar's /embed check. This wrapper is the ONLY thing keeping
 * MobileNav off layer 1 — the widgets gate themselves further, MobileNav
 * does not.
 */

import { usePathname } from 'next/navigation';

const LAYER_ONE_ROUTES = new Set(['/', '/es', '/ms', '/zh', '/ar']);

export function MarketingChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (LAYER_ONE_ROUTES.has(pathname)) return null;
  return <>{children}</>;
}

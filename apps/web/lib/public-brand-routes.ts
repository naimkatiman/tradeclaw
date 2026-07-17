export type PublicClawBackdropVariant = 'hero' | 'ambient';

const HERO_ROUTES = new Set(['/', '/ar', '/es', '/ms', '/zh']);

// Explicit allowlist: the root layout is also shared by admin, product,
// third-party embed, widget, badge, and EarningsEdge surfaces. New routes must
// opt in instead of inheriting TradeClaw marketing decoration accidentally.
const AMBIENT_ROUTE_ROOTS = [
  '/api-docs',
  '/awesome',
  '/benchmark',
  '/blog',
  '/calibration',
  '/chrome-extension',
  '/compare',
  '/confidence',
  '/contribute',
  '/contributors',
  '/data-freshness',
  '/developer',
  '/discord',
  '/docs',
  '/examples',
  '/exchanges',
  '/explain',
  '/faq',
  '/github-action',
  '/glossary',
  '/how-it-works',
  '/indicators',
  '/launch',
  '/marketplace',
  '/methodology',
  '/notion',
  '/open-data',
  '/performance',
  '/pine-to-tradeclaw',
  '/pledge',
  '/plugins',
  '/pricing',
  '/privacy',
  '/producthunt',
  '/proof',
  '/replit',
  '/research',
  '/results',
  '/roadmap',
  '/security',
  '/showcase',
  '/slack',
  '/sponsor',
  '/sponsors',
  '/star',
  '/start',
  '/status',
  '/subscribe',
  '/telegram',
  '/terms',
  '/tradingview-alerts',
  '/vs-tradingview',
  '/waitlist',
  '/why-long-term',
  '/zapier',
] as const;

function isRouteOrChild(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function getPublicClawBackdropVariant(
  pathname: string,
): PublicClawBackdropVariant | null {
  if (HERO_ROUTES.has(pathname)) return 'hero';
  return AMBIENT_ROUTE_ROOTS.some((root) => isRouteOrChild(pathname, root))
    ? 'ambient'
    : null;
}

export function shouldAnimatePublicClawBackdrop({
  variant,
  desktopViewport,
  reducedMotion,
}: {
  variant: PublicClawBackdropVariant | null;
  desktopViewport: boolean;
  reducedMotion: boolean;
}): boolean {
  return variant !== null && desktopViewport && !reducedMotion;
}

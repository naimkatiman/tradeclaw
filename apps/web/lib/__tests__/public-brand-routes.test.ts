import {
  getPublicClawBackdropVariant,
  shouldAnimatePublicClawBackdrop,
} from '../public-brand-routes';

describe('getPublicClawBackdropVariant', () => {
  it.each(['/', '/ar', '/es', '/ms', '/zh'])(
    'uses the reference-led hero composition on %s',
    (pathname) => {
      expect(getPublicClawBackdropVariant(pathname)).toBe('hero');
    },
  );

  it.each([
    '/research',
    '/research/method-note',
    '/docs',
    '/docs/self-hosting',
    '/blog/evidence-first',
    '/pricing',
  ])('uses the quiet ambient composition on %s', (pathname) => {
    expect(getPublicClawBackdropVariant(pathname)).toBe('ambient');
  });

  it.each([
    '/admin/login',
    '/dashboard',
    '/screener',
    '/chart/BTCUSDT',
    '/signal/123',
    '/alerts',
    '/settings',
    '/execution',
    '/embed/signal/123',
    '/widget/market',
    '/badge/build',
    '/earningsedge',
    '/earningsedge/dashboard',
  ])('keeps the backdrop off operational and foreign-brand route %s', (pathname) => {
    expect(getPublicClawBackdropVariant(pathname)).toBeNull();
  });

  it('matches route boundaries instead of similarly prefixed names', () => {
    expect(getPublicClawBackdropVariant('/research-notes')).toBeNull();
    expect(getPublicClawBackdropVariant('/blogger')).toBeNull();
  });
});

describe('shouldAnimatePublicClawBackdrop', () => {
  it('animates only an allowlisted desktop route without reduced motion', () => {
    expect(
      shouldAnimatePublicClawBackdrop({
        variant: 'ambient',
        desktopViewport: true,
        reducedMotion: false,
      }),
    ).toBe(true);
  });

  it.each([
    { variant: null, desktopViewport: true, reducedMotion: false },
    { variant: 'hero' as const, desktopViewport: false, reducedMotion: false },
    { variant: 'hero' as const, desktopViewport: true, reducedMotion: true },
  ])('keeps Remotion unmounted for %o', (conditions) => {
    expect(shouldAnimatePublicClawBackdrop(conditions)).toBe(false);
  });
});

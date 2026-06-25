import {
  sanitizeIntent,
  buildVerifyIntentQuery,
  resolveMagicLinkTarget,
} from '../magic-link-redirect';

const ORIGIN = 'https://tradeclaw.win';

describe('sanitizeIntent', () => {
  it('keeps recognized checkout intent values', () => {
    expect(
      sanitizeIntent({ priceId: 'price_ABC123', tier: 'pro', interval: 'monthly', next: '/pricing?resume=checkout' }),
    ).toEqual({ priceId: 'price_ABC123', tier: 'pro', interval: 'monthly', next: '/pricing?resume=checkout' });
  });

  it('drops unrecognized tier / interval and malformed priceId', () => {
    expect(
      sanitizeIntent({ priceId: 'evil; DROP TABLE', tier: 'gold', interval: 'lifetime', next: undefined }),
    ).toEqual({});
  });

  it('rejects open-redirect next values (scheme-relative and absolute)', () => {
    expect(sanitizeIntent({ next: '//evil.com/phish' }).next).toBeUndefined();
    expect(sanitizeIntent({ next: 'https://evil.com' }).next).toBeUndefined();
    expect(sanitizeIntent({ next: '/dashboard' }).next).toBe('/dashboard');
  });
});

describe('buildVerifyIntentQuery', () => {
  it('returns an &-prefixed query of sanitized params', () => {
    const q = buildVerifyIntentQuery({ tier: 'pro', interval: 'annual' });
    expect(q.startsWith('&')).toBe(true);
    const params = new URLSearchParams(q.slice(1));
    expect(params.get('tier')).toBe('pro');
    expect(params.get('interval')).toBe('annual');
  });

  it('is empty when there is no usable intent', () => {
    expect(buildVerifyIntentQuery({})).toBe('');
    expect(buildVerifyIntentQuery({ tier: 'gold', next: '//evil.com' })).toBe('');
  });
});

describe('resolveMagicLinkTarget', () => {
  it('bounces a priceId checkout payload through /signin so its auto-checkout fires', () => {
    const t = new URL(resolveMagicLinkTarget({ priceId: 'price_X1', next: '/pricing' }, ORIGIN));
    expect(t.pathname).toBe('/signin');
    expect(t.searchParams.get('priceId')).toBe('price_X1');
    expect(t.searchParams.get('next')).toBe('/pricing');
  });

  it('bounces a tier=pro + interval payload through /signin', () => {
    const t = new URL(resolveMagicLinkTarget({ tier: 'pro', interval: 'monthly' }, ORIGIN));
    expect(t.pathname).toBe('/signin');
    expect(t.searchParams.get('tier')).toBe('pro');
    expect(t.searchParams.get('interval')).toBe('monthly');
  });

  it('honors a safe next when there is no checkout payload', () => {
    expect(resolveMagicLinkTarget({ next: '/pricing?resume=checkout&interval=annual' }, ORIGIN)).toBe(
      `${ORIGIN}/pricing?resume=checkout&interval=annual`,
    );
  });

  it('falls back to /dashboard for an unsafe next and no payload', () => {
    expect(resolveMagicLinkTarget({ next: '//evil.com/x' }, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
  });

  it('falls back to /dashboard with no intent', () => {
    expect(resolveMagicLinkTarget({}, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
  });

  it('does not treat tier=pro WITHOUT a valid interval as a checkout payload', () => {
    // No interval → not a payload → honor next instead of bouncing to /signin.
    expect(resolveMagicLinkTarget({ tier: 'pro', next: '/dashboard/billing' }, ORIGIN)).toBe(
      `${ORIGIN}/dashboard/billing`,
    );
  });
});

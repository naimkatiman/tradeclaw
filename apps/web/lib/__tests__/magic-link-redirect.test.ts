import {
  sanitizeIntent,
  buildVerifyIntentQuery,
  resolveMagicLinkTarget,
} from '../magic-link-redirect';

const ORIGIN = 'https://tradeclaw.win';

describe('sanitizeIntent', () => {
  it('keeps a safe same-origin next', () => {
    expect(sanitizeIntent({ next: '/track-record?scope=all' })).toEqual({
      next: '/track-record?scope=all',
    });
  });

  it('rejects open-redirect next values (scheme-relative and absolute)', () => {
    expect(sanitizeIntent({ next: '//evil.com/phish' }).next).toBeUndefined();
    expect(sanitizeIntent({ next: 'https://evil.com' }).next).toBeUndefined();
    expect(sanitizeIntent({ next: '/dashboard' }).next).toBe('/dashboard');
  });
});

describe('buildVerifyIntentQuery', () => {
  it('returns an &-prefixed query of the sanitized next', () => {
    const q = buildVerifyIntentQuery({ next: '/dashboard' });
    expect(q.startsWith('&')).toBe(true);
    const params = new URLSearchParams(q.slice(1));
    expect(params.get('next')).toBe('/dashboard');
  });

  it('is empty when there is no usable intent', () => {
    expect(buildVerifyIntentQuery({})).toBe('');
    expect(buildVerifyIntentQuery({ next: '//evil.com' })).toBe('');
  });
});

describe('resolveMagicLinkTarget', () => {
  it('honors a safe next', () => {
    expect(resolveMagicLinkTarget({ next: '/track-record?scope=all' }, ORIGIN)).toBe(
      `${ORIGIN}/track-record?scope=all`,
    );
  });

  it('falls back to /dashboard for an unsafe next', () => {
    expect(resolveMagicLinkTarget({ next: '//evil.com/x' }, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
  });

  it('falls back to /dashboard with no intent', () => {
    expect(resolveMagicLinkTarget({}, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
  });
});

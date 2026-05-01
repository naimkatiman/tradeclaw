import {
  createTelegramLinkToken,
  verifyTelegramLinkToken,
  TELEGRAM_LINK_TOKEN_TTL_SECONDS,
} from '../telegram-link-token';

describe('telegram-link-token', () => {
  const ORIGINAL_SECRET = process.env.USER_SESSION_SECRET;

  beforeEach(() => {
    process.env.USER_SESSION_SECRET = 'a-very-long-test-secret-key-1234567890';
  });

  afterAll(() => {
    process.env.USER_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('round-trips a userId through sign + verify', () => {
    const token = createTelegramLinkToken('user-123');
    const verified = verifyTelegramLinkToken(token);
    expect(verified?.userId).toBe('user-123');
    expect(typeof verified?.issuedAt).toBe('number');
  });

  it('rejects a tampered userId payload', () => {
    const token = createTelegramLinkToken('user-123');
    const [, issuedAt, sig] = token.split('.');
    const tampered = `victim.${issuedAt}.${sig}`;
    expect(verifyTelegramLinkToken(tampered)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = createTelegramLinkToken('user-123');
    const [userId, issuedAt] = token.split('.');
    const fakeSig = '0'.repeat(64);
    const tampered = `${userId}.${issuedAt}.${fakeSig}`;
    expect(verifyTelegramLinkToken(tampered)).toBeNull();
  });

  it('rejects expired tokens (issuedAt older than TTL)', () => {
    const expiredAt = Date.now() - (TELEGRAM_LINK_TOKEN_TTL_SECONDS + 60) * 1000;
    const realNow = Date.now;
    Date.now = () => expiredAt;
    const token = createTelegramLinkToken('user-123');
    Date.now = realNow;
    expect(verifyTelegramLinkToken(token)).toBeNull();
  });

  it('rejects future-dated tokens', () => {
    const futureAt = Date.now() + 60_000;
    const realNow = Date.now;
    Date.now = () => futureAt;
    const token = createTelegramLinkToken('user-123');
    Date.now = realNow;
    expect(verifyTelegramLinkToken(token)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(verifyTelegramLinkToken('')).toBeNull();
    expect(verifyTelegramLinkToken('only.two')).toBeNull();
    expect(verifyTelegramLinkToken('a.b.c.d')).toBeNull();
    expect(verifyTelegramLinkToken('a.notanumber.sig')).toBeNull();
  });

  it('does not validate against the user-session secret directly (domain separation)', () => {
    // A token signed with the raw USER_SESSION_SECRET (no domain separator)
    // must NOT verify as a telegram-link token. This guards against secret
    // reuse across token classes.
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    const issuedAt = Date.now();
    const payload = `user-123.${issuedAt}`;
    const sig = createHmac('sha256', process.env.USER_SESSION_SECRET as string)
      .update(payload)
      .digest('hex');
    const reusedToken = `${payload}.${sig}`;
    expect(verifyTelegramLinkToken(reusedToken)).toBeNull();
  });
});

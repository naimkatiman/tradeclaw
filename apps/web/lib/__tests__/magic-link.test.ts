import { hashToken, generateRawToken, isExpired, MAGIC_LINK_TTL_MS } from '../magic-link';

describe('magic-link primitives', () => {
  it('generateRawToken produces 32-byte url-safe strings', () => {
    const t = generateRawToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(t.length).toBeGreaterThanOrEqual(40);
  });

  it('hashToken is deterministic and 64 hex chars', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('isExpired flips past TTL', () => {
    const past = new Date(Date.now() - MAGIC_LINK_TTL_MS - 1000);
    const future = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    expect(isExpired(past)).toBe(true);
    expect(isExpired(future)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Race-safe consume: the second simultaneous click must not return ok:true.
// Mocks the underlying query function so we can simulate the race.
// ---------------------------------------------------------------------------

jest.mock('../db-pool', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

import { query } from '../db-pool';
import { consumeMagicLink, countRecentMagicLinkEmails } from '../magic-link';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('consumeMagicLink (single-shot UPDATE...RETURNING)', () => {
  beforeEach(() => mockedQuery.mockReset());

  it('returns ok with email when row was claimed', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        email: 'user@example.com',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    const result = await consumeMagicLink('raw-token-value');
    expect(result.ok).toBe(true);
    expect(result.email).toBe('user@example.com');
  });

  it('returns consumed when no row was claimed (race loser)', async () => {
    // Empty rows array == nothing matched UPDATE WHERE consumed_at IS NULL
    mockedQuery.mockResolvedValueOnce([]);
    const result = await consumeMagicLink('raw-token-value');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('consumed');
  });

  it('returns expired when claimed row already past TTL', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        email: 'user@example.com',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);
    const result = await consumeMagicLink('raw-token-value');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('expired');
  });
});

describe('countRecentMagicLinkEmails', () => {
  beforeEach(() => mockedQuery.mockReset());

  it('returns the count from the DB row', async () => {
    mockedQuery.mockResolvedValueOnce([{ count: '3' }]);
    const n = await countRecentMagicLinkEmails('user@example.com', 60);
    expect(n).toBe(3);
  });

  it('returns 0 when DB returns no rows', async () => {
    mockedQuery.mockResolvedValueOnce([]);
    const n = await countRecentMagicLinkEmails('user@example.com', 60);
    expect(n).toBe(0);
  });

  it('lowercases and trims the email before query', async () => {
    mockedQuery.mockResolvedValueOnce([{ count: '0' }]);
    await countRecentMagicLinkEmails('  USER@Example.com  ', 60);
    const callArgs = mockedQuery.mock.calls[0][1] as unknown[];
    expect(callArgs[0]).toBe('user@example.com');
  });
});

import { describe, it, expect } from 'vitest';
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
    const now = new Date();
    expect(isExpired(past)).toBe(true);
    expect(isExpired(now)).toBe(false);
  });
});

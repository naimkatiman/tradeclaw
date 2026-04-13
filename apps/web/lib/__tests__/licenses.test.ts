import { generateKey, hashKey } from '../licenses';

describe('licenses — key generation', () => {
  it('generateKey returns a plaintext, hash, and prefix', () => {
    const { plaintext, hash, prefix } = generateKey();
    expect(plaintext).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(prefix).toBe(plaintext.slice(0, 12));
  });

  it('generateKey produces unique keys', () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });

  it('hashKey is deterministic and matches generateKey hash', () => {
    const { plaintext, hash } = generateKey();
    expect(hashKey(plaintext)).toBe(hash);
  });

  it('hashKey produces a 64-char hex string', () => {
    expect(hashKey('anything')).toMatch(/^[a-f0-9]{64}$/);
  });
});

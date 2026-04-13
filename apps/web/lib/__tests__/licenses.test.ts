import { generateKey, hashKey } from '../licenses';
import {
  issueLicense,
  listLicenses,
  getLicenseById,
  addGrants,
  updateExpiry,
  updateIssuedTo,
  revokeLicense,
} from '../licenses';

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

describe('licenses — CRUD', () => {
  it('issueLicense returns plaintext once and persists hashed row', async () => {
    const { license, plaintextKey } = await issueLicense({
      issuedTo: 'test@example.com',
      strategies: ['hmm-top3'],
    });
    expect(plaintextKey).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(license.keyPrefix).toBe(plaintextKey.slice(0, 12));
    expect(license.status).toBe('active');

    const fetched = await getLicenseById(license.id);
    expect(fetched?.strategies).toEqual(['hmm-top3']);
  });

  it('addGrants is idempotent', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await addGrants(license.id, ['hmm-top3']); // duplicate
    await addGrants(license.id, ['vwap-ema-bb']);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.strategies.sort()).toEqual(['hmm-top3', 'vwap-ema-bb']);
  });

  it('revokeLicense flips status to revoked', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await revokeLicense(license.id);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.status).toBe('revoked');
  });

  it('updateExpiry accepts null for lifetime', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await updateExpiry(license.id, new Date('2099-01-01'));
    await updateExpiry(license.id, null);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.expiresAt).toBeNull();
  });
});

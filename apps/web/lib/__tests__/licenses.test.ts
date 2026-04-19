import { generateKey, hashKey } from '../licenses';
import {
  issueLicense,
  listLicenses,
  getLicenseById,
  addGrants,
  updateExpiry,
  updateIssuedTo,
  revokeLicense,
  resolveLicense,
  FREE_STRATEGY,
} from '../licenses';

// The CRUD and resolveLicense blocks require a live Postgres connection.
// When DATABASE_URL is unset (local dev without docker-compose, CI without a
// service container), skip these blocks instead of failing noisily. The
// key-generation tests above are pure and always run.
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

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

describeDb('licenses — CRUD', () => {
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

function mockRequest(init: {
  headers?: Record<string, string>;
  url?: string;
  cookies?: Record<string, string>;
}): Request {
  const headers = new Headers(init.headers ?? {});
  if (init.cookies) {
    const cookieStr = Object.entries(init.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('cookie', cookieStr);
  }
  return new Request(init.url ?? 'http://localhost/test', { headers });
}

describeDb('licenses — resolveLicense', () => {
  it('returns anonymous when no key is present', async () => {
    const ctx = await resolveLicense(mockRequest({}));
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('returns anonymous for an unknown key (header)', async () => {
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': 'tck_live_unknown' } }),
    );
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('returns unlocked strategies ∪ classic for a valid key via header', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
    expect(ctx.unlockedStrategies.has(FREE_STRATEGY)).toBe(true);
  });

  it('resolves key from query string', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ url: `http://localhost/test?key=${plaintextKey}` }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
  });

  it('resolves key from cookie', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ cookies: { tc_license_key: plaintextKey } }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
  });

  it('treats revoked key as anonymous', async () => {
    const { license, plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    await revokeLicense(license.id);
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('treats expired key as anonymous', async () => {
    const { plaintextKey } = await issueLicense({
      strategies: ['hmm-top3'],
      expiresAt: new Date(Date.now() - 1000),
    });
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.licenseId).toBeNull();
  });
});

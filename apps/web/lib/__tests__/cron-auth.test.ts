import { NextRequest } from 'next/server';
import { requireCronAuth } from '../cron-auth';

function buildRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/cron/test', { headers });
}

describe('requireCronAuth', () => {
  const ORIGINAL = process.env.CRON_SECRET;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL;
    }
  });

  it('returns 503 when CRON_SECRET is unset (fail closed)', async () => {
    delete process.env.CRON_SECRET;
    const res = requireCronAuth(buildRequest({ authorization: 'Bearer anything' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const body = await res!.json();
    expect(body.error).toBe('cron_not_configured');
  });

  it('returns 401 when authorization header is missing', () => {
    process.env.CRON_SECRET = 'a-secret-value-for-testing-12345';
    const res = requireCronAuth(buildRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when bearer secret is wrong', () => {
    process.env.CRON_SECRET = 'a-secret-value-for-testing-12345';
    const res = requireCronAuth(buildRequest({ authorization: 'Bearer wrong-value' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when bearer length matches but content differs', () => {
    process.env.CRON_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const res = requireCronAuth(
      buildRequest({ authorization: 'Bearer bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns null (passes) when bearer secret matches', () => {
    process.env.CRON_SECRET = 'a-secret-value-for-testing-12345';
    const res = requireCronAuth(
      buildRequest({ authorization: 'Bearer a-secret-value-for-testing-12345' }),
    );
    expect(res).toBeNull();
  });

  it('returns 401 when authorization scheme is not Bearer', () => {
    process.env.CRON_SECRET = 'a-secret-value-for-testing-12345';
    const res = requireCronAuth(
      buildRequest({ authorization: 'Basic a-secret-value-for-testing-12345' }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('does not throw on differing-length headers (no buffer compare crash)', () => {
    process.env.CRON_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(() =>
      requireCronAuth(buildRequest({ authorization: 'Bearer short' })),
    ).not.toThrow();
  });
});

import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(cookie?: string): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/research-intake/screening/index.md?stage=replicated&limit=1',
    cookie ? { headers: { cookie } } : undefined,
  );
}

afterEach(() => {
  jest.useRealTimers();
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret;
  }
});

describe('GET protected screening queue real admin-cookie boundary', () => {
  it('returns only a private 401 without an admin grant', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(
      /candidate|screen|receipt|draft|research|source|task/i,
    );
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('accepts a signed admin cookie and returns the observation-bound queue', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T16:15:39.731Z'));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(request(`tc_admin=${encodeURIComponent(token)}`));
    const brief = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(brief).toContain('# TradeClaw protected manual screening queue');
    expect(brief).toContain('- Observed at: `2026-08-30T16:15:39.731Z`');
    expect(brief).toContain('- Receipt gate: `wait-for-next-window`');
    expect(brief).toContain(
      '**47 untouched candidates are shown in pinned upstream source order.',
    );
    expect(brief).toContain(
      '## 1. A Study Of Differences In Returns Between Large And Small Companies In Europe',
    );
    expect(brief).toContain(
      '## 47. Are Heuristics Better than Theory if Market Crashes Are',
    );
    expect(brief).toContain('- Creates or authorizes a receipt: No');
    expect(brief).toContain('- Publishes, posts, or trades: No');
  });

  it('rejects a malformed admin cookie without returning queue content', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request('tc_admin=not-a-valid-session'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(
      /candidate|screen|receipt|draft|research|source|task/i,
    );
  });
});

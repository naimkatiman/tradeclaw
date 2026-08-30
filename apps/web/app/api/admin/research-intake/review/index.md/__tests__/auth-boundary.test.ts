import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(cookie?: string): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/research-intake/review/index.md?limit=1',
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

describe('GET protected marketing-review queue real admin-cookie boundary', () => {
  it('returns only a private 401 without an admin grant', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(
      /candidate|evidence|receipt|draft|research|source|task/i,
    );
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('accepts a signed admin cookie and returns the observation-bound queue', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T16:39:52.708Z'));
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
    expect(brief).toContain('# TradeClaw protected marketing-review queue');
    expect(brief).toContain('- Observed at: `2026-08-30T16:39:52.708Z`');
    expect(brief).toContain('- Visible drafts: 4');
    expect(brief).toContain('## 1. TC-255 —');
    expect(brief).toContain('## 4. TC-259 —');
    expect(brief).toContain('- Records review completion: No');
    expect(brief).toContain('- Publishes, posts, or trades: No');
  });

  it('rejects a malformed admin cookie without returning queue content', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request('tc_admin=not-a-valid-session'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(
      /candidate|evidence|receipt|draft|research|source|task/i,
    );
  });
});

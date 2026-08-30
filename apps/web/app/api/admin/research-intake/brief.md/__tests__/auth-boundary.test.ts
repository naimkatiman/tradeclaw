import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(cookie?: string): NextRequest {
  return new NextRequest(
    'http://localhost/api/admin/research-intake/brief.md?unknown=ignored',
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

describe('GET /api/admin/research-intake/brief.md real admin-cookie boundary', () => {
  it('returns only a private 401 without an admin grant', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|receipt|draft|research/i);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('accepts the signed admin cookie and returns the observation-bound brief', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T13:00:26.528Z'));
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
    expect(brief).toContain('# TradeClaw research cycle brief');
    expect(brief).toContain('- Observed at: `2026-08-30T13:00:26.528Z`');
    expect(brief).toContain('- Receipt gate: `wait-for-next-window`');
    expect(brief).toContain('- Drafts awaiting human review: 4');
    expect(brief).toContain('- Executes trades: No');
  });

  it('rejects a malformed admin cookie without returning brief content', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request('tc_admin=not-a-valid-session'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|receipt|draft|research/i);
  });
});

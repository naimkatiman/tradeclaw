import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;

afterEach(() => {
  jest.useRealTimers();
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret;
  }
});

describe('GET /api/admin/research-intake/evidence.csv real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence.csv'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('accepts the signed admin cookie and returns all ten examined rows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T18:00:40.000Z'));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence.csv?limit=1', {
        headers: { cookie: `tc_admin=${encodeURIComponent(token)}` },
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-research-admin-evidence.csv"',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(body.split('\r\n')).toHaveLength(12);
    expect(body).toContain('TC-262');
    expect(body).toContain('TC-264');
    expect(body).toContain('TC-265');
    expect(body).toContain('TC-261');
    expect(body).toContain('2026-08-29T18:00:40.000Z');
    expect(body).not.toContain('modeled-historical-pass');
  });

  it('rejects a malformed admin cookie without returning CSV data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence.csv', {
        headers: { cookie: 'tc_admin=not-a-valid-session' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

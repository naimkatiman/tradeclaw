import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;

afterEach(() => {
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret;
  }
});

describe('GET /api/admin/research-intake real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake?limit=100'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('accepts the same signed admin cookie used by protected browser pages', async () => {
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake?limit=100', {
        headers: { cookie: `tc_admin=${encodeURIComponent(token)}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toMatchObject({ totalRecords: 61, returnedRecords: 61 });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('rejects a malformed admin cookie without returning intake data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake', {
        headers: { cookie: 'tc_admin=not-a-valid-session' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.records).toBeUndefined();
  });
});

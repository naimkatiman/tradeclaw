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

describe('GET /api/admin/research-intake/evidence real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.items).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('accepts the signed admin cookie and returns every examined record', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence?limit=1', {
        headers: { cookie: `tc_admin=${encodeURIComponent(token)}` },
      }),
    );
    const body = await response.json();
    const taskIds = body.items.map((item: {
      record: {
        tradeClawEvidence?: { taskId: string } | null;
        tradeClawSourceAudit?: { taskId: string } | null;
      };
    }) => item.record.tradeClawEvidence?.taskId ?? item.record.tradeClawSourceAudit?.taskId);

    expect(response.status).toBe(200);
    expect(taskIds).toEqual([
      'TC-262',
      'TC-259',
      'TC-257',
      'TC-268',
      'TC-264',
      'TC-265',
      'TC-255',
      'TC-261',
      'TC-258',
      'TC-256',
      'TC-263',
      'TC-267',
      'TC-266',
      'TC-260',
    ]);
    expect(body.researchLoop).toMatchObject({
      observedAt: '2026-08-29T15:59:59.999Z',
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-260' },
    });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('rejects a malformed admin cookie without returning evidence data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/evidence', {
        headers: { cookie: 'tc_admin=not-a-valid-session' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.items).toBeUndefined();
  });
});

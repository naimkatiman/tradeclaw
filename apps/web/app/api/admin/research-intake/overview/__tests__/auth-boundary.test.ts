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

describe('GET /api/admin/research-intake/overview real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/overview'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.catalogSummary).toBeUndefined();
    expect(body.researchLoop).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('accepts the signed admin cookie and returns record-free orientation', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/overview?limit=1', {
        headers: { cookie: `tc_admin=${encodeURIComponent(token)}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.catalogSummary.total).toBe(61);
    expect(body.evidenceSummary.total).toBe(10);
    expect(body.researchLoop).toMatchObject({
      observedAt: '2026-08-29T15:59:59.999Z',
      currentWindowStatus: 'complete',
      latestReceipt: { taskId: 'TC-260' },
    });
    expect(body.marketingReview).toMatchObject({
      status: 'review-ready',
      summary: { availableDrafts: 4, publicationApprovedDrafts: 0 },
      currentWindowDraftCount: 0,
      controls: {
        humanReviewRequired: true,
        automaticPublication: false,
        automaticPosting: false,
      },
    });
    expect(body.startHere).toMatchObject({
      kind: 'review-marketing-drafts',
      targetResource: 'marketing-review-item',
      targetIsCurrentResource: false,
      itemCount: 4,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(body).not.toHaveProperty('records');
    expect(body).not.toHaveProperty('items');
    expect(body.marketingReview).not.toHaveProperty('handoffs');
  });

  it('rejects a malformed admin cookie without returning overview data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest('http://localhost/api/admin/research-intake/overview', {
        headers: { cookie: 'tc_admin=not-a-valid-session' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.catalogSummary).toBeUndefined();
    expect(body.researchLoop).toBeUndefined();
  });
});

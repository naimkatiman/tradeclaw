import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';

function context(taskId: string): { params: Promise<{ taskId: string }> } {
  return { params: Promise.resolve({ taskId }) };
}

function request(taskId: string, cookie?: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/review/${encodeURIComponent(taskId)}`,
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

describe('GET /api/admin/research-intake/review/[taskId] real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(request('TC-255'), context('TC-255'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.reviewItem).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('accepts the signed admin cookie and returns one visible exact item', async () => {
    jest.useFakeTimers().setSystemTime(new Date(AUDIT_AT));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      request('TC-255', `tc_admin=${encodeURIComponent(token)}`),
      context('TC-255'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviewItem).toMatchObject({
      queuePosition: 1,
      candidate: {
        id: 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      },
      handoff: { taskId: 'TC-255', publicationApproved: false },
      controls: {
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        tradingApproved: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
    expect(body.navigation).toMatchObject({
      currentPosition: 1,
      totalVisibleItems: 4,
      previous: null,
      next: {
        taskId: 'TC-257',
        href: '/api/admin/research-intake/review/TC-257',
      },
    });
    expect(body.reviewProtocol).toMatchObject({
      schemaVersion: 1,
      status: 'manual-review-required',
      completionTracking: 'not-recorded-by-this-read-only-api',
      mutationSupported: false,
    });
    expect(body.reviewProtocol.checks).toHaveLength(4);
    expect(body.claimVerification).toMatchObject({
      schemaVersion: 1,
      status: 'manual-cross-check-required',
      mappingPurpose: 'draft-claim-to-canonical-evidence-navigation',
      sourceOfTruth: 'result-and-artifact-files',
      verificationRecorded: false,
      mutationSupported: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(body.claimVerification.claims).toHaveLength(5);
    expect(body.reviewHandoffTemplate).toMatchObject({
      schemaVersion: 1,
      status: 'blank-template-not-recorded',
      purpose: 'copy-to-separate-manual-review-workflow',
      completionRecorded: false,
      mutationSupported: false,
      ownerDecisionRecorded: false,
      ownerDecisionRequiredForPublication: true,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      allowedOutcomes: [
        'reject-draft',
        'needs-revision',
        'ready-for-separate-owner-decision',
      ],
      blankRecord: {
        taskId: 'TC-255',
        outcome: null,
      },
    });
    expect(body.reviewHandoffTemplate.requiredCheckIds).toHaveLength(4);
    expect(body.reviewHandoffTemplate.claimIds).toHaveLength(5);
    expect(body.startHere).toMatchObject({
      href: '/api/admin/research-intake/review/TC-255/packet.md',
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
    });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('does not reveal a known future handoff before its availability instant', async () => {
    jest.useFakeTimers().setSystemTime(new Date(BEFORE_LAST));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      request('TC-259', `tc_admin=${encodeURIComponent(token)}`),
      context('TC-259'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Research intake marketing review not found.' });
    expect(JSON.stringify(body)).not.toContain('TC-259');
  });

  it('returns the same generic 404 for an unknown canonical-looking task', async () => {
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      request('TC-999', `tc_admin=${encodeURIComponent(token)}`),
      context('TC-999'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Research intake marketing review not found.' });
    expect(JSON.stringify(body)).not.toContain('TC-999');
  });

  it('rejects a malformed admin cookie without returning review data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      request('TC-255', 'tc_admin=not-a-valid-session'),
      context('TC-255'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.reviewItem).toBeUndefined();
  });
});

import { NextRequest } from 'next/server';
import { createAdminSession } from '../../../../../../lib/admin-session';
import { GET } from '../route';

const originalAdminSecret = process.env.ADMIN_SECRET;
const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';

function context(candidateId = CANDIDATE_ID): { params: Promise<{ candidateId: string }> } {
  return { params: Promise.resolve({ candidateId }) };
}

afterEach(() => {
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret;
  }
});

describe('GET /api/admin/research-intake/[candidateId] real admin-cookie boundary', () => {
  it('returns only 401 when no admin grant is present', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest(`http://localhost/api/admin/research-intake/${CANDIDATE_ID}`),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.record).toBeUndefined();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('accepts the signed admin cookie used by protected browser pages', async () => {
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);

    const response = await GET(
      new NextRequest(`http://localhost/api/admin/research-intake/${CANDIDATE_ID}`, {
        headers: { cookie: `tc_admin=${encodeURIComponent(token)}` },
      }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record).toMatchObject({ id: CANDIDATE_ID, stage: 'source-audited' });
    expect(body.access).toEqual({
      mode: 'admin-read-only',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('rejects a malformed admin cookie without returning candidate data', async () => {
    process.env.ADMIN_SECRET = 'integration-only-secret';

    const response = await GET(
      new NextRequest(`http://localhost/api/admin/research-intake/${CANDIDATE_ID}`, {
        headers: { cookie: 'tc_admin=not-a-valid-session' },
      }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(body.record).toBeUndefined();
  });
});

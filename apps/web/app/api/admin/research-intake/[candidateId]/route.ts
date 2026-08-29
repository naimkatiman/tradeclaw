import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../lib/admin-gate';
import { buildResearchIntakeAdminCandidatePayload } from '../../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/[candidateId]
 *
 * Protected exact-ID read model for one candidate. Authentication completes
 * before path parameters, the server clock, or research state are observed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const { candidateId } = await params;
  const payload = buildResearchIntakeAdminCandidatePayload(candidateId);

  return applyPrivateHeaders(
    NextResponse.json(
      payload ?? { error: 'Research intake candidate not found.' },
      { status: payload ? 200 : 404 },
    ),
  );
}

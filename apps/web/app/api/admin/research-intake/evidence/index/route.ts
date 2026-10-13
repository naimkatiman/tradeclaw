import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminEvidenceIndexPayload } from '../../../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/evidence/index
 *
 * Protected lightweight evidence list. Authentication runs before the clock,
 * receipt ledger, marketing state, or compiled catalog is observed. Query
 * parameters have no meaning.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  return applyPrivateHeaders(
    NextResponse.json(buildResearchIntakeAdminEvidenceIndexPayload(new Date())),
  );
}

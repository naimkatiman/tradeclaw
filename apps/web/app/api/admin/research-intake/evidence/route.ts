import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../lib/admin-gate';
import { buildResearchIntakeAdminEvidencePayload } from '../../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/evidence
 *
 * Protected, filter-independent desk for every examined intake candidate.
 * Authentication runs before the clock, catalog, receipt, or marketing state
 * is observed. Query parameters have no meaning.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  return applyPrivateHeaders(
    NextResponse.json(buildResearchIntakeAdminEvidencePayload(new Date())),
  );
}

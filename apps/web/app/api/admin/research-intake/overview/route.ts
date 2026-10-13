import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../lib/admin-gate';
import { buildResearchIntakeAdminOverviewPayload } from '../../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/overview
 *
 * Protected, read-only receipt and evidence orientation. Authentication runs
 * before the clock or research state is observed. Query parameters have no meaning.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  return applyPrivateHeaders(
    NextResponse.json(buildResearchIntakeAdminOverviewPayload(new Date())),
  );
}

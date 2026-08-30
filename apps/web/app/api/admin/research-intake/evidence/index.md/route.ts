import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminEvidenceIndexBrief } from '../../../../../../lib/research-intake-admin-evidence-index-brief';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/evidence/index.md
 *
 * Protected, read-only, human-readable index of every examined candidate.
 * Authentication completes before the clock or research state is observed.
 * Query parameters have no meaning.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const brief = buildResearchIntakeAdminEvidenceIndexBrief(new Date());
  return applyPrivateHeaders(
    new NextResponse(brief, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition':
          'inline; filename="tradeclaw-research-admin-evidence-index.md"',
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

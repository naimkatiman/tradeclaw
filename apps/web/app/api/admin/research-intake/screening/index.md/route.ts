import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminScreeningQueueBrief } from '../../../../../../lib/research-intake-admin-screening-queue-brief';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/screening/index.md
 *
 * Protected, read-only, human-readable queue of untouched candidates.
 * Authentication completes before the clock or research state is observed.
 * Query parameters have no meaning.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const brief = buildResearchIntakeAdminScreeningQueueBrief(new Date());
  return applyPrivateHeaders(
    new NextResponse(brief, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition':
          'inline; filename="tradeclaw-research-admin-screening-queue.md"',
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../lib/admin-gate';
import { buildResearchMarketingReviewCsv } from '../../../../../lib/research-marketing-review-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILENAME = 'tradeclaw-research-marketing-review-queue.csv';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/review.csv
 *
 * Protected, filter-independent download of every evidence-available marketing
 * handoff. Authentication runs before the clock is observed or data is built.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  return applyPrivateHeaders(
    new NextResponse(buildResearchMarketingReviewCsv(new Date()), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${FILENAME}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

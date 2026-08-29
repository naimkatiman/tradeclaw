import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../lib/admin-gate';
import { buildResearchIntakeAdminEvidenceCsv } from '../../../../../lib/research-intake-admin-evidence-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILENAME = 'tradeclaw-research-admin-evidence.csv';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/evidence.csv
 *
 * Protected, filter-independent spreadsheet projection of the complete
 * evidence desk. Authentication runs before the clock is observed or any
 * catalog, receipt, marketing, or CSV state is built.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  return applyPrivateHeaders(
    new NextResponse(buildResearchIntakeAdminEvidenceCsv(new Date()), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${FILENAME}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

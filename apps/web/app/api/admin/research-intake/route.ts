import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../lib/admin-gate';
import {
  ResearchIntakeAdminQueryError,
  buildResearchIntakeAdminPayload,
} from '../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake
 *
 * Protected, read-only projection of the pinned research intake. Authentication
 * runs before query parsing so unauthorized callers receive no catalog or
 * validation detail.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  try {
    return applyPrivateHeaders(
      NextResponse.json(buildResearchIntakeAdminPayload(request.nextUrl.searchParams)),
    );
  } catch (error) {
    if (error instanceof ResearchIntakeAdminQueryError) {
      return applyPrivateHeaders(
        NextResponse.json(
          {
            error: 'Invalid research intake query',
            parameter: error.parameter,
            detail: error.message,
          },
          { status: 400 },
        ),
      );
    }
    throw error;
  }
}

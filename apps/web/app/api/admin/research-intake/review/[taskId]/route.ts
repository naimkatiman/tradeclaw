import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminReviewItemPayload } from '../../../../../../lib/research-intake-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/review/[taskId]
 *
 * Protected exact-task read model for one observation-visible marketing review.
 * Authentication completes before path parameters or the server clock are read.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const { taskId } = await params;
  const observedAt = new Date();
  const payload = buildResearchIntakeAdminReviewItemPayload(taskId, observedAt);

  return applyPrivateHeaders(
    NextResponse.json(
      payload ?? { error: 'Research intake marketing review not found.' },
      { status: payload ? 200 : 404 },
    ),
  );
}

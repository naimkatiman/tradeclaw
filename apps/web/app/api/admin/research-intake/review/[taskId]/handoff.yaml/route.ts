import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../../lib/admin-gate';
import { buildResearchMarketingReviewHandoff } from '../../../../../../../lib/research-marketing-review-handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/review/[taskId]/handoff.yaml
 *
 * Protected blank YAML handoff for one observation-visible marketing review.
 * Authentication completes before path parameters or the clock are read. This
 * route is read-only and does not record completion, outcomes, or decisions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const { taskId } = await params;
  const observedAt = new Date();
  const handoff = buildResearchMarketingReviewHandoff(taskId, observedAt);

  if (handoff === null) {
    return applyPrivateHeaders(
      NextResponse.json(
        { error: 'Research intake marketing review not found.' },
        { status: 404 },
      ),
    );
  }

  return applyPrivateHeaders(
    new NextResponse(handoff, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Content-Disposition': `attachment; filename="tradeclaw-research-review-handoff-${taskId}.yaml"`,
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../../lib/admin-gate';
import { buildResearchMarketingReviewPacket } from '../../../../../../../lib/research-marketing-review-packet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

/**
 * GET /api/admin/research-intake/review/[taskId]/packet.md
 *
 * Protected exact-task Markdown handoff for one observation-visible marketing
 * review. Authentication completes before path parameters or the clock are read.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const { taskId } = await params;
  const observedAt = new Date();
  const packet = buildResearchMarketingReviewPacket(taskId, observedAt);

  if (packet === null) {
    return applyPrivateHeaders(
      NextResponse.json(
        { error: 'Research intake marketing review not found.' },
        { status: 404 },
      ),
    );
  }

  return applyPrivateHeaders(
    new NextResponse(packet, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="tradeclaw-research-marketing-review-${taskId}.md"`,
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

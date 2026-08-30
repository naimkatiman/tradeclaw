import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminCandidateBrief } from '../../../../../../lib/research-intake-admin-candidate-brief';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_DISPOSITION =
  'inline; filename="tradeclaw-research-admin-candidate-brief.md"';
const NOT_FOUND =
  '# Research intake candidate not found\n\nResearch intake candidate not found. Use an exact canonical candidate ID.\n';

function applyPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

function markdownResponse(body: string, status: 200 | 404): NextResponse {
  return applyPrivateHeaders(
    new NextResponse(body, {
      status,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': CONTENT_DISPOSITION,
        'X-Content-Type-Options': 'nosniff',
      },
    }),
  );
}

/**
 * GET /api/admin/research-intake/[candidateId]/brief.md
 *
 * Protected, observation-consistent human record for one canonical candidate.
 * Authentication completes before path parameters, the clock, or research
 * state are observed. Query parameters have no meaning.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return applyPrivateHeaders(denied);

  const { candidateId } = await params;
  const brief = buildResearchIntakeAdminCandidateBrief(candidateId, new Date());
  return markdownResponse(brief ?? NOT_FOUND, brief === null ? 404 : 200);
}

import { NextResponse } from 'next/server';
import { buildResearchIntakePublicCandidateBrief } from '../../../../../../lib/research-intake-public-candidate-brief';

export const revalidate = 3600;

const PUBLIC_CACHE =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
const CONTENT_DISPOSITION =
  'inline; filename="tradeclaw-research-candidate-brief.md"';
const NOT_FOUND =
  '# Research intake candidate not found\n\nResearch intake candidate not found. Use an exact canonical candidate ID.\n';

function markdownResponse(body: string, status: 200 | 404): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': CONTENT_DISPOSITION,
      'Cache-Control': PUBLIC_CACHE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * GET /api/research/intake/[candidateId]/brief.md
 *
 * Public, deterministic human-readable projection for one exact canonical ID.
 * Unknown IDs share one generic response and are never reflected.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  const { candidateId } = await params;
  const brief = buildResearchIntakePublicCandidateBrief(candidateId);
  return markdownResponse(
    brief ?? NOT_FOUND,
    brief === null ? 404 : 200,
  );
}

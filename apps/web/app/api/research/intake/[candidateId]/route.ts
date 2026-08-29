import { NextResponse } from 'next/server';
import { buildResearchIntakePublicCandidatePayload } from '../../../../../lib/research-intake-public';

export const revalidate = 3600;

const PUBLIC_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

/**
 * GET /api/research/intake/[candidateId]
 *
 * Exact, public, read-only projection of one pinned source candidate. Unknown
 * identifiers receive one generic response and are never reflected.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  const { candidateId } = await params;
  const payload = buildResearchIntakePublicCandidatePayload(candidateId);

  return NextResponse.json(
    payload ?? { error: 'Research intake candidate not found.' },
    {
      status: payload ? 200 : 404,
      headers: { 'Cache-Control': PUBLIC_CACHE },
    },
  );
}

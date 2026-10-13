import { NextResponse } from 'next/server';
import { buildResearchIntakePublicPayload } from '../../../../lib/research-intake-public';

export const revalidate = 3600;

/**
 * GET /api/research/intake
 *
 * Public, deterministic projection of the pinned systematic-research catalog.
 * It carries evidence and claim boundaries, never admin workflow state.
 */
export function GET(): NextResponse {
  return NextResponse.json(buildResearchIntakePublicPayload(), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

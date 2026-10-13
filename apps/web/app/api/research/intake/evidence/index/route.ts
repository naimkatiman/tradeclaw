import { NextResponse } from 'next/server';
import { buildResearchIntakePublicEvidenceIndexPayload } from '../../../../../../lib/research-intake-public';

export const revalidate = 3600;

/**
 * GET /api/research/intake/evidence/index
 *
 * Lightweight, deterministic list of every examined candidate. Query
 * parameters have no meaning; complete evidence stays on linked resources.
 */
export function GET(): NextResponse {
  return NextResponse.json(buildResearchIntakePublicEvidenceIndexPayload(), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

import { NextResponse } from 'next/server';
import { buildResearchIntakePublicOverviewPayload } from '../../../../../lib/research-intake-public';

export const revalidate = 3600;

/**
 * GET /api/research/intake/overview
 *
 * Compact, deterministic evidence orientation without candidate record bodies.
 * Query parameters have no meaning.
 */
export function GET(): NextResponse {
  return NextResponse.json(buildResearchIntakePublicOverviewPayload(), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

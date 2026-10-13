import { NextResponse } from 'next/server';
import { buildResearchIntakePublicEvidencePayload } from '../../../../../lib/research-intake-public';

export const revalidate = 3600;

/**
 * GET /api/research/intake/evidence
 *
 * Complete, deterministic index of every candidate with a TradeClaw
 * source-audit or replication overlay. Query parameters have no meaning.
 */
export function GET(): NextResponse {
  return NextResponse.json(buildResearchIntakePublicEvidencePayload(), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

import { NextResponse } from 'next/server';
import { buildResearchIntakePublicEvidenceIndexBrief } from '../../../../../../lib/research-intake-public-evidence-index-brief';

export const revalidate = 3600;

/**
 * GET /api/research/intake/evidence/index.md
 *
 * Public, deterministic human-readable list of every examined candidate.
 * Query parameters have no meaning; exact evidence stays on linked records.
 */
export function GET(): NextResponse {
  return new NextResponse(buildResearchIntakePublicEvidenceIndexBrief(), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition':
        'inline; filename="tradeclaw-examined-candidate-index.md"',
      'Cache-Control':
        'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

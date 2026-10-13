import { NextResponse } from 'next/server';
import { buildResearchIntakePublicEvidenceBrief } from '../../../../../lib/research-intake-public-evidence-brief';

export const revalidate = 3600;

/**
 * GET /api/research/intake/brief.md
 *
 * Public, deterministic human-readable orientation over the record-free
 * research overview. Query parameters have no meaning.
 */
export function GET(): NextResponse {
  return new NextResponse(buildResearchIntakePublicEvidenceBrief(), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'inline; filename="tradeclaw-research-evidence-brief.md"',
      'Cache-Control':
        'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

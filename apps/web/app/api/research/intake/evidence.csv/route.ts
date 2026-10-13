import { SYSTEMATIC_RESEARCH_INTAKE_SOURCE } from '../../../../../lib/research-intake';
import { buildResearchIntakeEvidenceCsv } from '../../../../../lib/research-intake-csv';

export const revalidate = 3600;

const FILENAME =
  `tradeclaw-systematic-research-evidence-${SYSTEMATIC_RESEARCH_INTAKE_SOURCE.snapshotDate}.csv`;

/**
 * GET /api/research/intake/evidence.csv
 *
 * Spreadsheet-ready projection of the complete public evidence index. The
 * canonical evidence JSON retains the complete nested research records.
 */
export function GET(): Response {
  return new Response(buildResearchIntakeEvidenceCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${FILENAME}"`,
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

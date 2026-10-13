import { buildResearchIntakeCsv } from '../../../../lib/research-intake-csv';
import { SYSTEMATIC_RESEARCH_INTAKE_SOURCE } from '../../../../lib/research-intake';

export const revalidate = 3600;

const FILENAME =
  `tradeclaw-systematic-research-intake-${SYSTEMATIC_RESEARCH_INTAKE_SOURCE.snapshotDate}.csv`;

/**
 * GET /api/research/intake.csv
 *
 * Spreadsheet-ready index of the safe public intake projection. The canonical
 * JSON route remains the complete nested evidence record.
 */
export function GET(): Response {
  return new Response(buildResearchIntakeCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${FILENAME}"`,
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

import { createHash } from 'node:crypto';
import { buildOpenApiSpec } from '../openapi';
import {
  RESEARCH_INTAKE_ADMIN_RESOURCES,
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  RESEARCH_INTAKE_PUBLIC_RESOURCES,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T18:00:40.000Z';
const CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

describe('protected research intake resource discovery', () => {
  it('shares one frozen route map across every protected JSON projection', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    const payloads = [
      buildResearchIntakeAdminOverviewPayload(OBSERVED_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT),
      candidate,
      buildResearchIntakeAdminEvidenceIndexPayload(OBSERVED_AT),
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
    ];

    expect(RESEARCH_INTAKE_ADMIN_RESOURCES).toEqual({
      overview: '/api/admin/research-intake/overview',
      cycleBrief: '/api/admin/research-intake/brief.md',
      catalog: '/api/admin/research-intake',
      evidenceIndex: '/api/admin/research-intake/evidence/index',
      evidence: '/api/admin/research-intake/evidence',
      evidenceCsv: '/api/admin/research-intake/evidence.csv',
      marketingReview: '/api/admin/research-intake/review',
      marketingReviewCsv: '/api/admin/research-intake/review.csv',
    });
    expect(Object.isFrozen(RESEARCH_INTAKE_ADMIN_RESOURCES)).toBe(true);
    const catalogEvidenceStateSummary = payloads[0].catalogEvidenceStateSummary;
    expect(catalogEvidenceStateSummary).toMatchObject({
      totalCandidates: 61,
        withTradeClawRecord: 13,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      plainLanguageSummary:
        '61 candidates: 48 not tested by TradeClaw, 9 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    });
    for (const payload of payloads) {
      expect(payload.resources).toBe(RESEARCH_INTAKE_ADMIN_RESOURCES);
      expect(payload.catalogEvidenceStateSummary).toEqual(catalogEvidenceStateSummary);
    }
  });

  it('keeps public discovery separate from protected resources and OpenAPI', () => {
    const publicPayload = buildResearchIntakePublicPayload();
    const publicPaths = buildOpenApiSpec().paths as Record<string, unknown>;

    expect(publicPayload.resources).toBe(RESEARCH_INTAKE_PUBLIC_RESOURCES);
    expect(publicPayload.resources).toEqual({
      overview: '/api/research/intake/overview',
      catalog: '/api/research/intake',
      catalogCsv: '/api/research/intake.csv',
      evidenceIndex: '/api/research/intake/evidence/index',
      evidence: '/api/research/intake/evidence',
      evidenceCsv: '/api/research/intake/evidence.csv',
    });
    expect(JSON.stringify(publicPayload)).not.toContain('/api/admin/research-intake');
    for (const path of Object.values(RESEARCH_INTAKE_ADMIN_RESOURCES)) {
      expect(publicPaths).not.toHaveProperty(path);
    }
  });

  it('pins the protected adverse-inclusive evidence CSV byte-for-byte', () => {
    const csv = buildResearchIntakeAdminEvidenceCsv(OBSERVED_AT);

    expect(Buffer.byteLength(csv, 'utf8')).toBe(19_965);
    expect(createHash('sha256').update(csv).digest('hex')).toBe(
      'e641315a42b9f66768b3420619e77072474c6dc94392fb6bc9fd37af5aeac35f',
    );
    expect(csv).not.toContain('marketingReviewCsv');
  });
});

import { createHash } from 'node:crypto';
import { buildOpenApiSpec } from '../openapi';
import {
  RESEARCH_INTAKE_ADMIN_RESOURCES,
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import { buildResearchIntakePublicPayload } from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T18:00:40.000Z';
const CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

describe('protected research intake resource discovery', () => {
  it('shares one frozen route map across every protected JSON projection', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    const payloads = [
      buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT),
      candidate,
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
    ];

    expect(RESEARCH_INTAKE_ADMIN_RESOURCES).toEqual({
      catalog: '/api/admin/research-intake',
      evidence: '/api/admin/research-intake/evidence',
      evidenceCsv: '/api/admin/research-intake/evidence.csv',
      marketingReview: '/api/admin/research-intake/review',
      marketingReviewCsv: '/api/admin/research-intake/review.csv',
    });
    expect(Object.isFrozen(RESEARCH_INTAKE_ADMIN_RESOURCES)).toBe(true);
    for (const payload of payloads) {
      expect(payload.resources).toBe(RESEARCH_INTAKE_ADMIN_RESOURCES);
    }
  });

  it('does not leak protected discovery paths into public payloads or OpenAPI', () => {
    const publicPayload = buildResearchIntakePublicPayload();
    const publicPaths = buildOpenApiSpec().paths as Record<string, unknown>;

    expect(publicPayload).not.toHaveProperty('resources');
    expect(JSON.stringify(publicPayload)).not.toContain('/api/admin/research-intake');
    for (const path of Object.values(RESEARCH_INTAKE_ADMIN_RESOURCES)) {
      expect(publicPaths).not.toHaveProperty(path);
    }
  });

  it('pins the protected adverse-inclusive evidence CSV byte-for-byte', () => {
    const csv = buildResearchIntakeAdminEvidenceCsv(OBSERVED_AT);

    expect(Buffer.byteLength(csv, 'utf8')).toBe(15_405);
    expect(createHash('sha256').update(csv).digest('hex')).toBe(
      '5f144161ba0a20f2d342ee675775d03b8b76d2cd37afb074f08f5299d12a638b',
    );
    expect(csv).not.toContain('marketingReviewCsv');
  });
});

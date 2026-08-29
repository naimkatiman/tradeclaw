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

  it('leaves the protected evidence CSV byte-for-byte unchanged', () => {
    const csv = buildResearchIntakeAdminEvidenceCsv(OBSERVED_AT);

    expect(Buffer.byteLength(csv, 'utf8')).toBe(14_533);
    expect(createHash('sha256').update(csv).digest('hex')).toBe(
      '49c32887d5edaf402a9108ec6351e8acb2a5d567b5367df178250482b4542053',
    );
    expect(csv).not.toContain('marketingReviewCsv');
  });
});

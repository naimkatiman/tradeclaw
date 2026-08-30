import { createHash } from 'node:crypto';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
} from '../research-intake-admin';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicOverviewPayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const DETERMINISTIC_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const CATALOG_PLAIN_LANGUAGE_SUMMARY =
  '61 candidates: 52 not tested by TradeClaw, 5 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';
const EVIDENCE_PLAIN_LANGUAGE_SUMMARY =
  '9 candidates: 5 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 6 candidates.';

const EXPECTED_RESOURCES = {
  overview: '/api/research/intake/overview',
  catalog: '/api/research/intake',
  catalogCsv: '/api/research/intake.csv',
  evidenceIndex: '/api/research/intake/evidence/index',
  evidence: '/api/research/intake/evidence',
  evidenceCsv: '/api/research/intake/evidence.csv',
};

interface PublicRecordView {
  id: string;
  links?: { candidate: string };
}

interface PublicContextView {
  resources?: typeof EXPECTED_RESOURCES;
  catalogEvidenceStateSummary?: {
    totalCandidates: number;
    withTradeClawRecord: number;
    performanceGatesEvaluated: number;
    performanceGatesNotEvaluated: number;
    plainLanguageSummary: string;
    statuses: Array<{ performanceEvidenceStatus: string; count: number }>;
  };
}

function context(payload: unknown): PublicContextView {
  return payload as PublicContextView;
}

function records(payload: unknown): PublicRecordView[] {
  return (payload as { records: PublicRecordView[] }).records;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('public research-intake discovery context', () => {
  it('shares one frozen public resource map across every public JSON projection', () => {
    const overview = buildResearchIntakePublicOverviewPayload();
    const catalog = buildResearchIntakePublicPayload();
    const index = buildResearchIntakePublicEvidenceIndexPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    const candidate = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    expect(context(catalog).resources).toEqual(EXPECTED_RESOURCES);
    expect(Object.isFrozen(context(catalog).resources)).toBe(true);
    expect(context(overview).resources).toBe(context(catalog).resources);
    expect(context(index).resources).toBe(context(catalog).resources);
    expect(context(evidence).resources).toBe(context(catalog).resources);
    expect(context(candidate).resources).toBe(context(catalog).resources);
    expect(JSON.stringify(catalog)).not.toContain('/api/admin/research-intake');
  });

  it('publishes the whole-catalog evidence interpretation without replacing the evidence subset', () => {
    const catalog = buildResearchIntakePublicPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    const candidate = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    const catalogSummary = context(catalog).catalogEvidenceStateSummary;
    expect(catalogSummary).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 9,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      plainLanguageSummary: CATALOG_PLAIN_LANGUAGE_SUMMARY,
    });
    expect(catalogSummary?.statuses.map(({ performanceEvidenceStatus, count }) => ({
      performanceEvidenceStatus,
      count,
    }))).toEqual([
      { performanceEvidenceStatus: 'not-tested', count: 52 },
      { performanceEvidenceStatus: 'source-audit-only-no-local-backtest', count: 5 },
      { performanceEvidenceStatus: 'qa-only-no-performance-result', count: 1 },
      { performanceEvidenceStatus: 'modeled-historical-pass', count: 0 },
      { performanceEvidenceStatus: 'modeled-historical-fail', count: 3 },
      { performanceEvidenceStatus: 'modeled-historical-inconclusive', count: 0 },
    ]);
    expect(context(evidence).catalogEvidenceStateSummary).toEqual(catalogSummary);
    expect(context(candidate).catalogEvidenceStateSummary).toEqual(catalogSummary);
    expect(evidence.evidenceStateSummary).toMatchObject({
      totalCandidates: 9,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 6,
      plainLanguageSummary: EVIDENCE_PLAIN_LANGUAGE_SUMMARY,
    });
    expect(evidence.evidenceStateSummary.statuses.map((status) => status.count)).toEqual([
      0, 5, 1, 0, 3, 0,
    ]);
  });

  it('gives every public row one exact query-independent candidate-detail link', () => {
    const catalog = buildResearchIntakePublicPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    const candidate = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    const catalogRecords = records(catalog);
    expect(catalogRecords).toHaveLength(61);
    for (const record of catalogRecords) {
      expect(record.links).toEqual({
        candidate: `/api/research/intake/${encodeURIComponent(record.id)}`,
      });
      expect(record.links?.candidate).not.toContain('?');
    }
    expect(new Set(catalogRecords.map((record) => record.links?.candidate)).size).toBe(61);
    expect(records(evidence).every((record) => (
      record.links?.candidate === `/api/research/intake/${encodeURIComponent(record.id)}`
    ))).toBe(true);
    expect((candidate.record as unknown as PublicRecordView).links?.candidate).toBe(
      candidate.navigation.selfHref,
    );
  });

  it('documents resources, whole-catalog interpretation, and row links in OpenAPI', () => {
    const schemas = (buildOpenApiSpec() as {
      components: {
        schemas: {
          ResearchIntakeResponse: {
            required: string[];
            properties: Record<string, { $ref?: string }>;
          };
          ResearchIntakeEvidenceResponse: { required: string[] };
          ResearchIntakeCandidateResponse: { required: string[] };
          ResearchIntakePublicRecord: {
            required: string[];
            properties: Record<string, { $ref?: string }>;
          };
          ResearchIntakePublicResources: {
            required: string[];
            properties: Record<string, { const?: string }>;
          };
        };
      };
    }).components.schemas;

    expect(schemas.ResearchIntakeResponse.required).toEqual(expect.arrayContaining([
      'resources',
      'catalogEvidenceStateSummary',
    ]));
    expect(schemas.ResearchIntakeEvidenceResponse.required).toEqual(expect.arrayContaining([
      'resources',
      'catalogEvidenceStateSummary',
      'evidenceStateSummary',
    ]));
    expect(schemas.ResearchIntakeCandidateResponse.required).toEqual(expect.arrayContaining([
      'resources',
      'catalogEvidenceStateSummary',
    ]));
    expect(schemas.ResearchIntakePublicRecord.required).toContain('links');
    expect(schemas.ResearchIntakeResponse.properties.resources.$ref).toBe(
      '#/components/schemas/ResearchIntakePublicResources',
    );
    expect(
      schemas.ResearchIntakeResponse.properties.catalogEvidenceStateSummary.$ref,
    ).toBe('#/components/schemas/ResearchIntakeEvidenceStateSummary');
    expect(schemas.ResearchIntakePublicResources.required).toEqual(
      Object.keys(EXPECTED_RESOURCES),
    );
    expect(Object.fromEntries(Object.entries(
      schemas.ResearchIntakePublicResources.properties,
    ).map(([key, value]) => [key, value.const]))).toEqual(EXPECTED_RESOURCES);
  });

  it('serializes the public discovery context and complete projections deterministically', () => {
    const catalog = buildResearchIntakePublicPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();

    expect({
      resources: fingerprint(context(catalog).resources),
      catalogEvidenceStateSummary: fingerprint(
        context(catalog).catalogEvidenceStateSummary,
      ),
      recordLinks: fingerprint(records(catalog).map(({ id, links }) => ({ id, links }))),
      catalog: fingerprint(catalog),
      evidence: fingerprint(evidence),
    }).toEqual({
      resources: {
        bytes: 264,
        sha256: '937328c03dd13e7dad988686c0260f6a4b6fd1cf8a2a29ec0f169ce33953858d',
      },
      catalogEvidenceStateSummary: {
        bytes: 2_000,
        sha256: '01b763680a8a8872012faa2870cbc23dbb76f73c83795a022930825ce5a6c061',
      },
      recordLinks: {
        bytes: 11_335,
        sha256: '6b4721b769db3cb6bd033c6b8d9d01c850db1f387ebdf33446fd14dccca0a06c',
      },
      catalog: {
        bytes: 103_670,
        sha256: 'f0ca50ef796a85311bb6f5f0eab4093e88cb7bef8d651f286007632de2a93879',
      },
      evidence: {
        bytes: 47_316,
        sha256: '8d5931fb60c40463af4be4943bb4f7bf1c086d20f786a61cad0325b55877b51c',
      },
    });
  });

  it('freezes protected catalog parity and intentional evidence context movement', () => {
    expect(fingerprint(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    ))).toEqual({
      bytes: 73_802,
      sha256: '5099d033a9d33d9814be7c0b4f1e845101eb192eabbff974f983b0815abdd100',
    });
    const protectedEvidence = buildResearchIntakeAdminEvidencePayload(DETERMINISTIC_AT);
    expect(protectedEvidence.catalogEvidenceStateSummary).toEqual(
      context(buildResearchIntakePublicPayload()).catalogEvidenceStateSummary,
    );
    expect(fingerprint(protectedEvidence)).toEqual({
      bytes: 74_895,
      sha256: '0f4f5971940b9efd2cb4ef829535c8b4b44aeb93a38dcf0a743cbb56b9f56ce6',
    });
  });
});

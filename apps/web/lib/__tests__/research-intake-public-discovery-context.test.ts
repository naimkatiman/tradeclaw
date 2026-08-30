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
  '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';
const EVIDENCE_PLAIN_LANGUAGE_SUMMARY =
  '10 candidates: 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 7 candidates.';

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
      withTradeClawRecord: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      plainLanguageSummary: CATALOG_PLAIN_LANGUAGE_SUMMARY,
    });
    expect(catalogSummary?.statuses.map(({ performanceEvidenceStatus, count }) => ({
      performanceEvidenceStatus,
      count,
    }))).toEqual([
      { performanceEvidenceStatus: 'not-tested', count: 51 },
      { performanceEvidenceStatus: 'source-audit-only-no-local-backtest', count: 6 },
      { performanceEvidenceStatus: 'qa-only-no-performance-result', count: 1 },
      { performanceEvidenceStatus: 'modeled-historical-pass', count: 0 },
      { performanceEvidenceStatus: 'modeled-historical-fail', count: 3 },
      { performanceEvidenceStatus: 'modeled-historical-inconclusive', count: 0 },
    ]);
    expect(context(evidence).catalogEvidenceStateSummary).toEqual(catalogSummary);
    expect(context(candidate).catalogEvidenceStateSummary).toEqual(catalogSummary);
    expect(evidence.evidenceStateSummary).toMatchObject({
      totalCandidates: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 7,
      plainLanguageSummary: EVIDENCE_PLAIN_LANGUAGE_SUMMARY,
    });
    expect(evidence.evidenceStateSummary.statuses.map((status) => status.count)).toEqual([
      0, 6, 1, 0, 3, 0,
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
        bytes: 2_001,
        sha256: 'df9605af6989e9bb1cbb7a1eec2dfe9dab13851f631878096524cc185ecfd29d',
      },
      recordLinks: {
        bytes: 11_335,
        sha256: '6b4721b769db3cb6bd033c6b8d9d01c850db1f387ebdf33446fd14dccca0a06c',
      },
      catalog: {
        bytes: 108_408,
        sha256: '9c60f1a917e697806d4f0e7693c18d05e0013e3aef9d747cba1435993df0a55d',
      },
      evidence: {
        bytes: 53_367,
        sha256: '98a39c2b6721860c98efe3c3adc2203adf4bf11762a51ebc0af8f9af72e03193',
      },
    });
  });

  it('freezes protected catalog parity and intentional evidence context movement', () => {
    expect(fingerprint(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    ))).toEqual({
      bytes: 73_804,
      sha256: '8962f8d01ba67241393e451b6027240f71b315d93ec038c741c29e96f0c270df',
    });
    const protectedEvidence = buildResearchIntakeAdminEvidencePayload(DETERMINISTIC_AT);
    expect(protectedEvidence.catalogEvidenceStateSummary).toEqual(
      context(buildResearchIntakePublicPayload()).catalogEvidenceStateSummary,
    );
    expect(fingerprint(protectedEvidence)).toEqual({
      bytes: 81_672,
      sha256: '83501ae0607a65182fd228bb1420b66c494da6b9c8204b406d48b7b82732dd95',
    });
  });
});

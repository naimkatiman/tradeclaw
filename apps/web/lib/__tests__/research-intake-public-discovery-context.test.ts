import { createHash } from 'node:crypto';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
} from '../research-intake-admin';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const DETERMINISTIC_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const CATALOG_PLAIN_LANGUAGE_SUMMARY =
  '61 candidates: 52 not tested by TradeClaw, 5 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';
const EVIDENCE_PLAIN_LANGUAGE_SUMMARY =
  '9 candidates: 5 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 6 candidates.';

const EXPECTED_RESOURCES = {
  catalog: '/api/research/intake',
  catalogCsv: '/api/research/intake.csv',
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
    const catalog = buildResearchIntakePublicPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    const candidate = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    if (!candidate) throw new Error('TC-260 public candidate fixture is missing');

    expect(context(catalog).resources).toEqual(EXPECTED_RESOURCES);
    expect(Object.isFrozen(context(catalog).resources)).toBe(true);
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
        bytes: 167,
        sha256: 'eb851f022c0a21e501831ceab58481e0462227234aeaef7821104cb37cd238a2',
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
        bytes: 103_535,
        sha256: '866c83f1b0fe086878e33418fbbc20936ba4a01b4003ec26b85c978741224ce1',
      },
      evidence: {
        bytes: 47_163,
        sha256: '9cb2c571cbde96bda6a89cacd8e43d97c96944b2f46f441764bb305cdaa0759a',
      },
    });
  });

  it('freezes protected catalog parity and intentional evidence context movement', () => {
    expect(fingerprint(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    ))).toEqual({
      bytes: 73_625,
      sha256: 'd984b0ce4af44299208a1b032e8a3a51810fd967c52a1df5a84d424e15c4a926',
    });
    const protectedEvidence = buildResearchIntakeAdminEvidencePayload(DETERMINISTIC_AT);
    expect(protectedEvidence.catalogEvidenceStateSummary).toEqual(
      context(buildResearchIntakePublicPayload()).catalogEvidenceStateSummary,
    );
    expect(fingerprint(protectedEvidence)).toEqual({
      bytes: 74_718,
      sha256: '42a7e9e84cce1aeb615e7ec4fce7007f0e5e93ba095fe7cda06159a69281d59f',
    });
  });
});

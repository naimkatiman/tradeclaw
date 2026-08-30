import { createHash } from 'node:crypto';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const EXPECTED_PLAIN_LANGUAGE_SUMMARY =
  '61 candidates: 52 not tested by TradeClaw, 5 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';

interface EvidenceSummaryView {
  totalCandidates: number;
  withTradeClawRecord: number;
  performanceGatesEvaluated: number;
  performanceGatesNotEvaluated: number;
  plainLanguageSummary: string;
  statuses: readonly { performanceEvidenceStatus: string; count: number }[];
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

interface CatalogContextCarrier {
  catalogEvidenceStateSummary?: EvidenceSummaryView;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

function catalogContext(payload: unknown): EvidenceSummaryView | undefined {
  return (payload as CatalogContextCarrier).catalogEvidenceStateSummary;
}

function expectCompleteCatalog(summary: EvidenceSummaryView | undefined): void {
  expect(summary).toMatchObject({
    totalCandidates: 61,
    withTradeClawRecord: 9,
    performanceGatesEvaluated: 3,
    performanceGatesNotEvaluated: 58,
    plainLanguageSummary: EXPECTED_PLAIN_LANGUAGE_SUMMARY,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
  });
  expect(summary?.statuses.map(({ performanceEvidenceStatus, count }) => ({
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
}

describe('protected research discovery context parity', () => {
  it('keeps the complete catalog interpretation on exact candidate traversal', () => {
    const catalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    );
    const candidate = buildResearchIntakeAdminCandidatePayload(
      CANDIDATE_ID,
      OBSERVED_AT,
    );
    if (!candidate) throw new Error('Admin candidate fixture is missing');

    expectCompleteCatalog(catalogContext(candidate));
    expect(catalogContext(candidate)).toEqual(catalog.catalogEvidenceStateSummary);
  });

  it('keeps whole-catalog context separate from the complete evidence subset', () => {
    const catalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    );
    const evidence = buildResearchIntakeAdminEvidencePayload(OBSERVED_AT);

    expectCompleteCatalog(catalogContext(evidence));
    expect(catalogContext(evidence)).toEqual(catalog.catalogEvidenceStateSummary);
    expect(evidence.evidenceStateSummary).toMatchObject({
      totalCandidates: 9,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 6,
    });
    expect(evidence.evidenceStateSummary).not.toEqual(catalogContext(evidence));
  });

  it('keeps whole-catalog context separate from the observation-consistent review queue', () => {
    const catalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    );
    const review = buildResearchIntakeAdminReviewPayload(OBSERVED_AT);

    expectCompleteCatalog(catalogContext(review));
    expect(catalogContext(review)).toEqual(catalog.catalogEvidenceStateSummary);
    expect(review.queue.evidenceStateSummary).toMatchObject({
      totalCandidates: 4,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 1,
    });
    expect(review.queue.evidenceStateSummary).not.toEqual(catalogContext(review));
  });

  it('matches the already-public whole-catalog interpretation exactly', () => {
    const protectedCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    ).catalogEvidenceStateSummary;
    const publicCatalog = buildResearchIntakePublicPayload()
      .catalogEvidenceStateSummary;

    expectCompleteCatalog(protectedCatalog);
    expect(protectedCatalog).toEqual(publicCatalog);
  });

  it('keeps every unrelated public, protected-catalog, and CSV receipt byte-identical', () => {
    expect({
      protectedCatalog: fingerprint(buildResearchIntakeAdminPayload(
        new URLSearchParams(),
        OBSERVED_AT,
      )),
      publicCatalog: fingerprint(buildResearchIntakePublicPayload()),
      publicCandidate: fingerprint(buildResearchIntakePublicCandidatePayload(CANDIDATE_ID)),
      publicEvidence: fingerprint(buildResearchIntakePublicEvidencePayload()),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(buildResearchIntakeAdminEvidenceCsv(
        '2026-08-29T18:00:40.000Z',
      )),
      protectedReviewCsv: fingerprint(buildResearchMarketingReviewCsv(
        '2026-08-29T14:59:59.999Z',
      )),
    }).toEqual({
      protectedCatalog: {
        bytes: 73_742,
        sha256: 'aff25e683d4af3c7858c1f2a9a390e506841ee7acbfea51a227fed58c2ffc17c',
      },
      publicCatalog: {
        bytes: 103_638,
        sha256: '4c699409e133e65e5677245239e52eb0697331b3fc4f382bc0a5e06c64e2b5fb',
      },
      publicCandidate: {
        bytes: 9_510,
        sha256: 'a6cd7cbb768d846613cdef3cf3d5e383cb213c6fad5d3db6172d7a33d76d5dea',
      },
      publicEvidence: {
        bytes: 47_265,
        sha256: '738d0d1a9ddb7385c4f358f2eb7c8ec7f9e2d9d1e0a464edb38b881f98787cd2',
      },
      publicCatalogCsv: {
        bytes: 37_019,
        sha256: '74827c9faf0279f1ab17ce4208d4620667115cfc980477092a424aca417a3e99',
      },
      publicEvidenceCsv: {
        bytes: 6_587,
        sha256: '2efdfe5dabf5dbe560fb785a8ffd55d9bdac38ebb5a1e15dd35b156dd92479be',
      },
      protectedEvidenceCsv: {
        bytes: 16_322,
        sha256: '13454dd391bba590b39f1ffd29cd8c543f2135a4499e45b46bd192c54ba70b4c',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

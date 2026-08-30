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
        bytes: 73_625,
        sha256: 'd984b0ce4af44299208a1b032e8a3a51810fd967c52a1df5a84d424e15c4a926',
      },
      publicCatalog: {
        bytes: 103_535,
        sha256: '866c83f1b0fe086878e33418fbbc20936ba4a01b4003ec26b85c978741224ce1',
      },
      publicCandidate: {
        bytes: 9_407,
        sha256: 'ce27792f8cee9e72f3133b1e7ced0f2b6895920cd3428a85b819710bc8620c7e',
      },
      publicEvidence: {
        bytes: 47_163,
        sha256: '9cb2c571cbde96bda6a89cacd8e43d97c96944b2f46f441764bb305cdaa0759a',
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

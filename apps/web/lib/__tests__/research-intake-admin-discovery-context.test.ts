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
  '61 candidates: 49 not tested by TradeClaw, 8 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';

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
    withTradeClawRecord: 12,
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
    { performanceEvidenceStatus: 'not-tested', count: 49 },
    { performanceEvidenceStatus: 'source-audit-only-no-local-backtest', count: 8 },
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
      totalCandidates: 12,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 9,
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

  it('freezes the protected packet-link movement while keeping public and CSV receipts byte-identical', () => {
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
        bytes: 77_471,
        sha256: 'b70b0fb3a586ba678b1df9c4b5f7f2a3984e3ca74823841bf3b151ed5fa4afdf',
      },
      publicCatalog: {
        bytes: 123_757,
        sha256: '08ad2eb46168deee158160be622e2d95edd916afa9e5979bd4b8b35bec135f06',
      },
      publicCandidate: {
        bytes: 9_832,
        sha256: 'ccedc16206b6f1f9fe0bb467b75acffa17152b8ab577f71654eed426626c7eb6',
      },
      publicEvidence: {
        bytes: 68_289,
        sha256: 'ba1023f37081389e7e90cd7b9568496748045c45eb40822d5ac605d78fcff39b',
      },
      publicCatalogCsv: {
        bytes: 37_314,
        sha256: '9a8673a9d7ff14c6ec05f4bf3da6e94e8af0eb51220400dbd2fba6dbca371e04',
      },
      publicEvidenceCsv: {
        bytes: 8_557,
        sha256: 'be4d757a87c8d7903ef5c9f9ab34bbea6764f7d92fe4d3cd66db71b5faea08bf',
      },
      protectedEvidenceCsv: {
        bytes: 19_151,
        sha256: 'fbcc568d8ee534895cd4773a333dc61eac0c5e0189622f1cd80836d878ef465f',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

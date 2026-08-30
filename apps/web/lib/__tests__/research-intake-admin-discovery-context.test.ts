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
  '61 candidates: 50 not tested by TradeClaw, 7 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';

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
    withTradeClawRecord: 11,
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
    { performanceEvidenceStatus: 'not-tested', count: 50 },
    { performanceEvidenceStatus: 'source-audit-only-no-local-backtest', count: 7 },
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
      totalCandidates: 11,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 8,
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
        sha256: 'ab2bf59ce46ff8357f8282f8b2e95c66f5eed4c6c96221e65f49b476d0e15952',
      },
      publicCatalog: {
        bytes: 118_533,
        sha256: 'b227e2795a1084f84e260c846e9754db0130f00d07e15a98b52cfbbc31976c24',
      },
      publicCandidate: {
        bytes: 9_832,
        sha256: '157b1f8e1d40e2eea4f604113f7a7fec349243bd34387be76c8be0cc525e6d12',
      },
      publicEvidence: {
        bytes: 61_989,
        sha256: 'd2dc61fb5abd224475ad52571aaedcd8025d2eea84e084565e798fae0ffbefc2',
      },
      publicCatalogCsv: {
        bytes: 37_222,
        sha256: '2a9b607cf4fd0adcc5efb4486ff7d2d28c4575a46e35fa64e1dc8df152ff571e',
      },
      publicEvidenceCsv: {
        bytes: 7_958,
        sha256: '14fd4f3c2b6e87acadebe77076791436b2e01239507ebe8931a39c736a0b48b4',
      },
      protectedEvidenceCsv: {
        bytes: 18_299,
        sha256: 'e4bfbec42a10c29b013aa8816f29fc925bfa5623d4e1084cfac496af04f67015',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

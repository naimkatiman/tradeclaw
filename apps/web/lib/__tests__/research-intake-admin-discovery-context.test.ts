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
  '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';

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
    withTradeClawRecord: 10,
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
    { performanceEvidenceStatus: 'not-tested', count: 51 },
    { performanceEvidenceStatus: 'source-audit-only-no-local-backtest', count: 6 },
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
      totalCandidates: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 7,
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
        bytes: 73_804,
        sha256: '8962f8d01ba67241393e451b6027240f71b315d93ec038c741c29e96f0c270df',
      },
      publicCatalog: {
        bytes: 108_408,
        sha256: '9c60f1a917e697806d4f0e7693c18d05e0013e3aef9d747cba1435993df0a55d',
      },
      publicCandidate: {
        bytes: 9_545,
        sha256: 'eb29576895b998b771dcbea4a99819bc90a4bdc5f6a34405a989043c3e98e816',
      },
      publicEvidence: {
        bytes: 53_367,
        sha256: '98a39c2b6721860c98efe3c3adc2203adf4bf11762a51ebc0af8f9af72e03193',
      },
      publicCatalogCsv: {
        bytes: 37_128,
        sha256: 'afd082b0dc564675bb0c781898fd2d15c624c3ea5dc0e8cdcb69b02bf453edef',
      },
      publicEvidenceCsv: {
        bytes: 7_415,
        sha256: '704187190f0eb96753066495bac241c76e1770b9cc0562798f08b0322d93102f',
      },
      protectedEvidenceCsv: {
        bytes: 17_543,
        sha256: '43518ae9b99cd4fd7ffea64f744d49c4e628a32b1f8beb8c3c004e86b877d4c6',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

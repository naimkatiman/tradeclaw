import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T15:59:59.999Z';

interface SummaryView {
  plainLanguageSummary?: string;
  totalCandidates: number;
  withTradeClawRecord: number;
  performanceGatesEvaluated: number;
  performanceGatesNotEvaluated: number;
  statuses: readonly { performanceEvidenceStatus: string; count: number }[];
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

function fingerprint(body: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('shared plain-language evidence summary', () => {
  it('interprets the complete catalog and evidence desk without client recounting', () => {
    const catalog = buildResearchIntakePublicPayload()
      .catalogEvidenceStateSummary as SummaryView;
    const evidence = buildResearchIntakePublicEvidencePayload()
      .evidenceStateSummary as SummaryView;

    expect(catalog.plainLanguageSummary).toBe(
      '61 candidates: 47 not tested by TradeClaw, 10 source-audit-only records, '
      + '1 QA-only record with no performance result, and 3 modeled historical failures. '
      + 'Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );
    expect(evidence.plainLanguageSummary).toBe(
      '14 candidates: 10 source-audit-only records, 1 QA-only record with no performance '
      + 'result, and 3 modeled historical failures. Performance gates were evaluated for '
      + '3 candidates and not evaluated for 11 candidates.',
    );
  });

  it('handles review, singular, all-evaluated, and empty scopes explicitly', () => {
    const review = buildResearchIntakeAdminReviewPayload(OBSERVED_AT)
      .queue.evidenceStateSummary as SummaryView;
    const qaOnly = buildResearchIntakeAdminPayload(
      new URLSearchParams('evidenceStatus=qa-only-no-performance-result&limit=100'),
      OBSERVED_AT,
    ).filteredEvidenceStateSummary as SummaryView;
    const cryptoFailures = buildResearchIntakeAdminPayload(
      new URLSearchParams(
        'assetClass=Cryptocurrencies&evidenceStatus=modeled-historical-fail&limit=100',
      ),
      OBSERVED_AT,
    ).filteredEvidenceStateSummary as SummaryView;
    const empty = buildResearchIntakeAdminPayload(
      new URLSearchParams('evidenceStatus=modeled-historical-inconclusive&limit=100'),
      OBSERVED_AT,
    ).filteredEvidenceStateSummary as SummaryView;

    expect(review.plainLanguageSummary).toBe(
      '4 candidates: 1 QA-only record with no performance result and 3 modeled historical '
      + 'failures. Performance gates were evaluated for 3 candidates and not evaluated for '
      + '1 candidate.',
    );
    expect(qaOnly.plainLanguageSummary).toBe(
      '1 candidate: 1 QA-only record with no performance result. '
      + 'No performance gates were evaluated.',
    );
    expect(cryptoFailures.plainLanguageSummary).toBe(
      '2 candidates: 2 modeled historical failures. '
      + 'Performance gates were evaluated for all 2 candidates.',
    );
    expect(empty.plainLanguageSummary).toBe(
      'No candidates are in this view. No performance gates were evaluated.',
    );
  });

  it('keeps public and protected interpretation identical for the same scope', () => {
    const publicCatalog = buildResearchIntakePublicPayload()
      .catalogEvidenceStateSummary as SummaryView;
    const protectedCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      OBSERVED_AT,
    ).catalogEvidenceStateSummary as SummaryView;

    expect(protectedCatalog.plainLanguageSummary).toBe(
      '61 candidates: 47 not tested by TradeClaw, 10 source-audit-only records, '
      + '1 QA-only record with no performance result, and 3 modeled historical failures. '
      + 'Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );
    expect(protectedCatalog.plainLanguageSummary).toBe(publicCatalog.plainLanguageSummary);
    expect(protectedCatalog.statuses).toEqual(publicCatalog.statuses);
    expect(protectedCatalog).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 14,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
  });

  it('documents the required presentation-ready field in public OpenAPI', () => {
    const schema = (buildOpenApiSpec() as {
      components: {
        schemas: {
          ResearchIntakeEvidenceStateSummary: {
            required: string[];
            properties: Record<string, { type?: string; description?: string }>;
          };
        };
      };
    }).components.schemas.ResearchIntakeEvidenceStateSummary;

    expect(schema.required).toContain('plainLanguageSummary');
    expect(schema.properties.plainLanguageSummary).toMatchObject({
      type: 'string',
      description: expect.stringMatching(/presentation-ready|same counts/i),
    });
  });

  it('makes the shared interpretation discoverable in the README API guide', () => {
    const readme = readFileSync(resolve(__dirname, '../../../../README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(api).toContain('plainLanguageSummary');
    expect(api).toMatch(/same classifier counts/i);
    expect(api).toMatch(/resources[\s\S]*links\.candidate/i);
  });

  it('keeps all public and protected CSV exports byte-identical', () => {
    expect({
      publicCatalog: fingerprint(buildResearchIntakeCsv()),
      publicEvidence: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidence: fingerprint(buildResearchIntakeAdminEvidenceCsv(
        '2026-08-29T18:00:40.000Z',
      )),
      protectedReview: fingerprint(buildResearchMarketingReviewCsv(
        '2026-08-29T14:59:59.999Z',
      )),
    }).toEqual({
      publicCatalog: {
        bytes: 37_522,
        sha256: 'e6f1023e3adfa4672bfe285b9f206d91bb2704488270818a9ef3fee9b5d615cf',
      },
      publicEvidence: {
        bytes: 9_820,
        sha256: '091b91a4a5ccaf5278456964b29e3c77e889fa14278cc07f4ae6100f477ab31c',
      },
      protectedEvidence: {
        bytes: 20_948,
        sha256: 'a7cc6415ba8f02802d6922d2e5088a0c7fed2abb9e8cc1b523fb1f170e085661',
      },
      protectedReview: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

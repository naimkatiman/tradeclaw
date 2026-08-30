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
      '61 candidates: 52 not tested by TradeClaw, 5 source-audit-only records, '
      + '1 QA-only record with no performance result, and 3 modeled historical failures. '
      + 'Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );
    expect(evidence.plainLanguageSummary).toBe(
      '9 candidates: 5 source-audit-only records, 1 QA-only record with no performance '
      + 'result, and 3 modeled historical failures. Performance gates were evaluated for '
      + '3 candidates and not evaluated for 6 candidates.',
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
      '61 candidates: 52 not tested by TradeClaw, 5 source-audit-only records, '
      + '1 QA-only record with no performance result, and 3 modeled historical failures. '
      + 'Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );
    expect(protectedCatalog.plainLanguageSummary).toBe(publicCatalog.plainLanguageSummary);
    expect(protectedCatalog.statuses).toEqual(publicCatalog.statuses);
    expect(protectedCatalog).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 9,
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
        bytes: 37_019,
        sha256: '74827c9faf0279f1ab17ce4208d4620667115cfc980477092a424aca417a3e99',
      },
      publicEvidence: {
        bytes: 6_587,
        sha256: '2efdfe5dabf5dbe560fb785a8ffd55d9bdac38ebb5a1e15dd35b156dd92479be',
      },
      protectedEvidence: {
        bytes: 16_322,
        sha256: '13454dd391bba590b39f1ffd29cd8c543f2135a4499e45b46bd192c54ba70b4c',
      },
      protectedReview: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

import { buildResearchIntakeAdminEvidencePayload } from '../research-intake-admin';
import { buildResearchIntakePublicEvidencePayload } from '../research-intake-public';
import { buildOpenApiSpec } from '../openapi';

const AUDIT_AT = '2026-08-29T21:09:39.110Z';

const EXPECTED_EVIDENCE_STATE_SUMMARY = {
  totalCandidates: 14,
  withTradeClawRecord: 14,
  performanceGatesEvaluated: 3,
  performanceGatesNotEvaluated: 11,
  plainLanguageSummary:
    '14 candidates: 10 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 11 candidates.',
  statuses: [
    {
      performanceEvidenceStatus: 'not-tested',
      label: 'Not tested by TradeClaw',
      meaning:
        'Only upstream gross discovery metadata is available; TradeClaw has not audited or performance-tested this candidate.',
      count: 0,
      performanceGatesEvaluated: false,
    },
    {
      performanceEvidenceStatus: 'source-audit-only-no-local-backtest',
      label: 'Source audit only',
      meaning:
        'Only a TradeClaw source audit is available; no local backtest ran, so there is no performance conclusion.',
      count: 10,
      performanceGatesEvaluated: false,
    },
    {
      performanceEvidenceStatus: 'qa-only-no-performance-result',
      label: 'QA complete; no performance result',
      meaning:
        'TradeClaw completed replication QA but did not evaluate performance gates, so there is no performance conclusion.',
      count: 1,
      performanceGatesEvaluated: false,
    },
    {
      performanceEvidenceStatus: 'modeled-historical-pass',
      label: 'Modeled historical pass',
      meaning:
        'A modeled historical TradeClaw replication passed its frozen gates; this is not live performance.',
      count: 0,
      performanceGatesEvaluated: true,
    },
    {
      performanceEvidenceStatus: 'modeled-historical-fail',
      label: 'Modeled historical fail',
      meaning:
        'A modeled historical TradeClaw replication failed its frozen gates; this is not live performance.',
      count: 3,
      performanceGatesEvaluated: true,
    },
    {
      performanceEvidenceStatus: 'modeled-historical-inconclusive',
      label: 'Modeled historical inconclusive',
      meaning:
        'A modeled historical TradeClaw replication was inconclusive under its frozen gates; this is not live performance.',
      count: 0,
      performanceGatesEvaluated: true,
    },
  ],
  grantsPublicationAuthority: false,
  grantsTradingAuthority: false,
};

function summaryFrom(payload: unknown): unknown {
  return (payload as { evidenceStateSummary?: unknown }).evidenceStateSummary;
}

describe('research intake evidence-state summary', () => {
  it('gives public users exact, ordered counts without reinterpreting verdict totals', () => {
    expect(summaryFrom(buildResearchIntakePublicEvidencePayload())).toEqual(
      EXPECTED_EVIDENCE_STATE_SUMMARY,
    );
  });

  it('gives authenticated admins the identical complete-desk summary', () => {
    const publicSummary = summaryFrom(buildResearchIntakePublicEvidencePayload());
    const protectedSummary = summaryFrom(buildResearchIntakeAdminEvidencePayload(AUDIT_AT));

    expect(protectedSummary).toEqual(EXPECTED_EVIDENCE_STATE_SUMMARY);
    expect(protectedSummary).toEqual(publicSummary);
  });

  it('documents the summary and its stable six-state order in the public schema', () => {
    const schemas = (buildOpenApiSpec() as {
      components: {
        schemas: {
          ResearchIntakeEvidenceResponse: {
            required: string[];
            properties: { evidenceStateSummary: { $ref: string } };
          };
          ResearchIntakeEvidenceStateSummary: {
            required: string[];
            properties: {
              plainLanguageSummary: { type: string; description: string };
              statuses: {
                minItems: number;
                maxItems: number;
                items: {
                  properties: {
                    performanceEvidenceStatus: { enum: string[] };
                  };
                };
              };
            };
          };
        };
      };
    }).components.schemas;

    expect(schemas.ResearchIntakeEvidenceResponse.required).toContain(
      'evidenceStateSummary',
    );
    expect(
      schemas.ResearchIntakeEvidenceResponse.properties.evidenceStateSummary.$ref,
    ).toBe('#/components/schemas/ResearchIntakeEvidenceStateSummary');
    expect(schemas.ResearchIntakeEvidenceStateSummary.properties.statuses).toMatchObject({
      minItems: 6,
      maxItems: 6,
    });
    expect(schemas.ResearchIntakeEvidenceStateSummary.required).toContain(
      'plainLanguageSummary',
    );
    expect(
      schemas.ResearchIntakeEvidenceStateSummary.properties.plainLanguageSummary,
    ).toMatchObject({
      type: 'string',
      description: expect.stringMatching(/same ordered counts.*no evidence or authority/i),
    });
    expect(
      schemas.ResearchIntakeEvidenceStateSummary.properties.statuses.items.properties
        .performanceEvidenceStatus.enum,
    ).toEqual(EXPECTED_EVIDENCE_STATE_SUMMARY.statuses.map(
      (status) => status.performanceEvidenceStatus,
    ));
  });
});

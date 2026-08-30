import { SYSTEMATIC_RESEARCH_INTAKE } from '../research-intake';
import { buildResearchIntakePublicPayload } from '../research-intake-public';

function recordByTask(
  payload: ReturnType<typeof buildResearchIntakePublicPayload>,
  taskId: string,
) {
  const record = payload.records.find(
    (candidate) =>
      candidate.tradeClawEvidence?.taskId === taskId ||
      candidate.tradeClawSourceAudit?.taskId === taskId,
  );
  if (!record) throw new Error(`Missing public research intake record for ${taskId}`);
  return record;
}

describe('public research intake projection', () => {
  it('returns the complete pinned catalog in exact source order', () => {
    const payload = buildResearchIntakePublicPayload();

    expect(payload).toMatchObject({
      schemaVersion: 1,
      access: {
        mode: 'public-read-only',
        requiresAuthentication: false,
        requiresApiKey: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
      source: {
        commit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
        reportedPerformanceBasis: 'gross-of-trading-costs',
        tradeClawTreatment: 'discovery-only',
      },
      catalogSummary: {
        total: 61,
        discovered: 50,
        sourceAudited: 7,
        preregistered: 0,
        replicated: 4,
        prospective: 0,
        passed: 0,
        failed: 3,
        inconclusive: 1,
        untested: 57,
        sourceNoGo: 7,
      },
    });
    expect(payload.workflow).toHaveLength(5);
    expect(payload.selectionPolicy).toMatch(/gross discovery metadata/i);
    expect(payload.records.map((record) => record.id)).toEqual(
      SYSTEMATIC_RESEARCH_INTAKE.map((record) => record.id),
    );
    expect(payload.records.map((record) => record.sourcePosition)).toEqual(
      Array.from({ length: 61 }, (_, index) => index),
    );
    expect(buildResearchIntakePublicPayload()).toEqual(payload);
  });

  it('labels evidence origin without projecting admin or marketing workflow', () => {
    const payload = buildResearchIntakePublicPayload();
    const basisCounts = payload.records.reduce<Record<string, number>>((counts, record) => {
      counts[record.evidenceBasis] = (counts[record.evidenceBasis] ?? 0) + 1;
      return counts;
    }, {});

    expect(basisCounts).toEqual({
      'upstream-gross-discovery-only': 50,
      'tradeclaw-source-audit-only': 7,
      'tradeclaw-replication-record': 4,
    });
    for (const record of payload.records) {
      expect(record).not.toHaveProperty('nextAction');
      expect(record).not.toHaveProperty('marketingDisposition');
      expect(record.discoveryBasis).toBe('upstream-gross-metadata');
    }

    const serialized = JSON.stringify(payload);
    for (const forbidden of [
      'nextAction',
      'marketingDisposition',
      'marketingReviewDraft',
      'researchLoop',
      'marketingReview',
      'latestReceipt',
      'currentWindowReceipts',
    ]) {
      expect(serialized).not.toContain(`\"${forbidden}\"`);
    }
    expect(payload.claimBoundary.upstreamMetrics).toMatch(/gross.*discovery-only/i);
    expect(payload.claimBoundary.replication).toMatch(/modeled historical research/i);
  });

  it('preserves every completed overlay verdict and false authority boundary', () => {
    const tc255 = recordByTask(buildResearchIntakePublicPayload(), 'TC-255');
    expect(tc255).toMatchObject({
      stage: 'replicated',
      verdict: 'fail',
      costStatus: 'failed',
      evidenceBasis: 'tradeclaw-replication-record',
      tradeClawEvidence: {
        taskId: 'TC-255',
        eligibleForProspectiveReview: false,
        activationApproved: false,
      },
    });

    const tc256 = recordByTask(buildResearchIntakePublicPayload(), 'TC-256');
    expect(tc256).toMatchObject({
      stage: 'source-audited',
      verdict: 'not-tested',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: {
        taskId: 'TC-256',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
      },
      tradeClawEvidence: null,
    });

    const tc257 = recordByTask(buildResearchIntakePublicPayload(), 'TC-257');
    expect(tc257).toMatchObject({
      stage: 'replicated',
      verdict: 'inconclusive',
      costStatus: 'unassessed',
      tradeClawEvidence: {
        taskId: 'TC-257',
        performanceGatesEvaluated: false,
        eligibleForProspectiveReview: false,
        activationApproved: false,
        publicationApproved: false,
      },
    });

    for (const taskId of ['TC-258', 'TC-259']) {
      expect(recordByTask(buildResearchIntakePublicPayload(), taskId)).toMatchObject({
        stage: 'replicated',
        verdict: 'fail',
        costStatus: 'failed',
        tradeClawEvidence: {
          taskId,
          performanceGatesEvaluated: true,
          eligibleForProspectiveReview: false,
          activationApproved: false,
          publicationApproved: false,
        },
      });
    }

    const tc260 = recordByTask(buildResearchIntakePublicPayload(), 'TC-260');
    expect(tc260).toMatchObject({
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: {
        taskId: 'TC-260',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
      },
      tradeClawEvidence: null,
    });

    const tc261 = recordByTask(buildResearchIntakePublicPayload(), 'TC-261');
    expect(tc261).toMatchObject({
      sourcePosition: 32,
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: {
        taskId: 'TC-261',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
        currentDataReceipt: { pivxPriceUsdAvailable: false },
      },
      tradeClawEvidence: null,
    });

    const tc262 = recordByTask(buildResearchIntakePublicPayload(), 'TC-262');
    expect(tc262).toMatchObject({
      sourcePosition: 6,
      stage: 'source-audited',
      verdict: 'not-tested',
      costStatus: 'unassessed',
      evidenceBasis: 'tradeclaw-source-audit-only',
      tradeClawSourceAudit: {
        taskId: 'TC-262',
        disposition: 'no-go',
        tradeClawBacktestRun: false,
        publishedRule: { cadence: 'semiannual', rebalanceMonths: [5, 11] },
      },
      tradeClawEvidence: null,
    });
  });
});

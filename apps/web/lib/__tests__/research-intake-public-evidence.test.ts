import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
  type ResearchIntakePublicRecord,
} from '../research-intake-public';

function taskId(record: ResearchIntakePublicRecord): string | null {
  return record.tradeClawEvidence?.taskId ?? record.tradeClawSourceAudit?.taskId ?? null;
}

describe('public research evidence index', () => {
  it('returns every available overlay in pinned source order without performance ranking', () => {
    const catalog = buildResearchIntakePublicPayload();
    const payload = buildResearchIntakePublicEvidencePayload();
    const expectedRecords = catalog.records.filter(
      (record) => record.tradeClawSourceAudit !== null || record.tradeClawEvidence !== null,
    );

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
        replicated: 4,
        failed: 3,
        inconclusive: 1,
        sourceNoGo: 7,
      },
      evidenceIndex: {
        selection: 'all-candidates-with-tradeclaw-source-audit-or-replication',
        order: 'pinned-source-order',
        performanceRanked: false,
        includesEveryAvailableOverlay: true,
      },
      evidenceSummary: {
        total: 11,
        discovered: 0,
        sourceAudited: 7,
        preregistered: 0,
        replicated: 4,
        prospective: 0,
        passed: 0,
        failed: 3,
        inconclusive: 1,
        untested: 7,
        sourceNoGo: 7,
      },
    });
    expect(payload.workflow).toHaveLength(5);
    expect(payload.selectionPolicy).toMatch(/gross discovery metadata/i);
    expect(payload.records).toEqual(expectedRecords);
    expect(payload.records.map(taskId)).toEqual([
      'TC-262',
      'TC-259',
      'TC-257',
      'TC-264',
      'TC-265',
      'TC-255',
      'TC-261',
      'TC-258',
      'TC-256',
      'TC-263',
      'TC-260',
    ]);
    expect(payload.records.map((record) => record.sourcePosition)).toEqual(
      [...payload.records].map((record) => record.sourcePosition).sort((left, right) => left - right),
    );
    expect(new Set(payload.records.map((record) => record.id))).toHaveProperty('size', 11);
    expect(payload.records.every((record) => record.evidenceBasis !== 'upstream-gross-discovery-only'))
      .toBe(true);
    expect(buildResearchIntakePublicEvidencePayload()).toEqual(payload);
    expect(JSON.stringify(payload).length).toBeLessThan(JSON.stringify(catalog).length * 0.55);
  });

  it('retains every adverse, no-go, and inconclusive boundary', () => {
    const payload = buildResearchIntakePublicEvidencePayload();
    const byTask = new Map(payload.records.map((record) => [taskId(record), record]));

    for (const id of ['TC-255', 'TC-258', 'TC-259']) {
      expect(byTask.get(id)).toMatchObject({
        stage: 'replicated',
        verdict: 'fail',
        costStatus: 'failed',
        evidenceBasis: 'tradeclaw-replication-record',
        tradeClawEvidence: {
          taskId: id,
          eligibleForProspectiveReview: false,
          activationApproved: false,
        },
      });
    }

    expect(byTask.get('TC-257')).toMatchObject({
      stage: 'replicated',
      verdict: 'inconclusive',
      costStatus: 'unassessed',
      tradeClawEvidence: {
        taskId: 'TC-257',
        performanceGatesEvaluated: false,
        publicationApproved: false,
      },
    });

    for (const id of ['TC-256', 'TC-260', 'TC-261', 'TC-262', 'TC-263', 'TC-264', 'TC-265']) {
      expect(byTask.get(id)).toMatchObject({
        stage: 'source-audited',
        verdict: 'not-tested',
        costStatus: 'unassessed',
        evidenceBasis: 'tradeclaw-source-audit-only',
        tradeClawSourceAudit: {
          taskId: id,
          disposition: 'no-go',
          tradeClawBacktestRun: false,
        },
        tradeClawEvidence: null,
      });
    }
    expect(byTask.has(null)).toBe(false);
  });

  it('keeps admin, marketing, receipt, and authority workflow out of the response', () => {
    const payload = buildResearchIntakePublicEvidencePayload();
    const serialized = JSON.stringify(payload);

    for (const forbidden of [
      'nextAction',
      'marketingDisposition',
      'marketingReviewDraft',
      'researchLoop',
      'marketingReview',
      'latestReceipt',
      'currentWindowReceipts',
      'publicationApprovedDrafts',
    ]) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
    expect(payload.claimBoundary.upstreamMetrics).toMatch(/gross.*discovery-only/i);
    expect(payload.claimBoundary.sourceAudit).toMatch(/no-go is not a local performance failure/i);
    expect(payload.claimBoundary.replication).toMatch(/modeled historical research/i);
    expect(payload.claimBoundary.authority).toMatch(/no authority to publish claims/i);
  });
});

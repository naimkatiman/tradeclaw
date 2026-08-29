import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';

describe('public research intake candidate projection', () => {
  it('returns one exact public record with the full catalog context and no admin workflow', () => {
    const catalog = buildResearchIntakePublicPayload();
    const payload = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    const { records, ...catalogContext } = catalog;
    const expectedRecord = records.find((record) => record.id === CANDIDATE_ID);

    if (!payload || !expectedRecord) throw new Error('TC-260 public candidate fixture is missing');

    expect(records).toHaveLength(61);
    expect(payload).toEqual({ ...catalogContext, record: expectedRecord });
    expect(payload).not.toHaveProperty('records');
    expect(payload.record).toMatchObject({
      id: CANDIDATE_ID,
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
    expect(payload.access).toEqual({
      mode: 'public-read-only',
      requiresAuthentication: false,
      requiresApiKey: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const serialized = JSON.stringify(payload);
    expect(serialized.length).toBeLessThan(JSON.stringify(catalog).length / 2);
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
  });

  it('uses exact canonical IDs and never aliases or fuzzy-matches', () => {
    for (const candidateId of [
      CANDIDATE_ID.toUpperCase(),
      ` ${CANDIDATE_ID}`,
      `${CANDIDATE_ID} `,
      'TC-260',
      'A Risk-Based Approach to Tactical Asset Allocation',
      '0',
      'missing-candidate',
    ]) {
      expect(buildResearchIntakePublicCandidatePayload(candidateId)).toBeNull();
    }

    expect(buildResearchIntakePublicCandidatePayload(CANDIDATE_ID)?.record.id).toBe(
      CANDIDATE_ID,
    );
  });
});

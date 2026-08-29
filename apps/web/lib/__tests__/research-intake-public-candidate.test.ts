import { createHash } from 'node:crypto';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const FIRST_CANDIDATE_ID =
  'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe';
const MIDDLE_CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

interface CandidateNavigation {
  order: 'pinned-source-order';
  currentPosition: number;
  totalCandidates: number;
  catalogHref: string;
  selfHref: string;
  previous: { id: string; title: string; position: number; href: string } | null;
  next: { id: string; title: string; position: number; href: string } | null;
}

function navigation(payload: unknown): CandidateNavigation | undefined {
  return (payload as { navigation?: CandidateNavigation }).navigation;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const serialized = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

describe('public research intake candidate projection', () => {
  it('returns one exact public record with the full catalog context and no admin workflow', () => {
    const catalog = buildResearchIntakePublicPayload();
    const payload = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    const { records, ...catalogContext } = catalog;
    const expectedRecord = records.find((record) => record.id === CANDIDATE_ID);

    if (!payload || !expectedRecord) throw new Error('TC-260 public candidate fixture is missing');

    expect(records).toHaveLength(61);
    expect(payload).toEqual({
      ...catalogContext,
      navigation: {
        order: 'pinned-source-order',
        currentPosition: 61,
        totalCandidates: 61,
        catalogHref: '/api/research/intake',
        selfHref: `/api/research/intake/${CANDIDATE_ID}`,
        previous: {
          id: 'risk-parity-portfolios-with-risk-factors',
          title: 'Risk Parity Portfolios with Risk Factors',
          position: 60,
          href: '/api/research/intake/risk-parity-portfolios-with-risk-factors',
        },
        next: null,
      },
      record: expectedRecord,
    });
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

  it('authors exact first and middle pinned-order boundaries', () => {
    const first = buildResearchIntakePublicCandidatePayload(FIRST_CANDIDATE_ID);
    const middle = buildResearchIntakePublicCandidatePayload(MIDDLE_CANDIDATE_ID);
    if (!first || !middle) throw new Error('Public candidate navigation fixture is missing');

    expect(navigation(first)).toMatchObject({
      order: 'pinned-source-order',
      currentPosition: 1,
      totalCandidates: 61,
      catalogHref: '/api/research/intake',
      selfHref: `/api/research/intake/${FIRST_CANDIDATE_ID}`,
      previous: null,
      next: {
        id: 'the-investment-capm-1',
        position: 2,
        href: '/api/research/intake/the-investment-capm-1',
      },
    });
    expect(navigation(middle)).toEqual({
      order: 'pinned-source-order',
      currentPosition: 33,
      totalCandidates: 61,
      catalogHref: '/api/research/intake',
      selfHref: `/api/research/intake/${MIDDLE_CANDIDATE_ID}`,
      previous: {
        id: 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
        title: 'How to Design a Simple Multi-Timeframe Trend Strategy on Bitcoin',
        position: 32,
        href:
          '/api/research/intake/how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      },
      next: {
        id: 'seasonality-trend-following-and-mean-reversion-in-bitcoin',
        title: 'Seasonality, Trend-following, and Mean reversion in Bitcoin',
        position: 34,
        href:
          '/api/research/intake/seasonality-trend-following-and-mean-reversion-in-bitcoin',
      },
    });
  });

  it('serializes public first, middle, and last navigation deterministically', () => {
    const first = buildResearchIntakePublicCandidatePayload(FIRST_CANDIDATE_ID);
    const middle = buildResearchIntakePublicCandidatePayload(MIDDLE_CANDIDATE_ID);
    const last = buildResearchIntakePublicCandidatePayload(CANDIDATE_ID);
    if (!first || !middle || !last) throw new Error('Public navigation fixture is missing');

    expect({
      first: fingerprint(first.navigation),
      middle: fingerprint(middle.navigation),
      last: fingerprint(last.navigation),
      lastPayload: fingerprint(last),
    }).toEqual({
      first: {
        bytes: 370,
        sha256: '0e0d7d43b7bb7b52fd621b3b4476f783c0134edda9ffaa27ca5c2b768fc42084',
      },
      middle: {
        bytes: 772,
        sha256: '06d0dec8346bf2376e37b660e87d56e4e1576e4ee2a8d2b0a2f8c94b459a9fd6',
      },
      last: {
        bytes: 404,
        sha256: '1757114bbad313f06440291ec13e4bec61b4644ecf42e204774e4dec9c7512f7',
      },
      lastPayload: {
        bytes: 6_188,
        sha256: '03215c72f4bec6cc78fa8411df282ab091a00e92ed26d31002e842aef4ef586e',
      },
    });
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

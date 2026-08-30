import { createHash } from 'node:crypto';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import {
  RESEARCH_MARKETING_REVIEW_CSV_COLUMNS,
  buildResearchMarketingReviewCsvRows,
} from '../research-marketing-review-csv';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T15:59:59.999Z';
const CSV_OBSERVED_AT = '2026-08-29T14:59:59.999Z';
const TC260_CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';

interface EvidenceStateView {
  performanceEvidenceStatus: string;
  label: string;
  meaning: string;
  performanceGatesEvaluated: boolean;
  taskId: string | null;
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

interface EvidenceStateSummaryView {
  totalCandidates: number;
  withTradeClawRecord: number;
  performanceGatesEvaluated: number;
  performanceGatesNotEvaluated: number;
  plainLanguageSummary: string;
  statuses: readonly { performanceEvidenceStatus: string; count: number }[];
  grantsPublicationAuthority: false;
  grantsTradingAuthority: false;
}

interface ReviewQueueView {
  evidenceStateSummary?: EvidenceStateSummaryView;
  items: readonly {
    handoff: { taskId: string };
    candidate: { evidenceState?: EvidenceStateView };
  }[];
}

interface ReviewPayloadView {
  catalogEvidenceStateSummary?: EvidenceStateSummaryView;
  queue: ReviewQueueView;
}

interface ReviewCsvEvidenceView {
  taskId: string;
  performanceEvidenceStatus?: string;
  performanceEvidenceLabel?: string;
  performanceEvidenceMeaning?: string;
  performanceGatesEvaluated?: boolean;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected marketing-review evidence context', () => {
  it('summarizes the complete observation-consistent review queue', () => {
    const payload = buildResearchIntakeAdminReviewPayload(OBSERVED_AT) as ReviewPayloadView;
    const queue = payload.queue;
    const emptyQueue = buildResearchIntakeAdminReviewPayload(
      '2026-08-29T04:55:26.999Z',
    ).queue as ReviewQueueView;

    expect(queue.evidenceStateSummary).toMatchObject({
      totalCandidates: 4,
      withTradeClawRecord: 4,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 1,
      plainLanguageSummary:
        '4 candidates: 1 QA-only record with no performance result and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 1 candidate.',
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(queue.evidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      0, 0, 1, 0, 3, 0,
    ]);
    expect(payload.catalogEvidenceStateSummary).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 14,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
    });
    expect(payload.catalogEvidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      47, 10, 1, 0, 3, 0,
    ]);
    expect(emptyQueue.evidenceStateSummary).toMatchObject({
      totalCandidates: 0,
      withTradeClawRecord: 0,
      performanceGatesEvaluated: 0,
      performanceGatesNotEvaluated: 0,
      plainLanguageSummary:
        'No candidates are in this view. No performance gates were evaluated.',
    });
    expect(emptyQueue.evidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
  });

  it('puts the shared record-local evidence interpretation on every review item', () => {
    const queue = buildResearchIntakeAdminReviewPayload(OBSERVED_AT).queue as ReviewQueueView;

    expect(queue.items.map((item) => ({
      taskId: item.handoff.taskId,
      status: item.candidate.evidenceState?.performanceEvidenceStatus,
      evaluated: item.candidate.evidenceState?.performanceGatesEvaluated,
    }))).toEqual([
      { taskId: 'TC-255', status: 'modeled-historical-fail', evaluated: true },
      { taskId: 'TC-257', status: 'qa-only-no-performance-result', evaluated: false },
      { taskId: 'TC-258', status: 'modeled-historical-fail', evaluated: true },
      { taskId: 'TC-259', status: 'modeled-historical-fail', evaluated: true },
    ]);
    for (const item of queue.items) {
      expect(item.candidate.evidenceState).toMatchObject({
        taskId: item.handoff.taskId,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      });
      expect(item.candidate.evidenceState?.label).not.toBe('');
      expect(item.candidate.evidenceState?.meaning).not.toBe('');
    }
  });

  it('places the four evidence columns directly after cost status in the CSV contract', () => {
    const columns = RESEARCH_MARKETING_REVIEW_CSV_COLUMNS as readonly string[];
    const costStatusIndex = columns.indexOf('costStatus');

    expect(columns.slice(costStatusIndex + 1, costStatusIndex + 5)).toEqual([
      'performanceEvidenceStatus',
      'performanceEvidenceLabel',
      'performanceEvidenceMeaning',
      'performanceGatesEvaluated',
    ]);
    expect(columns[costStatusIndex + 5]).toBe('draftTitle');
  });

  it('exports the same classifier result instead of making admins infer from verdict', () => {
    const rows = buildResearchMarketingReviewCsvRows(
      CSV_OBSERVED_AT,
    ) as unknown as ReviewCsvEvidenceView[];

    expect(rows.map((row) => ({
      taskId: row.taskId,
      status: row.performanceEvidenceStatus,
      evaluated: row.performanceGatesEvaluated,
    }))).toEqual([
      { taskId: 'TC-255', status: 'modeled-historical-fail', evaluated: true },
      { taskId: 'TC-257', status: 'qa-only-no-performance-result', evaluated: false },
      { taskId: 'TC-258', status: 'modeled-historical-fail', evaluated: true },
      { taskId: 'TC-259', status: 'modeled-historical-fail', evaluated: true },
    ]);
    for (const row of rows) {
      expect(row.performanceEvidenceLabel).not.toBe('');
      expect(row.performanceEvidenceMeaning).not.toBe('');
    }
  });

  it('freezes intentional shared-summary and packet-link receipts plus the untouched candidate', () => {
    expect({
      protectedCatalog: fingerprint(buildResearchIntakeAdminPayload(
        new URLSearchParams(),
        OBSERVED_AT,
      )),
      protectedCandidate: fingerprint(buildResearchIntakeAdminCandidatePayload(
        TC260_CANDIDATE_ID,
        OBSERVED_AT,
      )),
      protectedEvidence: fingerprint(buildResearchIntakeAdminEvidencePayload(OBSERVED_AT)),
      protectedReview: fingerprint(buildResearchIntakeAdminReviewPayload(OBSERVED_AT)),
      publicCatalog: fingerprint(buildResearchIntakePublicPayload()),
      publicEvidence: fingerprint(buildResearchIntakePublicEvidencePayload()),
      publicCandidate: fingerprint(buildResearchIntakePublicCandidatePayload(TC260_CANDIDATE_ID)),
    }).toEqual({
      protectedCatalog: {
        bytes: 83_163,
        sha256: '7bd16fe28b7e5c2bd623907112a137ca86a251dbb3241a3b43f86cd020cf7d84',
      },
      protectedCandidate: {
        bytes: 14_207,
        sha256: '382e8888b38a220cfe50a379df95350ec2a2ceda6ab24117a6a9b8fcc6287288',
      },
      protectedEvidence: {
        bytes: 112_492,
        sha256: '6e96790b2912fd28b488884377ffcc6ae1ea166f551ffca96a52773e9782bd2c',
      },
      protectedReview: {
        bytes: 31_988,
        sha256: '20bc8578dd14ddbe53a2fb5f9cbc87dcc508bbbc6c74175091dabc562f51a9f3',
      },
      publicCatalog: {
        bytes: 140_878,
        sha256: '4c48acd73a18d967bbf039e7109188c136b0f76d011b4e6da5754cb37326d3ec',
      },
      publicEvidence: {
        bytes: 82_070,
        sha256: '43d0257b89f0011979269732dd45e8fd8672c9f6aa35bb691255cd396f2076cf',
      },
      publicCandidate: {
        bytes: 10_046,
        sha256: '7f8bd9d315eca8fdba14b2098ef4c00adc98c2b0d3b92ac4b3e8590b87a2d94a',
      },
    });
  });
});

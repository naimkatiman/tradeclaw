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
      withTradeClawRecord: 9,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
    });
    expect(payload.catalogEvidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      52, 5, 1, 0, 3, 0,
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

  it('freezes every intentional shared-summary JSON receipt and the untouched candidate', () => {
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
        bytes: 73_742,
        sha256: 'aff25e683d4af3c7858c1f2a9a390e506841ee7acbfea51a227fed58c2ffc17c',
      },
      protectedCandidate: {
        bytes: 12_905,
        sha256: '9839e285e13135a14a151b45145758d0100fbed6dfd6805dc62ba9da37862a58',
      },
      protectedEvidence: {
        bytes: 74_835,
        sha256: '846c5813971dfe3a8698387d3963e8ff5a846a5aa5ceecfcb5d4169f04de0e44',
      },
      protectedReview: {
        bytes: 27_412,
        sha256: '49328643b53efaffe25495003469f827b46fab3d3a3c36c33c7c48f97d3b139e',
      },
      publicCatalog: {
        bytes: 103_638,
        sha256: '4c699409e133e65e5677245239e52eb0697331b3fc4f382bc0a5e06c64e2b5fb',
      },
      publicEvidence: {
        bytes: 47_265,
        sha256: '738d0d1a9ddb7385c4f358f2eb7c8ec7f9e2d9d1e0a464edb38b881f98787cd2',
      },
      publicCandidate: {
        bytes: 9_510,
        sha256: 'a6cd7cbb768d846613cdef3cf3d5e383cb213c6fad5d3db6172d7a33d76d5dea',
      },
    });
  });
});

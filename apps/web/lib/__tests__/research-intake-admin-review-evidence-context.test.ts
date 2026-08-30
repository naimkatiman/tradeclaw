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
      withTradeClawRecord: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
    });
    expect(payload.catalogEvidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      51, 6, 1, 0, 3, 0,
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
        bytes: 77_280,
        sha256: '8e3d0d445586588e37fbdec4c2a0a9a10fc8ddb479b387b1c4a0e717e7748666',
      },
      protectedCandidate: {
        bytes: 13_396,
        sha256: 'fca4982da5314643df584b1c60bb63545604050e1ceaace43dc439a616aade74',
      },
      protectedEvidence: {
        bytes: 84_766,
        sha256: '39b3cd29f787ee52d357f978b39bb3f1d0dbd2be1ea9db95862805f47294230b',
      },
      protectedReview: {
        bytes: 30_434,
        sha256: 'bb71d36c772501a983f8b8037452e1c2193731aad4c14909df3de180f4296e12',
      },
      publicCatalog: {
        bytes: 113_858,
        sha256: 'd1472f9063673568c37df87293eecac0f049ebb03ead1678c5856fd63993cbc1',
      },
      publicEvidence: {
        bytes: 56_318,
        sha256: '21f0cbebf89d0c0e8edb016bafd834b71b5ba0d25bc90575c5e8151b0ddede54',
      },
      publicCandidate: {
        bytes: 9_832,
        sha256: '9fd74f0dc12286f42de3b78cd723c50d39b1f57ff5f852ef6cfb089d4d9e4965',
      },
    });
  });
});

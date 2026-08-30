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
      withTradeClawRecord: 13,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
    });
    expect(payload.catalogEvidenceStateSummary?.statuses.map((status) => status.count)).toEqual([
      48, 9, 1, 0, 3, 0,
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
        bytes: 78_211,
        sha256: 'e4ff64c2ce4519df53af0ccdaffa14b48c9758dc5500cd78c8f97dab5cf13a7f',
      },
      protectedCandidate: {
        bytes: 14_203,
        sha256: '69ba5b46dda7ff8f7c1baeb46f65ad067d19327a8c4f7acb82d75d08e8c0fffd',
      },
      protectedEvidence: {
        bytes: 105_804,
        sha256: 'b1ad4b8f672a470b815a41aa22c71c47e5d415b6f32e4f7055ffca9fadf49423',
      },
      protectedReview: {
        bytes: 31_986,
        sha256: 'b4a70171571700068b28dca6aca1f05ab0a492b4ea0881ef6f6e9a174d891116',
      },
      publicCatalog: {
        bytes: 129_133,
        sha256: '2cffd91df6034ef16f3eedcbd7edbeafbdc4c870a16d35fc632a8f4a78183f48',
      },
      publicEvidence: {
        bytes: 74_703,
        sha256: 'ffd4352689d4c69945ff8c2265a23dd21e03c1bbc59fdf4c25984a0dff72dd24',
      },
      publicCandidate: {
        bytes: 9_942,
        sha256: 'b1e7258c78b39c75c69f98b3e261975d2a85130bbcae2fecfce02a2db50e9374',
      },
    });
  });
});

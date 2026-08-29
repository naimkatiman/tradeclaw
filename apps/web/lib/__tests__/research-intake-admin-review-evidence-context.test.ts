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
    const queue = buildResearchIntakeAdminReviewPayload(OBSERVED_AT).queue as ReviewQueueView;
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
        bytes: 73_264,
        sha256: '2985e40077e7cbe64fc22afcea84ef4985c65c8968c2319b05d0e544b0a73ca0',
      },
      protectedCandidate: {
        bytes: 10_396,
        sha256: 'e423783f1ee6ff50d9c9309369de6db0269cc4a2b0388566a6f2b7e0bce021ba',
      },
      protectedEvidence: {
        bytes: 67_271,
        sha256: '132df89372e82d3dfc82e0f8a41e43d629c08c3c4287f4fb6ada356faac7cd0c',
      },
      protectedReview: {
        bytes: 24_904,
        sha256: '9667ea7ca3b01d85ef0df5b03e7813c09f4eb91779cc81ad4ded8502b5bd0979',
      },
      publicCatalog: {
        bytes: 99_744,
        sha256: '445166bc45322718cc46cc5acc15ed202fabec3faf0d4f7d4886190f112e84cb',
      },
      publicEvidence: {
        bytes: 42_295,
        sha256: '7362469bcc23c9b6a9ebb75905a2cd184472eb22c7d053558d1206b8d7466b79',
      },
      publicCandidate: {
        bytes: 8_952,
        sha256: 'ee3554123ea0f3beba4f6aad21c275657c9f43f3cae8b3fd793bff01f8256696',
      },
    });
  });
});

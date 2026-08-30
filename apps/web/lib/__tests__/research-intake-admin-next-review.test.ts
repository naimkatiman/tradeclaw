import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const BEFORE_FIRST = '2026-08-29T04:55:26.999Z';
const AT_FIRST = '2026-08-29T04:55:27.000Z';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const TC255 = 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const REPO_ROOT = resolve(__dirname, '../../../..');

interface NextReviewView {
  selection: string;
  queuePosition: number;
  taskId: string;
  candidate: {
    id: string;
    title: string;
    evidenceState: {
      performanceEvidenceStatus: string;
      label: string;
      performanceGatesEvaluated: boolean;
      taskId: string | null;
      decisionSummary: string;
      evidenceRecordedOn: string;
    };
  };
  handoff: {
    availableAt: string;
    basis: string;
    cycleId: string | null;
    headline: string;
    summary: string;
  };
  links: {
    adminCandidate: string;
    publicCandidate: string;
    reviewItem: string;
  };
  controls: {
    humanReviewRequired: true;
    publicationApproved: false;
    automaticPublication: false;
    automaticPosting: false;
    tradingApproved: false;
    automaticTrading: false;
    externalActions: 'none';
  };
}

function overviewNextReview(payload: unknown): NextReviewView | null | undefined {
  return (payload as {
    marketingReview?: { nextReview?: NextReviewView | null };
  }).marketingReview?.nextReview;
}

function queueNextReview(payload: unknown): NextReviewView | null | undefined {
  return (payload as {
    queue?: { nextReview?: NextReviewView | null };
  }).queue?.nextReview;
}

function fingerprint(body: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected next marketing review', () => {
  it('is null before the queue opens and becomes the exact first visible handoff', () => {
    expect(overviewNextReview(buildResearchIntakeAdminOverviewPayload(BEFORE_FIRST))).toBeNull();

    expect(overviewNextReview(buildResearchIntakeAdminOverviewPayload(AT_FIRST))).toEqual({
      selection: 'oldest-visible-human-review-handoff',
      queuePosition: 1,
      taskId: 'TC-255',
      candidate: {
        id: TC255,
        title: 'How to Design a Simple Multi-Timeframe Trend Strategy on Bitcoin',
        evidenceState: {
          performanceEvidenceStatus: 'modeled-historical-fail',
          label: 'Modeled historical fail',
          performanceGatesEvaluated: true,
          taskId: 'TC-255',
          decisionSummary:
            "The frozen BTC/ETH replication failed after modeled costs: BTC and ETH each lost more than 99% net, neither produced a positive fold, and the fixed portfolio lost 29.53% in holdout; BTC's 0.045% mean gross edge per trade was below 0.40% round-trip friction.",
          evidenceRecordedOn: '2026-08-29',
        },
      },
      handoff: {
        availableAt: AT_FIRST,
        basis: 'pre-loop-closure',
        cycleId: null,
        headline: 'A high-turnover Bitcoin trend idea failed after realistic costs',
        summary:
          'BTC gross +69.43% became net -99.21% under the frozen TradeClaw cost model.',
      },
      links: {
        adminCandidate: `/api/admin/research-intake/${TC255}`,
        publicCandidate: `/api/research/intake/${TC255}`,
        reviewItem: '/api/admin/research-intake/review/TC-255',
      },
      controls: {
        humanReviewRequired: true,
        publicationApproved: false,
        automaticPublication: false,
        automaticPosting: false,
        tradingApproved: false,
        automaticTrading: false,
        externalActions: 'none',
      },
    });
  });

  it('keeps one oldest-visible action identical across protected orientation and review views', () => {
    const catalog = buildResearchIntakeAdminPayload(new URLSearchParams(), AUDIT_AT);
    const overview = buildResearchIntakeAdminOverviewPayload(AUDIT_AT);
    const index = buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT);
    const review = buildResearchIntakeAdminReviewPayload(AUDIT_AT);
    const expected = overviewNextReview(overview);

    expect(expected?.taskId).toBe('TC-255');
    expect(overviewNextReview(catalog)).toEqual(expected);
    expect(overviewNextReview(index)).toEqual(expected);
    expect(queueNextReview(review)).toEqual(expected);
    expect(review.queue.latestItem?.handoff.taskId).toBe('TC-259');
    expect(review.queue.items.map((item) => item.handoff.taskId)).toEqual([
      'TC-255',
      'TC-257',
      'TC-258',
      'TC-259',
    ]);
  });

  it('names one manual action without transferring a draft body or receipt body', () => {
    const overview = buildResearchIntakeAdminOverviewPayload(AUDIT_AT);
    const nextReview = overviewNextReview(overview);

    expect(overview.startHere).toMatchObject({
      audience: 'admin',
      kind: 'review-marketing-drafts',
      label: 'Review next draft: A high-turnover Bitcoin trend idea failed after realistic costs',
      itemCount: 4,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(overview.startHere.reason).toMatch(/oldest visible.*4.*manual/i);
    expect(JSON.stringify(nextReview)).not.toMatch(
      /"(?:body|receipt|artifactPath|evidencePath|reviewedAt|reviewedBy|reviewDecision)"/,
    );
  });

  it('keeps public and CSV contracts untouched and documents the protected handoff', () => {
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'nextReview',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'nextReview',
    );
    expect({
      publicCatalog: fingerprint(buildResearchIntakeCsv()),
      publicEvidence: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidence: fingerprint(buildResearchIntakeAdminEvidenceCsv(
        '2026-08-29T18:00:40.000Z',
      )),
      protectedReview: fingerprint(buildResearchMarketingReviewCsv(
        '2026-08-29T14:59:59.999Z',
      )),
    }).toEqual({
      publicCatalog: {
        bytes: 37_128,
        sha256: 'afd082b0dc564675bb0c781898fd2d15c624c3ea5dc0e8cdcb69b02bf453edef',
      },
      publicEvidence: {
        bytes: 7_415,
        sha256: '704187190f0eb96753066495bac241c76e1770b9cc0562798f08b0322d93102f',
      },
      protectedEvidence: {
        bytes: 17_543,
        sha256: '43518ae9b99cd4fd7ffea64f744d49c4e628a32b1f8beb8c3c004e86b877d4c6',
      },
      protectedReview: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });

    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));
    expect(api).toMatch(/oldest visible human-review.*nextReview/i);
    expect(api).toMatch(/visible-only.*grants no approval/i);
    expect(api).toMatch(/no draft body/i);
  });
});

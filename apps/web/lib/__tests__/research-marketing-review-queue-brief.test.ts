import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminCycleBrief } from '../research-intake-admin-cycle-brief';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-marketing-review-queue-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/admin/research-intake/review/index.md/route.ts',
);
const README_PATH = resolve(ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const BEFORE_FIRST = '2026-08-29T04:55:26.999Z';
const AT_FIRST = '2026-08-29T04:55:27.000Z';
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';
const AT_LAST = '2026-08-29T12:47:51.000Z';
const AUDIT_AT = '2026-08-30T16:39:52.708Z';
const TC268 =
  'how-to-improve-commodity-momentum-using-intra-market-correlation';

interface QueueBriefModule {
  buildResearchMarketingReviewQueueBrief: (
    at: Date | string | number,
  ) => string;
}

function loadQueueBriefModule(): QueueBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-marketing-review-queue-brief',
  ) as QueueBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected human-readable marketing-review queue', () => {
  it('renders every visible handoff oldest-first from one deterministic observation', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const queueBrief = loadQueueBriefModule();
    expect(queueBrief).not.toBeNull();
    if (!queueBrief) return;

    const first = queueBrief.buildResearchMarketingReviewQueueBrief(AUDIT_AT);
    const replay = queueBrief.buildResearchMarketingReviewQueueBrief(AUDIT_AT);

    expect(replay).toBe(first);
    expect(fingerprint(first)).toEqual({
      bytes: 8_442,
      sha256: 'afd4038439b32a5b4aac3d5a784b3cfb8134d389fba274ae67644b2a0572ffd9',
    });
    expect(first).toMatch(/^# TradeClaw protected marketing-review queue\n\n/);
    expect(first).toContain(`- Observed at: \`${AUDIT_AT}\``);
    expect(first).toContain(
      '- Current UTC window: `2026-08-30T15:00:00.000Z/PT3H`',
    );
    expect(first).toContain('- Access: Admin read-only');
    expect(first).toContain('- Status: `review-ready`');
    expect(first).toContain('- Visible drafts: 4');
    expect(first).toContain('- Receipt-backed drafts: 3');
    expect(first).toContain('- Pre-loop drafts: 1');
    expect(first).toContain('- Publication-approved drafts: 0');
    expect(first).toContain('- Current-window drafts: 0');
    expect(first).toContain('- Receipt gate: `wait-for-next-window`');
    expect(first).toContain(
      '- Next review packet: [Open `TC-255`](/api/admin/research-intake/review/TC-255/packet.md)',
    );

    const taskMarkers = ['TC-255', 'TC-257', 'TC-258', 'TC-259'].map(
      (taskId) => first.indexOf(`. ${taskId} —`),
    );
    expect(taskMarkers.every((position) => position > -1)).toBe(true);
    expect(taskMarkers).toEqual([...taskMarkers].sort((left, right) => left - right));
    expect(first).toContain(
      '## 1. TC-255 — A high-turnover Bitcoin trend idea failed after realistic costs',
    );
    expect(first).toContain(
      '- Evidence: Modeled historical fail (`modeled-historical-fail`)',
    );
    expect(first).toMatch(/- Decision: .*failed after modeled costs/i);
    expect(first).toContain(
      '- Draft summary: BTC gross +69.43% became net -99.21% under the frozen TradeClaw cost model.',
    );
    expect(first).toContain(
      '- Review packet: [Open exact packet](/api/admin/research-intake/review/TC-255/packet.md)',
    );
    expect(first).toContain(
      '- Blank review handoff: [Download YAML](/api/admin/research-intake/review/TC-255/handoff.yaml)',
    );
    expect(first).not.toContain('We independently replicated');
    expect(first).toContain('## How to use this queue');
    expect(first).toContain('- Records review completion: No');
    expect(first).toContain('- Publishes, posts, or trades: No');
  });

  it('renders an empty queue and reveals each handoff only at its canonical instant', () => {
    const queueBrief = loadQueueBriefModule();
    expect(queueBrief).not.toBeNull();
    if (!queueBrief) return;

    const empty = queueBrief.buildResearchMarketingReviewQueueBrief(BEFORE_FIRST);
    expect(empty).toContain('- Status: `empty`');
    expect(empty).toContain('- Visible drafts: 0');
    expect(empty).toContain('- Next review: None');
    expect(empty).toContain('No review handoffs are visible at this observation.');
    expect(empty).not.toContain('TC-255');

    const atFirst = queueBrief.buildResearchMarketingReviewQueueBrief(AT_FIRST);
    expect(atFirst).toContain('- Visible drafts: 1');
    expect(atFirst).toContain('## 1. TC-255 —');
    expect(atFirst).not.toContain('TC-257');

    const beforeLast = queueBrief.buildResearchMarketingReviewQueueBrief(BEFORE_LAST);
    const atLast = queueBrief.buildResearchMarketingReviewQueueBrief(AT_LAST);
    expect(beforeLast).toContain('- Visible drafts: 3');
    expect(beforeLast).not.toContain('TC-259');
    expect(atLast).toContain('- Visible drafts: 4');
    expect(atLast).toContain('## 4. TC-259 —');
  });

  it('advertises the human queue and makes exact packets visibly browseable', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(TC268, AUDIT_AT);
    const exactReview = buildResearchIntakeAdminReviewItemPayload('TC-257', AUDIT_AT);
    if (!candidate || !exactReview) throw new Error('admin fixtures are missing');

    const protectedProjections = [
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), AUDIT_AT),
      buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT),
      buildResearchIntakeAdminEvidencePayload(AUDIT_AT),
      candidate,
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      exactReview,
    ];

    for (const projection of protectedProjections) {
      expect(projection.resources).toMatchObject({
        marketingReviewBrief: '/api/admin/research-intake/review/index.md',
      });
    }

    const cycleBrief = buildResearchIntakeAdminCycleBrief(AUDIT_AT);
    expect(cycleBrief).toContain(
      '- Human-readable review queue: [Open all review-ready drafts](/api/admin/research-intake/review/index.md)',
    );
    expect(cycleBrief).toContain(
      '- Machine-readable review queue: `/api/admin/research-intake/review`',
    );

    const packet = buildResearchMarketingReviewPacket('TC-257', AUDIT_AT);
    expect(packet).not.toBeNull();
    expect(packet).toContain(
      '- Human-readable review queue: [Open review queue](/api/admin/research-intake/review/index.md)',
    );
    expect(packet).toContain(
      '- Machine-readable review queue: `/api/admin/research-intake/review`',
    );
    expect(packet).toContain(
      '- Previous packet: [TC-255 — A high-turnover Bitcoin trend idea failed after realistic costs](/api/admin/research-intake/review/TC-255/packet.md)',
    );
    expect(packet).toContain(
      '- Next packet: [TC-258 — Bitcoin MAX10/MIN10 failed its post-paper holdout](/api/admin/research-intake/review/TC-258/packet.md)',
    );
  });

  it('defines an auth-first private GET-only Markdown route', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    const authIndex = route.indexOf('assertAdminApi(request)');
    expect(authIndex).toBeGreaterThan(-1);
    expect(route.indexOf('new Date()')).toBeGreaterThan(authIndex);
    expect(route).toContain("export const runtime = 'nodejs'");
    expect(route).toContain("export const dynamic = 'force-dynamic'");
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain(
      'inline; filename="tradeclaw-research-marketing-review-queue.md"',
    );
    expect(route).toContain('X-Content-Type-Options');
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the human review journey without changing public or CSV bytes', () => {
    for (const path of [README_PATH, LOOP_PLAN_PATH]) {
      const document = readFileSync(path, 'utf8');
      expect(document).toContain('/api/admin/research-intake/review/index.md');
      expect(document).toMatch(/protected human-readable marketing-review queue/i);
      expect(document).toMatch(
        /cycle brief[\s\S]+review queue[\s\S]+exact review packet/i,
      );
      expect(document).toMatch(/does not create(?: or authorize)? a receipt/i);
      expect(document).toMatch(/complete a review[\s\S]+publish, post, or trade/i);
    }

    expect({
      publicCatalog: fingerprint(buildResearchIntakePublicPayload()),
      publicEvidence: fingerprint(buildResearchIntakePublicEvidencePayload()),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(
        buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      ),
      protectedReviewCsv: fingerprint(
        buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      ),
    }).toEqual({
      publicCatalog: {
        bytes: 140_878,
        sha256: '4c48acd73a18d967bbf039e7109188c136b0f76d011b4e6da5754cb37326d3ec',
      },
      publicEvidence: {
        bytes: 82_070,
        sha256: '43d0257b89f0011979269732dd45e8fd8672c9f6aa35bb691255cd396f2076cf',
      },
      publicCatalogCsv: {
        bytes: 37_522,
        sha256: 'e6f1023e3adfa4672bfe285b9f206d91bb2704488270818a9ef3fee9b5d615cf',
      },
      publicEvidenceCsv: {
        bytes: 9_820,
        sha256: '091b91a4a5ccaf5278456964b29e3c77e889fa14278cc07f4ae6100f477ab31c',
      },
      protectedEvidenceCsv: {
        bytes: 20_948,
        sha256: 'a7cc6415ba8f02802d6922d2e5088a0c7fed2abb9e8cc1b523fb1f170e085661',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

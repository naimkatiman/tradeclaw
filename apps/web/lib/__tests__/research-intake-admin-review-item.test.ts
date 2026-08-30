import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as adminIntake from '../research-intake-admin';
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
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const TC255 = 'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin';
const REPO_ROOT = resolve(__dirname, '../../../..');
const EXACT_REVIEW_ROUTE = resolve(
  REPO_ROOT,
  'apps/web/app/api/admin/research-intake/review/[taskId]/route.ts',
);

interface ReviewNavigationLink {
  taskId: string;
  queuePosition: number;
  headline: string;
  href: string;
}

interface ExactReviewPayload {
  schemaVersion: 1;
  access: {
    mode: 'admin-read-only';
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
  startHere: {
    href: string;
    targetResource: string;
    targetIsCurrentResource: boolean;
  };
  researchLoop: {
    observedAt: string;
  };
  navigation: {
    order: string;
    currentPosition: number;
    totalVisibleItems: number;
    queueHref: string;
    selfHref: string;
    previous: ReviewNavigationLink | null;
    next: ReviewNavigationLink | null;
  };
  reviewItem: {
    queuePosition: number;
    candidate: { id: string };
    handoff: { taskId: string; draft: { body: string } };
    links: {
      adminCandidate: string;
      publicCandidate: string;
      reviewItem: string;
      reviewPacket: string;
    };
    controls: {
      publicationApproved: false;
      automaticPublication: false;
      automaticPosting: false;
      tradingApproved: false;
      automaticTrading: false;
      externalActions: 'none';
    };
  };
}

type ExactReviewBuilder = (
  taskId: string,
  at?: Date | string | number,
) => ExactReviewPayload | null;

function exactReviewBuilder(): ExactReviewBuilder | undefined {
  return (adminIntake as unknown as {
    buildResearchIntakeAdminReviewItemPayload?: ExactReviewBuilder;
  }).buildResearchIntakeAdminReviewItemPayload;
}

function fingerprint(body: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected exact marketing review item', () => {
  it('adds one direct packet-first action and exact links for every visible queue item', () => {
    const overview = adminIntake.buildResearchIntakeAdminOverviewPayload(AUDIT_AT);
    const review = adminIntake.buildResearchIntakeAdminReviewPayload(AUDIT_AT);

    expect(overview.marketingReview.nextReview?.links).toEqual({
      adminCandidate: `/api/admin/research-intake/${TC255}`,
      publicCandidate: `/api/research/intake/${TC255}`,
      reviewItem: '/api/admin/research-intake/review/TC-255',
      reviewPacket: '/api/admin/research-intake/review/TC-255/packet.md',
    });
    expect(review.queue.items.map((item) => item.links.reviewItem)).toEqual([
      '/api/admin/research-intake/review/TC-255',
      '/api/admin/research-intake/review/TC-257',
      '/api/admin/research-intake/review/TC-258',
      '/api/admin/research-intake/review/TC-259',
    ]);
    expect(review.queue.items.map((item) => item.links.reviewPacket)).toEqual([
      '/api/admin/research-intake/review/TC-255/packet.md',
      '/api/admin/research-intake/review/TC-257/packet.md',
      '/api/admin/research-intake/review/TC-258/packet.md',
      '/api/admin/research-intake/review/TC-259/packet.md',
    ]);
    expect(overview.startHere).toMatchObject({
      href: '/api/admin/research-intake/review/TC-255/packet.md',
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(review.startHere).toMatchObject({
      href: '/api/admin/research-intake/review/TC-255/packet.md',
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
    });
  });

  it('returns only an exact visible item with visibility-safe queue navigation', () => {
    const builder = exactReviewBuilder();
    expect(typeof builder).toBe('function');
    if (!builder) return;

    expect(builder('TC-255', BEFORE_FIRST)).toBeNull();
    expect(builder('missing', AUDIT_AT)).toBeNull();
    expect(builder('tc-255', AUDIT_AT)).toBeNull();
    expect(builder(' TC-255', AUDIT_AT)).toBeNull();
    expect(builder('TC-259', BEFORE_LAST)).toBeNull();

    const firstAtOpen = builder('TC-255', AT_FIRST);
    expect(firstAtOpen).toMatchObject({
      schemaVersion: 1,
      access: {
        mode: 'admin-read-only',
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
      startHere: {
        href: '/api/admin/research-intake',
        targetResource: 'catalog',
        targetIsCurrentResource: false,
      },
      researchLoop: { observedAt: AT_FIRST },
      navigation: {
        order: 'oldest-visible-human-review-handoff',
        currentPosition: 1,
        totalVisibleItems: 1,
        queueHref: '/api/admin/research-intake/review',
        selfHref: '/api/admin/research-intake/review/TC-255',
        previous: null,
        next: null,
      },
      reviewItem: {
        queuePosition: 1,
        candidate: { id: TC255 },
        handoff: { taskId: 'TC-255' },
        links: {
          reviewItem: '/api/admin/research-intake/review/TC-255',
          reviewPacket: '/api/admin/research-intake/review/TC-255/packet.md',
        },
        controls: {
          publicationApproved: false,
          automaticPublication: false,
          automaticPosting: false,
          tradingApproved: false,
          automaticTrading: false,
          externalActions: 'none',
        },
      },
    });
    expect(firstAtOpen).not.toHaveProperty('queue');
    expect(firstAtOpen).not.toHaveProperty('items');
    expect(firstAtOpen).not.toHaveProperty('latestItem');

    const firstAtAudit = builder('TC-255', AUDIT_AT);
    expect(firstAtAudit?.startHere).toMatchObject({
      href: '/api/admin/research-intake/review/TC-255/packet.md',
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
    });
    expect(firstAtAudit?.navigation).toEqual({
      order: 'oldest-visible-human-review-handoff',
      currentPosition: 1,
      totalVisibleItems: 4,
      queueHref: '/api/admin/research-intake/review',
      selfHref: '/api/admin/research-intake/review/TC-255',
      previous: null,
      next: {
        taskId: 'TC-257',
        queuePosition: 2,
        headline: 'A Treasury replication stopped at its frozen data gate',
        href: '/api/admin/research-intake/review/TC-257',
      },
    });
    const lastAtAudit = builder('TC-259', AUDIT_AT);
    expect(lastAtAudit?.startHere).toMatchObject({
      href: '/api/admin/research-intake/review/TC-255/packet.md',
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
    });
    expect(lastAtAudit?.navigation).toMatchObject({
      currentPosition: 4,
      totalVisibleItems: 4,
      previous: {
        taskId: 'TC-258',
        queuePosition: 3,
        href: '/api/admin/research-intake/review/TC-258',
      },
      next: null,
    });
  });

  it('defines an auth-first private GET-only exact route without public discovery', () => {
    expect(existsSync(EXACT_REVIEW_ROUTE)).toBe(true);
    if (!existsSync(EXACT_REVIEW_ROUTE)) return;

    const route = readFileSync(EXACT_REVIEW_ROUTE, 'utf8');
    const authCall = route.indexOf('const denied = await assertAdminApi');
    const paramsRead = route.indexOf('await params');
    const clockRead = route.indexOf('new Date()');
    const builderCall = route.lastIndexOf('buildResearchIntakeAdminReviewItemPayload');

    expect(authCall).toBeGreaterThan(-1);
    expect(paramsRead).toBeGreaterThan(authCall);
    expect(clockRead).toBeGreaterThan(paramsRead);
    expect(builderCall).toBeGreaterThan(clockRead);
    expect(route).toContain("export const runtime = 'nodejs'");
    expect(route).toContain("export const dynamic = 'force-dynamic'");
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain("Vary', 'Cookie, Authorization");
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export async function (?:POST|PUT|PATCH|DELETE)/);
  });

  it('keeps public and CSV receipts fixed and documents the exact protected handoff', () => {
    expect(JSON.stringify(adminIntake.RESEARCH_INTAKE_ADMIN_RESOURCES)).not.toContain(
      '[taskId]',
    );
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'reviewItem',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'reviewItem',
    );
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'reviewPacket',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'reviewPacket',
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
    expect(api).toMatch(/nextReview.*exact protected review item/i);
    expect(api).toMatch(/visible-only.*no approval/i);
  });
});

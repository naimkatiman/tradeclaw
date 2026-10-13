import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RESEARCH_INTAKE_ADMIN_RESOURCES,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
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

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-intake-admin-screening-queue-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/admin/research-intake/screening/index.md/route.ts',
);
const README_PATH = resolve(ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const AUDIT_AT = '2026-08-30T16:15:39.731Z';

interface ScreeningQueueBriefModule {
  buildResearchIntakeAdminScreeningQueueBrief: (
    at: Date | string | number,
  ) => string;
}

function loadScreeningQueueBriefModule(): ScreeningQueueBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-admin-screening-queue-brief',
  ) as ScreeningQueueBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected human-readable manual screening queue', () => {
  it('renders every untouched candidate in pinned source order without selecting one', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const screeningQueue = loadScreeningQueueBriefModule();
    expect(screeningQueue).not.toBeNull();
    if (!screeningQueue) return;

    const first = screeningQueue.buildResearchIntakeAdminScreeningQueueBrief(AUDIT_AT);
    const replay = screeningQueue.buildResearchIntakeAdminScreeningQueueBrief(AUDIT_AT);

    expect(replay).toBe(first);
    expect(fingerprint(first)).toEqual({
      bytes: 47_778,
      sha256: '57465f9a623c42d585ad7218a8cb6af4b6645ab05c1a1933607ae1d161bd7e28',
    });
    expect(first.startsWith('# TradeClaw protected manual screening queue\n')).toBe(
      true,
    );
    expect(first).toContain(`- Observed at: \`${AUDIT_AT}\``);
    expect(first).toContain('- Receipt gate: `wait-for-next-window`');
    expect(first).toContain(
      '- Next receipt slot: `2026-08-30T18:00:00.000Z` (`2026-08-30T18:00:00.000Z/PT3H`)',
    );
    expect(first).toContain(
      '**47 untouched candidates are shown in pinned upstream source order. This is not a priority ranking and no candidate is preselected.**',
    );
    expect(first).toContain('- Equities: 11');
    expect(first).toContain('- Bonds: 10');
    expect(first).toContain('- Commodities: 1');
    expect(first).toContain('- Currencies: 3');
    expect(first).toContain('- Cryptocurrencies: 3');
    expect(first).toContain('- Derivatives: 9');
    expect(first).toContain('- Multi-asset: 10');
    expect(first).toContain('## Manual cost-first screen');
    expect(first).toContain('rule reconstructibility');
    expect(first).toContain('authorized immutable data');
    expect(first).toContain('full-friction headroom');
    expect(first).toContain('chronological falsification');
    expect(first).toContain('bounded implementation');
    expect(first).toContain(
      '## 1. A Study Of Differences In Returns Between Large And Small Companies In Europe',
    );
    expect(first).toContain('- Pinned source position: 1 of 61');
    expect(first).toContain(
      '- Protected human record: [Inspect candidate](/api/admin/research-intake/a-study-of-differences-in-returns-between-large-and-small-companies-in-europe/brief.md)',
    );
    expect(first).toContain(
      '## 47. Are Heuristics Better than Theory if Market Crashes Are',
    );
    expect(first).toContain('- Pinned source position: 59 of 61');
    expect(first).not.toContain('## 48.');
    expect(first).toContain('- Automatically selects a candidate: No');
    expect(first).toContain('- Creates or authorizes a receipt: No');
    expect(first).toContain('- Calculates or opens returns: No');
    expect(first).toContain('- Publishes, posts, or trades: No');
  });

  it('states closed, open, and conflicted receipt gates without creating authority', () => {
    const screeningQueue = loadScreeningQueueBriefModule();
    expect(screeningQueue).not.toBeNull();
    if (!screeningQueue) return;

    const open = screeningQueue.buildResearchIntakeAdminScreeningQueueBrief(
      '2026-08-30T18:00:00.000Z',
    );
    expect(open).toContain('- Receipt gate: `open-for-one-receipt`');
    expect(open).toContain(
      '- Next receipt slot: Open now in `2026-08-30T18:00:00.000Z/PT3H`',
    );
    expect(open).toContain(
      'One manual receipt slot is open. Screen candidates with the checklist below and advance at most one.',
    );

    const conflict = screeningQueue.buildResearchIntakeAdminScreeningQueueBrief(
      '2026-08-29T08:29:58.000Z',
    );
    expect(conflict).toContain('- Receipt gate: `blocked-by-conflict`');
    expect(conflict).toContain(
      '- Next receipt slot: None until the current-window conflict is reconciled',
    );
    expect(conflict).toContain(
      'Do not advance a candidate while the current receipt window is conflicted.',
    );
  });

  it('makes the human queue the open-window start action and advertises it everywhere protected', () => {
    expect(RESEARCH_INTAKE_ADMIN_RESOURCES).toMatchObject({
      screeningQueueBrief:
        '/api/admin/research-intake/screening/index.md',
    });

    const openOverview = buildResearchIntakeAdminOverviewPayload(
      '2026-08-30T18:00:00.000Z',
    );
    expect(openOverview.startHere).toMatchObject({
      kind: 'screen-current-window',
      href: '/api/admin/research-intake/screening/index.md',
      targetResource: 'screening-queue',
      targetIsCurrentResource: false,
      itemCount: 1,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });

    const protectedCatalog = buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      AUDIT_AT,
    );
    expect(protectedCatalog.resources.screeningQueueBrief).toBe(
      '/api/admin/research-intake/screening/index.md',
    );

    const cycleBrief = buildResearchIntakeAdminCycleBrief(AUDIT_AT);
    expect(cycleBrief).toContain(
      '- Human-readable manual screening queue: [Open untouched candidates](/api/admin/research-intake/screening/index.md)',
    );
  });

  it('defines an auth-first private GET-only Markdown route', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    const authIndex = route.indexOf('assertAdminApi(request)');
    expect(authIndex).toBeGreaterThan(-1);
    expect(route.indexOf('new Date()')).toBeGreaterThan(authIndex);
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain(
      'inline; filename="tradeclaw-research-admin-screening-queue.md"',
    );
    expect(route).toContain('X-Content-Type-Options');
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the manual queue while preserving public and CSV bytes', () => {
    for (const path of [README_PATH, LOOP_PLAN_PATH]) {
      const document = readFileSync(path, 'utf8');
      expect(document).toContain(
        '/api/admin/research-intake/screening/index.md',
      );
      expect(document).toMatch(/human-readable manual screening queue/i);
      expect(document).toMatch(/does not (?:create|authorize).*receipt/i);
      expect(document).toMatch(/does not .*select.*candidate/i);
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
        sha256:
          '4c48acd73a18d967bbf039e7109188c136b0f76d011b4e6da5754cb37326d3ec',
      },
      publicEvidence: {
        bytes: 82_070,
        sha256:
          '43d0257b89f0011979269732dd45e8fd8672c9f6aa35bb691255cd396f2076cf',
      },
      publicCatalogCsv: {
        bytes: 37_522,
        sha256:
          'e6f1023e3adfa4672bfe285b9f206d91bb2704488270818a9ef3fee9b5d615cf',
      },
      publicEvidenceCsv: {
        bytes: 9_820,
        sha256:
          '091b91a4a5ccaf5278456964b29e3c77e889fa14278cc07f4ae6100f477ab31c',
      },
      protectedEvidenceCsv: {
        bytes: 20_948,
        sha256:
          'a7cc6415ba8f02802d6922d2e5088a0c7fed2abb9e8cc1b523fb1f170e085661',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256:
          'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });
});

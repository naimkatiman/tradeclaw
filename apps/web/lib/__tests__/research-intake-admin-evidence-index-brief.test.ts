import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminCandidateBrief } from '../research-intake-admin-candidate-brief';
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
  '../research-intake-admin-evidence-index-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/admin/research-intake/evidence/index.md/route.ts',
);
const README_PATH = resolve(ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const AUDIT_AT = '2026-08-30T16:15:39.731Z';
const TC259 = 'TC-259';
const TC268 =
  'how-to-improve-commodity-momentum-using-intra-market-correlation';

interface EvidenceIndexBriefModule {
  buildResearchIntakeAdminEvidenceIndexBrief: (
    at: Date | string | number,
  ) => string;
}

function loadEvidenceIndexBriefModule(): EvidenceIndexBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-admin-evidence-index-brief',
  ) as EvidenceIndexBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected human-readable examined-candidate index', () => {
  it('renders every examined record deterministically from one protected observation', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const indexBrief = loadEvidenceIndexBriefModule();
    expect(indexBrief).not.toBeNull();
    if (!indexBrief) return;

    const first = indexBrief.buildResearchIntakeAdminEvidenceIndexBrief(AUDIT_AT);
    const replay = indexBrief.buildResearchIntakeAdminEvidenceIndexBrief(AUDIT_AT);

    expect(replay).toBe(first);
    expect(fingerprint(first)).toEqual({
      bytes: 20_892,
      sha256: 'ac5bd2674cb2a59fbb0d4c5cbebfb8447563da38b4af6cb8c37e4a84af15cebc',
    });
    expect(first.startsWith('# TradeClaw protected examined-candidate index\n')).toBe(
      true,
    );
    expect(first).toContain(`- Observed at: \`${AUDIT_AT}\``);
    expect(first).toContain(
      '- Current UTC window: `2026-08-30T15:00:00.000Z/PT3H`',
    );
    expect(first).toContain('- Access: Admin read-only');
    expect(first).toContain(
      '**14 of 61 pinned candidates have a TradeClaw source audit or replication record. This list is in pinned upstream source order and is not performance-ranked.**',
    );
    expect(first).toContain('- Receipt gate: `wait-for-next-window`');
    expect(first).toContain('- Ledger receipts: 13 across 12 windows');
    expect(first).toContain('- Drafts awaiting human review: 4');
    expect(first).toContain('- Publication-approved drafts: 0');
    expect(first).toContain('## 1. Properties of the Most Diversified Portfolio');
    expect(first).toContain('- Pinned source position: 7 of 61');
    expect(first).toContain('- Evidence: Source audit only (`source-audit-only-no-local-backtest`)');
    expect(first).toContain('- Visible receipts: 1');
    expect(first).toContain('## 2. Trading the Term Premium');
    expect(first).toContain(
      `- Review packet: [Open review packet](/api/admin/research-intake/review/${TC259}/packet.md)`,
    );
    expect(first).toContain(
      `- Protected human record: [Read this record](/api/admin/research-intake/${TC268}/brief.md)`,
    );
    expect(first).toContain('## How to interpret this index');
    expect(first).toContain('- Performance-ranked: No');
    expect(first).toContain('- Creates evidence or changes research state: No');
    expect(first).toContain('- Publishes, broadcasts, or trades: No');
  });

  it('reveals receipt and review availability only at their canonical time', () => {
    const indexBrief = loadEvidenceIndexBriefModule();
    expect(indexBrief).not.toBeNull();
    if (!indexBrief) return;

    const before = indexBrief.buildResearchIntakeAdminEvidenceIndexBrief(
      '2026-08-29T12:47:50.999Z',
    );
    const at = indexBrief.buildResearchIntakeAdminEvidenceIndexBrief(
      '2026-08-29T12:47:51.000Z',
    );
    const marker = '## 2. Trading the Term Premium';
    const nextMarker = '## 3.';
    const beforeItem = before.slice(
      before.indexOf(marker),
      before.indexOf(nextMarker, before.indexOf(marker)),
    );
    const atItem = at.slice(
      at.indexOf(marker),
      at.indexOf(nextMarker, at.indexOf(marker)),
    );

    expect(beforeItem).toContain('- Visible receipts: 0');
    expect(beforeItem).toContain('- Marketing review: None');
    expect(beforeItem).toContain('- Review packet: None');
    expect(beforeItem).not.toContain(`/review/${TC259}/packet.md`);
    expect(atItem).toContain('- Visible receipts: 1');
    expect(atItem).toContain('- Marketing review: Human review required');
    expect(atItem).toContain(
      `- Review packet: [Open review packet](/api/admin/research-intake/review/${TC259}/packet.md)`,
    );
  });

  it('advertises the human index on every protected projection and human brief', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(TC268, AUDIT_AT);
    if (!candidate) throw new Error('TC-268 admin candidate fixture is missing');

    const protectedProjections = [
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), AUDIT_AT),
      buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT),
      buildResearchIntakeAdminEvidencePayload(AUDIT_AT),
      candidate,
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
    ];

    for (const projection of protectedProjections) {
      expect(projection.resources).toMatchObject({
        evidenceIndexBrief: '/api/admin/research-intake/evidence/index.md',
      });
    }

    const cycleBrief = buildResearchIntakeAdminCycleBrief(AUDIT_AT);
    expect(cycleBrief).toContain(
      '- Human-readable evidence index: [Open examined-candidate index](/api/admin/research-intake/evidence/index.md)',
    );
    expect(cycleBrief).toContain(
      '- Machine-readable evidence index: `/api/admin/research-intake/evidence/index`',
    );

    const candidateBrief = buildResearchIntakeAdminCandidateBrief(TC268, AUDIT_AT);
    expect(candidateBrief).toContain(
      '- Protected human evidence index: [Open examined-candidate index](/api/admin/research-intake/evidence/index.md)',
    );
    expect(candidateBrief).toContain(
      '- Protected machine evidence index: `/api/admin/research-intake/evidence/index`',
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
      'inline; filename="tradeclaw-research-admin-evidence-index.md"',
    );
    expect(route).toContain('X-Content-Type-Options');
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the complete protected human journey without changing public or CSV bytes', () => {
    for (const path of [README_PATH, LOOP_PLAN_PATH]) {
      const document = readFileSync(path, 'utf8');
      expect(document).toContain('/api/admin/research-intake/evidence/index.md');
      expect(document).toMatch(/protected human-readable examined-candidate index/i);
      expect(document).toMatch(/cycle brief[\s\S]+index[\s\S]+exact candidate/i);
      expect(document).toMatch(/does not create(?: or authorize)? a receipt/i);
      expect(document).toMatch(/publish, post, or trade/i);
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

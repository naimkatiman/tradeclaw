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
  '../research-intake-admin-cycle-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/admin/research-intake/brief.md/route.ts',
);
const AUDIT_AT = '2026-08-30T13:00:26.528Z';
const TC267 = 'when-factor-timing-makes-sense';

interface CycleBriefModule {
  buildResearchIntakeAdminCycleBrief: (
    at: Date | string | number,
  ) => string;
}

function loadCycleBriefModule(): CycleBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-admin-cycle-brief',
  ) as CycleBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected human-readable research cycle brief', () => {
  it('renders one deterministic do-now brief from the shared protected observation', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const cycleBrief = loadCycleBriefModule();
    expect(cycleBrief).not.toBeNull();
    if (!cycleBrief) return;

    const first = cycleBrief.buildResearchIntakeAdminCycleBrief(AUDIT_AT);
    const replay = cycleBrief.buildResearchIntakeAdminCycleBrief(AUDIT_AT);

    expect(replay).toBe(first);
    expect(fingerprint(first)).toEqual({
      bytes: 2_549,
      sha256: 'a4c7e7f6ab7dc195a20b9af87682137cf836efd81b102c09ae58adbe20329906',
    });
    expect(first.startsWith('# TradeClaw research cycle brief\n')).toBe(true);
    expect(first).toContain(`- Observed at: \`${AUDIT_AT}\``);
    expect(first).toContain('## Do now');
    expect(first).toContain(
      'Review next draft packet: A high-turnover Bitcoin trend idea failed after realistic costs',
    );
    expect(first).toContain(
      '- Open: `/api/admin/research-intake/review/TC-255/packet.md`',
    );
    expect(first).toContain('## Research cadence');
    expect(first).toContain('- Receipt gate: `wait-for-next-window`');
    expect(first).toContain('- Current receipts: 1 of 1');
    expect(first).toContain(
      '- Next manual receipt slot: `2026-08-30T15:00:00.000Z` (`2026-08-30T15:00:00.000Z/PT3H`)',
    );
    expect(first).toContain(
      `- Latest receipt: \`TC-267\` — \`${TC267}\` (source-audited, not-tested)`,
    );
    expect(first).toContain('- Ledger integrity: `historical-conflict`');
    expect(first).toContain('- Expected legacy duplicate windows: 1');
    expect(first).toContain('- Additional duplicate windows: 0');
    expect(first).toContain('## Marketing review');
    expect(first).toContain('- Drafts awaiting human review: 4');
    expect(first).toContain('- Publication-approved drafts: 0');
    expect(first).toContain('## Evidence record');
    expect(first).toContain('- Pinned candidates: 61');
    expect(first).toContain('- Evidence records: 14');
    expect(first).toContain('- Performance gates evaluated: 3');
    expect(first).toContain('## Safety');
    expect(first).toContain('- Creates or authorizes a receipt: No');
    expect(first).toContain('- Publishes or posts: No');
    expect(first).toContain('- Grants trading authority: No');
  });

  it('states open and conflicted receipt windows without promising unsafe work', () => {
    const cycleBrief = loadCycleBriefModule();
    expect(cycleBrief).not.toBeNull();
    if (!cycleBrief) return;

    const open = cycleBrief.buildResearchIntakeAdminCycleBrief(
      '2026-08-29T15:00:00.000Z',
    );
    expect(open).toContain('Screen one candidate for the current UTC window');
    expect(open).toContain('- Receipt gate: `open-for-one-receipt`');
    expect(open).toContain(
      '- Next manual receipt slot: Open now in `2026-08-29T15:00:00.000Z/PT3H`',
    );
    expect(open).toContain('- Current receipts: 0 of 1');

    const conflict = cycleBrief.buildResearchIntakeAdminCycleBrief(
      '2026-08-29T08:29:58.000Z',
    );
    expect(conflict).toContain(
      'Resolve 2 receipts in the current UTC window',
    );
    expect(conflict).toContain('- Receipt gate: `blocked-by-conflict`');
    expect(conflict).toContain('- Current receipts: 2 of 1');
    expect(conflict).toContain(
      '- Next manual receipt slot: None until the current-window conflict is reconciled',
    );
  });

  it('advertises the cycle brief on every protected projection and keeps it out of public resources', () => {
    const protectedProjections = [
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), AUDIT_AT),
      buildResearchIntakeAdminEvidenceIndexPayload(AUDIT_AT),
      buildResearchIntakeAdminEvidencePayload(AUDIT_AT),
      buildResearchIntakeAdminCandidatePayload(TC267, AUDIT_AT),
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
    ];

    for (const projection of protectedProjections) {
      expect(projection?.resources).toMatchObject({
        cycleBrief: '/api/admin/research-intake/brief.md',
      });
    }

    const publicBytes = JSON.stringify({
      catalog: buildResearchIntakePublicPayload(),
      evidence: buildResearchIntakePublicEvidencePayload(),
    });
    expect(publicBytes).not.toMatch(
      /cycleBrief|\/api\/admin\/research-intake\/brief\.md/,
    );
    expect(publicBytes).toContain(
      '"evidenceBrief":"/api/research/intake/brief.md"',
    );
  });

  it('defines an auth-first private read-only Markdown route', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    expect(route.indexOf('assertAdminApi(request)')).toBeGreaterThan(-1);
    expect(route.indexOf('new Date()')).toBeGreaterThan(
      route.indexOf('assertAdminApi(request)'),
    );
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain('Content-Disposition');
    expect(route).toContain('inline; filename="tradeclaw-research-cycle-brief.md"');
    expect(route).not.toMatch(/export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/);
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('keeps public and CSV bytes frozen and documents the simple entry point', () => {
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

    const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');
    const loopPlan = readFileSync(
      resolve(ROOT, 'docs/plans/2026-08-29-three-hour-research-marketing-loop.md'),
      'utf8',
    );
    for (const document of [readme, loopPlan]) {
      expect(document).toContain('/api/admin/research-intake/brief.md');
      expect(document).toMatch(/human-readable research cycle brief/i);
      expect(document).toMatch(/does not create or authorize a receipt/i);
    }
  });
});

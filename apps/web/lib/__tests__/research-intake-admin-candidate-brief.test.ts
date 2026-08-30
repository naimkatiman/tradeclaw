import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-intake-admin-candidate-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/admin/research-intake/[candidateId]/brief.md/route.ts',
);
const README_PATH = resolve(ROOT, 'README.md');
const LOOP_PLAN_PATH = resolve(
  ROOT,
  'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
);
const OBSERVED_AT = '2026-08-29T15:59:59.999Z';
const TC259 = 'trading-the-term-premium';
const TC260 = 'a-risk-based-approach-to-tactical-asset-allocation';
const UNTOUCHED =
  'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe';

interface CandidateBriefModule {
  buildResearchIntakeAdminCandidateBrief: (
    candidateId: string,
    at: Date | string | number,
  ) => string | null;
}

function loadCandidateBriefModule(): CandidateBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-admin-candidate-brief',
  ) as CandidateBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected human-readable exact research candidate brief', () => {
  it('renders one deterministic source-audit decision from one protected observation', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const candidateBrief = loadCandidateBriefModule();
    expect(candidateBrief).not.toBeNull();
    if (!candidateBrief) return;

    const first = candidateBrief.buildResearchIntakeAdminCandidateBrief(
      TC260,
      OBSERVED_AT,
    );
    const replay = candidateBrief.buildResearchIntakeAdminCandidateBrief(
      TC260,
      OBSERVED_AT,
    );

    expect(replay).toBe(first);
    expect(first).not.toBeNull();
    if (!first) return;
    expect(first.startsWith('# A Risk Based Approach to Tactical Asset Allocation\n')).toBe(
      true,
    );
    expect(first).toContain(`- Observed at: \`${OBSERVED_AT}\``);
    expect(first).toContain('- Access: Admin read-only');
    expect(first).toContain('- Evidence status: Source audit only');
    expect(first).toContain('- Performance gates evaluated: No');
    expect(first).toContain('- Source-audit disposition: `no-go`');
    expect(first).toContain('- Decision record: `TC-260` on `2026-08-29`');
    expect(first).toContain('## What to do next');
    expect(first).toContain('- Receipt count: 1');
    expect(first).toContain('- Latest receipt: `TC-260`');
    expect(first).toContain('- Marketing review: None');
    expect(first).toContain(
      `- Protected JSON: [Open machine record](/api/admin/research-intake/${TC260})`,
    );
    expect(first).toContain(
      `- Public human record: [Open public record](/api/research/intake/${TC260}/brief.md)`,
    );
    expect(first).toContain('- Changes research state: No');
    expect(first).toContain('- Publishes or posts: No');
    expect(first).toContain('- Executes trades: No');
  });

  it('reveals receipt and marketing-review context only at their canonical time', () => {
    const candidateBrief = loadCandidateBriefModule();
    expect(candidateBrief).not.toBeNull();
    if (!candidateBrief) return;

    const before = candidateBrief.buildResearchIntakeAdminCandidateBrief(
      TC259,
      '2026-08-29T12:47:50.999Z',
    );
    const at = candidateBrief.buildResearchIntakeAdminCandidateBrief(
      TC259,
      '2026-08-29T12:47:51.000Z',
    );

    expect(before).toContain('- Receipt count: 0');
    expect(before).toContain('- Marketing review: None');
    expect(before).not.toContain('/review/TC-259/packet.md');
    expect(at).toContain('- Receipt count: 1');
    expect(at).toContain('- Marketing review: `human-review-required`');
    expect(at).toContain(
      '- Review packet: [Open review packet](/api/admin/research-intake/review/TC-259/packet.md)',
    );
    expect(at).toContain('- Publication approved: No');
    expect(at).toContain('- Trading approved: No');
  });

  it('handles untouched and non-canonical candidates without inventing evidence', () => {
    const candidateBrief = loadCandidateBriefModule();
    expect(candidateBrief).not.toBeNull();
    if (!candidateBrief) return;

    const untouched = candidateBrief.buildResearchIntakeAdminCandidateBrief(
      UNTOUCHED,
      OBSERVED_AT,
    );
    expect(untouched).toContain('- Evidence status: Not tested by TradeClaw');
    expect(untouched).toContain('- Decision record: None');
    expect(untouched).toContain('- Repository evidence: None');

    for (const candidateId of [
      'missing-candidate',
      TC260.toUpperCase(),
      ` ${TC260}`,
    ]) {
      expect(
        candidateBrief.buildResearchIntakeAdminCandidateBrief(
          candidateId,
          OBSERVED_AT,
        ),
      ).toBeNull();
    }
  });

  it('advertises both exact formats on every protected candidate-link surface', () => {
    const catalog = buildResearchIntakeAdminPayload(
      new URLSearchParams('limit=100'),
      OBSERVED_AT,
    );
    const index = buildResearchIntakeAdminEvidenceIndexPayload(OBSERVED_AT);
    const evidence = buildResearchIntakeAdminEvidencePayload(OBSERVED_AT);
    const candidate = buildResearchIntakeAdminCandidatePayload(TC260, OBSERVED_AT);
    const review = buildResearchIntakeAdminReviewPayload(OBSERVED_AT);
    if (!candidate) throw new Error('TC-260 admin candidate fixture is missing');

    const linkSets = [
      ...catalog.records.map((record) => record.links),
      ...index.items.map((item) => item.links),
      ...evidence.items.map((item) => item.links),
      ...review.queue.items.map((item) => item.links),
      candidate.links,
    ];

    for (const links of linkSets) {
      expect(links.adminCandidateBrief).toBe(`${links.adminCandidate}/brief.md`);
      expect(links.publicCandidateBrief).toBe(`${links.publicCandidate}/brief.md`);
    }
  });

  it('defines an auth-first private GET-only Markdown route', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    const authIndex = route.indexOf('assertAdminApi(request)');
    expect(authIndex).toBeGreaterThan(-1);
    expect(route.indexOf('await params')).toBeGreaterThan(authIndex);
    expect(route.indexOf('new Date()')).toBeGreaterThan(authIndex);
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain(
      'inline; filename="tradeclaw-research-admin-candidate-brief.md"',
    );
    expect(route).toContain('X-Content-Type-Options');
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the protected human path while keeping public bytes unchanged', () => {
    for (const path of [README_PATH, LOOP_PLAN_PATH]) {
      const document = readFileSync(path, 'utf8');
      expect(document).toContain(
        '/api/admin/research-intake/{candidateId}/brief.md',
      );
      expect(document).toMatch(/protected human-readable\s+exact candidate/i);
      expect(document).toMatch(/does not create(?: or authorize)? a receipt/i);
      expect(document).toMatch(/publish, post, or trade/i);
    }

    expect({
      publicCatalog: fingerprint(buildResearchIntakePublicPayload()),
      publicEvidence: fingerprint(buildResearchIntakePublicEvidencePayload()),
    }).toEqual({
      publicCatalog: {
        bytes: 140_878,
        sha256: '4c48acd73a18d967bbf039e7109188c136b0f76d011b4e6da5754cb37326d3ec',
      },
      publicEvidence: {
        bytes: 82_070,
        sha256: '43d0257b89f0011979269732dd45e8fd8672c9f6aa35bb691255cd396f2076cf',
      },
    });
  });
});

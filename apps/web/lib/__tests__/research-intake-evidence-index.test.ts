import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import * as adminIntake from '../research-intake-admin';
import * as publicIntake from '../research-intake-public';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../../..');

interface CompactEvidenceState {
  performanceEvidenceStatus: string;
  label: string;
  performanceGatesEvaluated: boolean;
  taskId: string | null;
  decisionSummary: string;
  evidenceRecordedOn: string;
}

interface PublicEvidenceIndexItem {
  evidencePosition: number;
  candidate: {
    id: string;
    title: string;
    assetClass: string;
    sourcePosition: number;
    stage: string;
    verdict: string;
    costStatus: string;
    evidenceBasis: string;
    evidenceState: CompactEvidenceState;
  };
  links: { candidate: string };
}

interface AdminEvidenceIndexItem {
  evidencePosition: number;
  candidate: PublicEvidenceIndexItem['candidate'];
  workflow: {
    receiptCount: number;
    hasMarketingHandoff: boolean;
    nextAction: string;
  };
  links: {
    adminCandidate: string;
    adminCandidateBrief: string;
    publicCandidate: string;
    publicCandidateBrief: string;
  };
}

interface PublicEvidenceIndexPayload {
  startHere: {
    href: string;
    targetResource: string;
    targetIsCurrentResource: boolean;
  };
  evidenceIndex: {
    selection: string;
    order: string;
    performanceRanked: boolean;
    includesEveryAvailableOverlay: boolean;
  };
  items: readonly PublicEvidenceIndexItem[];
}

interface AdminEvidenceIndexPayload extends Omit<PublicEvidenceIndexPayload, 'items'> {
  items: readonly AdminEvidenceIndexItem[];
}

function publicIndexBuilder(): () => PublicEvidenceIndexPayload {
  const builder = (publicIntake as unknown as {
    buildResearchIntakePublicEvidenceIndexPayload?: () => PublicEvidenceIndexPayload;
  }).buildResearchIntakePublicEvidenceIndexPayload;
  expect(builder).toEqual(expect.any(Function));
  if (typeof builder !== 'function') throw new Error('public evidence-index builder is missing');
  return builder;
}

function adminIndexBuilder(): (
  at: Date | string | number,
) => AdminEvidenceIndexPayload {
  const builder = (adminIntake as unknown as {
    buildResearchIntakeAdminEvidenceIndexPayload?: (
      at: Date | string | number,
    ) => AdminEvidenceIndexPayload;
  }).buildResearchIntakeAdminEvidenceIndexPayload;
  expect(builder).toEqual(expect.any(Function));
  if (typeof builder !== 'function') throw new Error('admin evidence-index builder is missing');
  return builder;
}

function compactEvidenceState(state: {
  performanceEvidenceStatus: string;
  label: string;
  performanceGatesEvaluated: boolean;
  taskId: string | null;
  decisionSummary: string | null;
  evidenceRecordedOn: string | null;
}): CompactEvidenceState {
  if (state.decisionSummary === null || state.evidenceRecordedOn === null) {
    throw new Error('Examined evidence-index records require shared decision context');
  }
  return {
    performanceEvidenceStatus: state.performanceEvidenceStatus,
    label: state.label,
    performanceGatesEvaluated: state.performanceGatesEvaluated,
    taskId: state.taskId,
    decisionSummary: state.decisionSummary,
    evidenceRecordedOn: state.evidenceRecordedOn,
  };
}

function evidenceBasis(record: {
  tradeClawSourceAudit: unknown;
  tradeClawEvidence: unknown;
}): string {
  if (record.tradeClawEvidence) return 'tradeclaw-replication-record';
  if (record.tradeClawSourceAudit) return 'tradeclaw-source-audit-only';
  return 'upstream-gross-discovery-only';
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const serialized = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

describe('compact research intake evidence-index contract', () => {
  it('builds a source-ordered public list with exact detail links and no evidence bodies', () => {
    const evidence = publicIntake.buildResearchIntakePublicEvidencePayload();
    const payload = publicIndexBuilder()();

    expect(payload.evidenceIndex).toEqual(evidence.evidenceIndex);
    expect(payload.startHere).toMatchObject({
      href: '/api/research/intake/evidence/index',
      targetResource: 'evidence-index',
      targetIsCurrentResource: true,
    });
    expect(payload.items).toEqual(evidence.records.map((record, index) => ({
      evidencePosition: index + 1,
      candidate: {
        id: record.id,
        title: record.title,
        assetClass: record.assetClass,
        sourcePosition: record.sourcePosition,
        stage: record.stage,
        verdict: record.verdict,
        costStatus: record.costStatus,
        evidenceBasis: record.evidenceBasis,
        evidenceState: compactEvidenceState(record.evidenceState),
      },
      links: record.links,
    })));
    expect(JSON.stringify(payload.items)).not.toMatch(
      /"(?:sourceUrl|upstreamGrossSharpe|upstreamTStatistic|upstreamVolatilityPct|upstreamYearsTested|tradeClawSourceAudit|tradeClawEvidence|nextAction|marketingDisposition|marketingReviewDraft|meaning|evidencePath|artifactPath)"/,
    );
    expect(fingerprint(payload)).toEqual({
      bytes: 22_083,
      sha256: 'f33f5fcf6df43a0a26228b429d66a719a59724aba46429a8cbd0abb68f14813c',
    });
  });

  it('builds an observation-consistent protected list with only workflow presence', () => {
    const evidence = adminIntake.buildResearchIntakeAdminEvidencePayload(AUDIT_AT);
    const payload = adminIndexBuilder()(AUDIT_AT);

    expect(payload.evidenceIndex).toEqual(evidence.evidenceIndex);
    expect(payload.items).toEqual(evidence.items.map((item) => ({
      evidencePosition: item.evidencePosition,
      candidate: {
        id: item.record.id,
        title: item.record.title,
        assetClass: item.record.assetClass,
        sourcePosition: item.record.sourcePosition,
        stage: item.record.stage,
        verdict: item.record.verdict,
        costStatus: item.record.costStatus,
        evidenceBasis: evidenceBasis(item.record),
        evidenceState: compactEvidenceState(item.record.evidenceState),
      },
      workflow: {
        receiptCount: item.candidateWorkflow.receiptCount,
        hasMarketingHandoff: item.candidateWorkflow.marketingHandoff !== null,
        nextAction: item.record.nextAction,
      },
      links: item.links,
    })));
    expect(JSON.stringify(payload.items)).not.toMatch(
      /"(?:receipts|latestReceipt|marketingHandoff|draft|tradeClawSourceAudit|tradeClawEvidence|meaning|evidencePath|artifactPath)"/,
    );
    expect(fingerprint(payload)).toEqual({
      bytes: 33_472,
      sha256: '24fa9062a8bd802ae6402dd36cd5401fe69982866bb7eb67b87743d26d674fb5',
    });
  });

  it('discovers the index in both audience maps and allows only the explicit index target', () => {
    expect(publicIntake.RESEARCH_INTAKE_PUBLIC_RESOURCES).toHaveProperty(
      'evidenceIndex',
      '/api/research/intake/evidence/index',
    );
    expect(adminIntake.RESEARCH_INTAKE_ADMIN_RESOURCES).toHaveProperty(
      'evidenceIndex',
      '/api/admin/research-intake/evidence/index',
    );

    const source = readFileSync(
      resolve(REPO_ROOT, 'apps/web/lib/research-intake-start-here.ts'),
      'utf8',
    );
    expect(source).toMatch(/ResearchIntakeCurrentResource[\s\S]*'evidence-index'/);
    expect(source).toMatch(/ResearchIntakeStartHereTargetResource[\s\S]*'evidence-index'/);
    expect(source).not.toContain('ResearchIntakeStartHereTargetResource = Exclude<');
  });

  it('defines a cacheable, query-independent public evidence-index GET', () => {
    const routePath = resolve(
      REPO_ROOT,
      'apps/web/app/api/research/intake/evidence/index/route.ts',
    );
    expect(existsSync(routePath)).toBe(true);
    if (!existsSync(routePath)) return;

    const route = readFileSync(routePath, 'utf8');
    expect(route).toContain('buildResearchIntakePublicEvidenceIndexPayload');
    expect(route).toContain('export const revalidate = 3600');
    expect(route).toContain(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(route).not.toContain('assertAdminApi');
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export (?:async )?function (?:POST|PUT|PATCH|DELETE)/);
  });

  it('defines an auth-first, private, no-store protected evidence-index GET', () => {
    const routePath = resolve(
      REPO_ROOT,
      'apps/web/app/api/admin/research-intake/evidence/index/route.ts',
    );
    expect(existsSync(routePath)).toBe(true);
    if (!existsSync(routePath)) return;

    const route = readFileSync(routePath, 'utf8');
    const authCall = route.indexOf('const denied = await assertAdminApi');
    const builderCall = route.lastIndexOf('buildResearchIntakeAdminEvidenceIndexPayload');
    expect(authCall).toBeGreaterThan(-1);
    expect(builderCall).toBeGreaterThan(authCall);
    expect(route).toContain("export const dynamic = 'force-dynamic'");
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain("Vary', 'Cookie, Authorization");
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export async function (?:POST|PUT|PATCH|DELETE)/);
  });

  it('documents the public index between overview and complete evidence only', () => {
    const spec = buildOpenApiSpec() as unknown as {
      components: {
        schemas: Record<string, {
          required?: string[];
          properties?: Record<string, unknown>;
        }>;
      };
      paths: Record<string, { get?: { security?: unknown[]; parameters?: unknown[] } }>;
    };
    const operation = spec.paths['/api/research/intake/evidence/index']?.get;
    const schema = spec.components.schemas.ResearchIntakeEvidenceIndexResponse;
    const resources = spec.components.schemas.ResearchIntakePublicResources;
    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));

    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.parameters).toBeUndefined();
    expect(schema.required).toEqual([
      'schemaVersion',
      'access',
      'resources',
      'startHere',
      'source',
      'selectionPolicy',
      'workflow',
      'claimBoundary',
      'catalogSummary',
      'catalogEvidenceStateSummary',
      'evidenceSummary',
      'evidenceStateSummary',
      'evidenceIndex',
      'items',
    ]);
    expect(schema.properties).not.toHaveProperty('records');
    expect(resources.required).toContain('evidenceIndex');
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/evidence/index');
    expect(api).toMatch(/compact.*evidence index.*exact.*candidate/i);
    expect(api).toContain('curl https://tradeclaw.win/api/research/intake/evidence/index');
    expect(api.indexOf('curl https://tradeclaw.win/api/research/intake/overview')).toBeLessThan(
      api.indexOf('curl https://tradeclaw.win/api/research/intake/evidence/index\n'),
    );
    expect(api.indexOf('curl https://tradeclaw.win/api/research/intake/evidence/index\n')).toBeLessThan(
      api.indexOf('/api/research/intake/evidence\n'),
    );
  });
});

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import * as adminIntake from '../research-intake-admin';
import * as publicIntake from '../research-intake-public';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../../..');

type PublicOverview = Omit<
  ReturnType<typeof publicIntake.buildResearchIntakePublicPayload>,
  'records'
> & Pick<
  ReturnType<typeof publicIntake.buildResearchIntakePublicEvidencePayload>,
  'evidenceSummary' | 'evidenceStateSummary'
>;

type AdminCatalog = ReturnType<typeof adminIntake.buildResearchIntakeAdminPayload>;
type AdminEvidence = ReturnType<typeof adminIntake.buildResearchIntakeAdminEvidencePayload>;
type AdminOverview = Pick<
  AdminCatalog,
  | 'schemaVersion'
  | 'access'
  | 'resources'
  | 'startHere'
  | 'source'
  | 'selectionPolicy'
  | 'workflow'
  | 'researchLoop'
  | 'catalogSummary'
  | 'catalogEvidenceStateSummary'
> & Pick<AdminEvidence, 'evidenceSummary' | 'evidenceStateSummary'> & {
  marketingReview: {
    status: AdminCatalog['marketingReview']['status'];
    summary: AdminCatalog['marketingReview']['summary'];
    currentWindowDraftCount: number;
    controls: AdminCatalog['marketingReview']['controls'];
  };
};

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const serialized = JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

function publicOverviewBuilder(): () => PublicOverview {
  const builder = (publicIntake as unknown as {
    buildResearchIntakePublicOverviewPayload?: () => PublicOverview;
  }).buildResearchIntakePublicOverviewPayload;
  expect(builder).toEqual(expect.any(Function));
  if (typeof builder !== 'function') throw new Error('public overview builder is missing');
  return builder;
}

function adminOverviewBuilder(): (at: Date | string | number) => AdminOverview {
  const builder = (adminIntake as unknown as {
    buildResearchIntakeAdminOverviewPayload?: (
      at: Date | string | number,
    ) => AdminOverview;
  }).buildResearchIntakeAdminOverviewPayload;
  expect(builder).toEqual(expect.any(Function));
  if (typeof builder !== 'function') throw new Error('admin overview builder is missing');
  return builder;
}

describe('compact research intake overview contract', () => {
  it('builds a deterministic record-free public orientation payload', () => {
    const catalog = publicIntake.buildResearchIntakePublicPayload();
    const evidence = publicIntake.buildResearchIntakePublicEvidencePayload();
    const overview = publicOverviewBuilder()();

    expect(overview).toEqual({
      schemaVersion: catalog.schemaVersion,
      access: catalog.access,
      resources: catalog.resources,
      startHere: {
        ...catalog.startHere,
        targetIsCurrentResource: false,
      },
      source: catalog.source,
      selectionPolicy: catalog.selectionPolicy,
      workflow: catalog.workflow,
      claimBoundary: catalog.claimBoundary,
      catalogSummary: catalog.catalogSummary,
      catalogEvidenceStateSummary: catalog.catalogEvidenceStateSummary,
      evidenceSummary: evidence.evidenceSummary,
      evidenceStateSummary: evidence.evidenceStateSummary,
    });
    expect(JSON.stringify(overview)).not.toMatch(
      /\"(?:records|items|researchLoop|marketingReview|latestReceipt|currentWindowReceipts|marketingReviewDraft)\"/,
    );
    expect(fingerprint(overview)).toEqual({
      bytes: 7_637,
      sha256: '2696bd48c4e94712d1616a7af86ddea799c34d389caba289a1aaad341938e821',
    });
  });

  it('builds an observation-consistent protected orientation payload without records or drafts', () => {
    const catalog = adminIntake.buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      AUDIT_AT,
    );
    const evidence = adminIntake.buildResearchIntakeAdminEvidencePayload(AUDIT_AT);
    const overview = adminOverviewBuilder()(AUDIT_AT);

    expect(overview).toEqual({
      schemaVersion: catalog.schemaVersion,
      access: catalog.access,
      resources: catalog.resources,
      startHere: {
        ...catalog.startHere,
        targetIsCurrentResource: false,
      },
      source: catalog.source,
      selectionPolicy: catalog.selectionPolicy,
      workflow: catalog.workflow,
      researchLoop: catalog.researchLoop,
      marketingReview: {
        status: catalog.marketingReview.status,
        summary: catalog.marketingReview.summary,
        currentWindowDraftCount: catalog.marketingReview.currentWindowHandoffs.length,
        nextReview: catalog.marketingReview.nextReview,
        controls: catalog.marketingReview.controls,
      },
      catalogSummary: catalog.catalogSummary,
      catalogEvidenceStateSummary: catalog.catalogEvidenceStateSummary,
      evidenceSummary: evidence.evidenceSummary,
      evidenceStateSummary: evidence.evidenceStateSummary,
    });
    expect(overview.startHere).toMatchObject({
      audience: 'admin',
      kind: 'review-marketing-drafts',
      itemCount: 4,
      targetResource: 'marketing-review-packet',
      targetIsCurrentResource: false,
      automaticAction: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
    });
    expect(JSON.stringify(overview.marketingReview)).not.toMatch(
      /\"(?:latestHandoff|currentWindowHandoffs|handoffs|draft)\"/,
    );
    expect(overview).not.toHaveProperty('records');
    expect(overview).not.toHaveProperty('items');
    expect(fingerprint(overview)).toEqual({
      bytes: 11_275,
      sha256: '10129efe3d335c5f45b6c7f7d95c5fa65ea874c0a9e3178798e928487f274f6d',
    });
  });

  it('discovers overview in both audience maps without allowing it as a next-action target', () => {
    expect(publicIntake.RESEARCH_INTAKE_PUBLIC_RESOURCES).toEqual({
      overview: '/api/research/intake/overview',
      catalog: '/api/research/intake',
      catalogCsv: '/api/research/intake.csv',
      evidenceIndex: '/api/research/intake/evidence/index',
      evidence: '/api/research/intake/evidence',
      evidenceCsv: '/api/research/intake/evidence.csv',
    });
    expect(adminIntake.RESEARCH_INTAKE_ADMIN_RESOURCES).toEqual({
      overview: '/api/admin/research-intake/overview',
      catalog: '/api/admin/research-intake',
      evidenceIndex: '/api/admin/research-intake/evidence/index',
      evidence: '/api/admin/research-intake/evidence',
      evidenceCsv: '/api/admin/research-intake/evidence.csv',
      marketingReview: '/api/admin/research-intake/review',
      marketingReviewCsv: '/api/admin/research-intake/review.csv',
    });

    const source = readFileSync(
      resolve(REPO_ROOT, 'apps/web/lib/research-intake-start-here.ts'),
      'utf8',
    );
    expect(source).toMatch(
      /ResearchIntakeCurrentResource\s*=\s*\|\s*'overview'[\s\S]*'marketing-review'\s*\|\s*'marketing-review-item';/,
    );
    expect(source).toMatch(
      /ResearchIntakeStartHereTargetResource\s*=\s*\|\s*'catalog'\s*\|\s*'evidence-index'\s*\|\s*'evidence'\s*\|\s*'marketing-review'\s*\|\s*'marketing-review-item'\s*\|\s*'marketing-review-packet';/,
    );
    expect(source).not.toContain('ResearchIntakeStartHereTargetResource = Exclude<');
  });

  it('defines the public overview as a cacheable query-independent GET', () => {
    const routePath = resolve(
      REPO_ROOT,
      'apps/web/app/api/research/intake/overview/route.ts',
    );
    expect(existsSync(routePath)).toBe(true);
    if (!existsSync(routePath)) return;

    const route = readFileSync(routePath, 'utf8');
    expect(route).toContain('buildResearchIntakePublicOverviewPayload');
    expect(route).toContain('export const revalidate = 3600');
    expect(route).toContain(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(route).not.toContain('assertAdminApi');
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export (?:async )?function (?:POST|PUT|PATCH|DELETE)/);
  });

  it('defines the protected overview as auth-first, private, no-store, and read-only', () => {
    const routePath = resolve(
      REPO_ROOT,
      'apps/web/app/api/admin/research-intake/overview/route.ts',
    );
    expect(existsSync(routePath)).toBe(true);
    if (!existsSync(routePath)) return;

    const route = readFileSync(routePath, 'utf8');
    const authCall = route.indexOf('const denied = await assertAdminApi');
    const builderCall = route.lastIndexOf('buildResearchIntakeAdminOverviewPayload');
    expect(authCall).toBeGreaterThan(-1);
    expect(builderCall).toBeGreaterThan(authCall);
    expect(route).toContain("export const dynamic = 'force-dynamic'");
    expect(route).toContain('private, no-store, max-age=0');
    expect(route).toContain("Vary', 'Cookie, Authorization");
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export async function (?:POST|PUT|PATCH|DELETE)/);
  });

  it('documents the compact public handoff while keeping the protected peer out of public OpenAPI', () => {
    const spec = buildOpenApiSpec() as unknown as {
      components: {
        schemas: Record<string, {
          required?: string[];
          properties?: Record<string, { const?: string }>;
        }>;
      };
      paths: Record<string, { get?: { security?: unknown[]; parameters?: unknown[] } }>;
    };
    const operation = spec.paths['/api/research/intake/overview']?.get;
    const schema = spec.components.schemas.ResearchIntakeOverviewResponse;
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
    ]);
    expect(schema.properties).not.toHaveProperty('records');
    expect(resources.required).toEqual([
      'overview',
      'catalog',
      'catalogCsv',
      'evidenceIndex',
      'evidence',
      'evidenceCsv',
    ]);
    expect(resources.properties?.overview?.const).toBe('/api/research/intake/overview');
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/overview');
    expect(api).toMatch(/compact.*overview.*no candidate records/i);
    expect(api).toContain('curl https://tradeclaw.win/api/research/intake/overview');
    expect(api).toContain('/api/admin/research-intake/overview');
    expect(api.indexOf('/api/research/intake/overview')).toBeLessThan(
      api.indexOf('curl https://tradeclaw.win/api/research/intake\n'),
    );
    expect(fingerprint(spec)).toEqual({
      bytes: 39_955,
      sha256: '3fcda938046038484cce62ae618afafc833de407bbf3fb60f571faa61b6aef63',
    });
  });
});

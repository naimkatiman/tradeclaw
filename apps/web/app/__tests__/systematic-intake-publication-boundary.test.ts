import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../../lib/openapi';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../../lib/research-intake-public';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '..', path), 'utf8');
}

function collectLocalReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectLocalReferences);
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const ownReference =
    typeof record.$ref === 'string' && record.$ref.startsWith('#/') ? [record.$ref] : [];
  return ownReference.concat(Object.values(record).flatMap(collectLocalReferences));
}

function resolveLocalReference(document: unknown, reference: string): unknown {
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[part];
    }, document);
}

describe('systematic research intake public boundary', () => {
  it('publishes exact catalog counts separately from the retained study ledger', () => {
    const page = source('research/page.tsx');

    expect(page).toContain('SYSTEMATIC_RESEARCH_INTAKE');
    expect(page).toContain('summarizeResearchIntake');
    expect(page).toContain('/api/research/intake');
    expect(page).toContain('Systematic catalog intake');
    expect(page).toMatch(/upstream.*gross.*discovery-only/i);
    expect(page).toMatch(/source-audit no-go.*not a local performance failure/i);
    expect(page).toContain('ENTRIES.map');
  });

  it('renders every canonical experiment artifact on open data', () => {
    const page = source('open-data/page.tsx');

    expect(page).toContain("import { EXPERIMENT_SHELF }");
    expect(page).toContain('/api/research/intake');
    expect(page).toContain('/api/research/intake.csv');
    expect(page).toMatch(/25-column spreadsheet index.*canonical JSON/i);
    expect(page).toContain('EXPERIMENT_SHELF.map');
    expect(page).toContain('all {EXPERIMENT_SHELF.length} committed JSON artifacts');
    expect(page).not.toContain('const ARTIFACTS');
  });

  it('documents the API-key-free read model in the canonical OpenAPI spec', () => {
    const catalogPayload = buildResearchIntakePublicPayload();
    const evidencePayload = buildResearchIntakePublicEvidencePayload();
    const evidenceCount = evidencePayload.records.length;
    const spec = buildOpenApiSpec() as {
      tags: Array<{ name: string }>;
      components: { schemas: Record<string, unknown> };
      paths: Record<
        string,
        {
          get?: {
            security?: unknown[];
            description?: string;
            parameters?: Array<{ name?: string; in?: string; required?: boolean }>;
            responses?: Record<string, unknown>;
          };
        }
      >;
    };
    const operation = spec.paths['/api/research/intake']?.get;
    const evidenceOperation = spec.paths['/api/research/intake/evidence']?.get;
    const evidenceCsvOperation = spec.paths['/api/research/intake/evidence.csv']?.get;
    const candidateOperation = spec.paths['/api/research/intake/{candidateId}']?.get;
    const csvOperation = spec.paths['/api/research/intake.csv']?.get;
    const responseSchema = spec.components.schemas.ResearchIntakeResponse as {
      required?: string[];
      properties?: {
        resources?: { $ref?: string };
        catalogEvidenceStateSummary?: { $ref?: string };
        catalogSummary?: {
          properties?: Record<string, { example?: number }>;
        };
      };
    };
    const publicRecordSchema = spec.components.schemas.ResearchIntakePublicRecord as {
      required?: string[];
      properties?: { links?: { $ref?: string } };
    };
    const publicResourcesSchema = spec.components.schemas.ResearchIntakePublicResources as {
      required?: string[];
      properties?: Record<string, { const?: string }>;
    };
    const candidateResponseSchema = spec.components.schemas.ResearchIntakeCandidateResponse as {
      required?: string[];
      properties?: { navigation?: { $ref?: string } };
    };
    const candidateNavigationSchema = spec.components.schemas.ResearchIntakeCandidateNavigation as {
      required?: string[];
      properties?: {
        order?: { enum?: string[] };
        previous?: { nullable?: boolean };
        next?: { nullable?: boolean };
      };
    };
    const evidenceStateSummarySchema = spec.components.schemas
      .ResearchIntakeEvidenceStateSummary as {
        required?: string[];
        properties?: {
          plainLanguageSummary?: { type?: string; description?: string };
        };
      };
    const summaryExamples = responseSchema.properties?.catalogSummary?.properties;

    expect(spec.tags).toContainEqual(expect.objectContaining({ name: 'Research' }));
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeResponse');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakePublicRecord');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakePublicResources');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakePublicRecordLinks');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeEvidenceResponse');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeCandidateResponse');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeCandidateNavigation');
    expect(responseSchema.required).toEqual(expect.arrayContaining([
      'resources',
      'catalogEvidenceStateSummary',
    ]));
    expect(responseSchema.properties?.resources?.$ref).toBe(
      '#/components/schemas/ResearchIntakePublicResources',
    );
    expect(responseSchema.properties?.catalogEvidenceStateSummary?.$ref).toBe(
      '#/components/schemas/ResearchIntakeEvidenceStateSummary',
    );
    expect(publicRecordSchema.required).toContain('links');
    expect(publicRecordSchema.properties?.links?.$ref).toBe(
      '#/components/schemas/ResearchIntakePublicRecordLinks',
    );
    expect(publicResourcesSchema.required).toEqual([
      'overview',
      'catalog',
      'catalogCsv',
      'evidenceIndex',
      'evidence',
      'evidenceCsv',
    ]);
    expect(publicResourcesSchema.properties?.overview?.const).toBe(
      '/api/research/intake/overview',
    );
    expect(publicResourcesSchema.properties?.catalog?.const).toBe('/api/research/intake');
    expect(candidateResponseSchema.required).toContain('navigation');
    expect(candidateResponseSchema.properties?.navigation?.$ref).toBe(
      '#/components/schemas/ResearchIntakeCandidateNavigation',
    );
    expect(candidateNavigationSchema.required).toEqual([
      'order',
      'currentPosition',
      'totalCandidates',
      'catalogHref',
      'selfHref',
      'previous',
      'next',
    ]);
    expect(candidateNavigationSchema.properties?.order?.enum).toEqual(['pinned-source-order']);
    expect(candidateNavigationSchema.properties?.previous?.nullable).toBe(true);
    expect(candidateNavigationSchema.properties?.next?.nullable).toBe(true);
    expect(evidenceStateSummarySchema.required).toContain('plainLanguageSummary');
    expect(evidenceStateSummarySchema.properties?.plainLanguageSummary).toMatchObject({
      type: 'string',
      description: expect.stringMatching(/same ordered counts.*no evidence or authority/i),
    });
    const navigationSchemaJson = JSON.stringify(candidateNavigationSchema);
    expect(Buffer.byteLength(navigationSchemaJson, 'utf8')).toBe(815);
    expect(createHash('sha256').update(navigationSchemaJson).digest('hex')).toBe(
      '44dd07627e028eff006189e7fe13094e5c06f8608d8f57d788494be8fe1414d5',
    );
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(/gross discovery metadata.*modeled historical research/i);
    expect(operation?.responses).toHaveProperty('200');
    expect(evidenceOperation).toBeDefined();
    expect(evidenceOperation?.security).toEqual([]);
    expect(evidenceOperation?.description).toMatch(
      new RegExp(
        `all ${evidenceCount}.*source-audit or replication.*source order.*failures.*no-go.*inconclusive`,
        'i',
      ),
    );
    expect(evidenceOperation?.responses).toHaveProperty('200');
    expect(evidenceCsvOperation).toBeDefined();
    expect(evidenceCsvOperation?.security).toEqual([]);
    expect(evidenceCsvOperation?.description).toMatch(
      new RegExp(
        `all ${evidenceCount}.*25-column.*source order.*failures.*no-go.*inconclusive.*no API key`,
        'i',
      ),
    );
    expect(evidenceCsvOperation?.responses).toHaveProperty('200');
    expect(candidateOperation).toBeDefined();
    expect(candidateOperation?.security).toEqual([]);
    expect(candidateOperation?.description).toMatch(/one canonical candidate.*exact.*case-sensitive/i);
    expect(candidateOperation?.parameters).toContainEqual(
      expect.objectContaining({
        name: 'candidateId',
        in: 'path',
        required: true,
      }),
    );
    expect(candidateOperation?.responses).toHaveProperty('200');
    expect(candidateOperation?.responses).toHaveProperty('404');
    expect(csvOperation).toBeDefined();
    expect(csvOperation?.security).toEqual([]);
    expect(csvOperation?.description).toMatch(/25-column spreadsheet index.*canonical JSON/i);
    expect(csvOperation?.responses).toHaveProperty('200');
    expect(summaryExamples?.discovered?.example).toBe(catalogPayload.catalogSummary.discovered);
    expect(summaryExamples?.sourceAudited?.example).toBe(
      catalogPayload.catalogSummary.sourceAudited,
    );
    expect(summaryExamples?.sourceNoGo?.example).toBe(
      catalogPayload.catalogSummary.sourceNoGo,
    );
  });

  it('keeps every local OpenAPI reference resolvable', () => {
    const spec = buildOpenApiSpec();
    const references = collectLocalReferences(spec);

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(resolveLocalReference(spec, reference)).toBeDefined();
    }
  });

  it('keeps the complete admin evidence desk authenticated and outside public OpenAPI', () => {
    const overviewRoute = source('api/admin/research-intake/overview/route.ts');
    const route = source('api/admin/research-intake/evidence/route.ts');
    const csvRoute = source('api/admin/research-intake/evidence.csv/route.ts');
    const spec = buildOpenApiSpec() as { paths: Record<string, unknown> };

    expect(overviewRoute).toContain('assertAdminApi');
    expect(overviewRoute.indexOf('assertAdminApi')).toBeLessThan(
      overviewRoute.indexOf('buildResearchIntakeAdminOverviewPayload'),
    );
    expect(overviewRoute).toContain("private, no-store, max-age=0");
    expect(overviewRoute).toContain("Vary', 'Cookie, Authorization");
    expect(overviewRoute).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(overviewRoute).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
    expect(route).toContain('assertAdminApi');
    expect(route.indexOf('assertAdminApi')).toBeLessThan(
      route.indexOf('buildResearchIntakeAdminEvidencePayload'),
    );
    expect(route).toContain("private, no-store, max-age=0");
    expect(route).toContain("Vary', 'Cookie, Authorization");
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(route).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
    expect(csvRoute).toContain('assertAdminApi');
    expect(csvRoute.indexOf('assertAdminApi')).toBeLessThan(
      csvRoute.indexOf('buildResearchIntakeAdminEvidenceCsv'),
    );
    expect(csvRoute).toContain("private, no-store, max-age=0");
    expect(csvRoute).toContain("Vary', 'Cookie, Authorization");
    expect(csvRoute).toContain("X-Content-Type-Options': 'nosniff");
    expect(csvRoute).not.toMatch(/Access-Control-Allow-Origin/i);
    expect(csvRoute).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/overview');
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/evidence');
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/evidence.csv');
  });
});

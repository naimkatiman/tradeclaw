import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../../lib/openapi';

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
      properties?: {
        catalogSummary?: {
          properties?: Record<string, { example?: number }>;
        };
      };
    };
    const summaryExamples = responseSchema.properties?.catalogSummary?.properties;

    expect(spec.tags).toContainEqual(expect.objectContaining({ name: 'Research' }));
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeResponse');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakePublicRecord');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeEvidenceResponse');
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeCandidateResponse');
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(/gross discovery metadata.*modeled historical research/i);
    expect(operation?.responses).toHaveProperty('200');
    expect(evidenceOperation).toBeDefined();
    expect(evidenceOperation?.security).toEqual([]);
    expect(evidenceOperation?.description).toMatch(
      /all seven.*source-audit or replication.*source order.*failures.*no-go.*inconclusive/i,
    );
    expect(evidenceOperation?.responses).toHaveProperty('200');
    expect(evidenceCsvOperation).toBeDefined();
    expect(evidenceCsvOperation?.security).toEqual([]);
    expect(evidenceCsvOperation?.description).toMatch(
      /all seven.*25-column.*source order.*failures.*no-go.*inconclusive.*no API key/i,
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
    expect(summaryExamples?.discovered?.example).toBe(54);
    expect(summaryExamples?.sourceAudited?.example).toBe(3);
    expect(summaryExamples?.sourceNoGo?.example).toBe(3);
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
    const route = source('api/admin/research-intake/evidence/route.ts');
    const csvRoute = source('api/admin/research-intake/evidence.csv/route.ts');
    const spec = buildOpenApiSpec() as { paths: Record<string, unknown> };

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
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/evidence');
    expect(spec.paths).not.toHaveProperty('/api/admin/research-intake/evidence.csv');
  });
});

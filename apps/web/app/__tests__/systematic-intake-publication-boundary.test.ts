import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../../lib/openapi';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '..', path), 'utf8');
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
            responses?: Record<string, unknown>;
          };
        }
      >;
    };
    const operation = spec.paths['/api/research/intake']?.get;
    const csvOperation = spec.paths['/api/research/intake.csv']?.get;

    expect(spec.tags).toContainEqual(expect.objectContaining({ name: 'Research' }));
    expect(spec.components.schemas).toHaveProperty('ResearchIntakeResponse');
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(/gross discovery metadata.*modeled historical research/i);
    expect(operation?.responses).toHaveProperty('200');
    expect(csvOperation).toBeDefined();
    expect(csvOperation?.security).toEqual([]);
    expect(csvOperation?.description).toMatch(/25-column spreadsheet index.*canonical JSON/i);
    expect(csvOperation?.responses).toHaveProperty('200');
  });
});

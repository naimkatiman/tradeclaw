import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import { SYSTEMATIC_RESEARCH_INTAKE } from '../research-intake';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchIntakePublicEvidenceIndexBrief } from '../research-intake-public-evidence-index-brief';
import {
  RESEARCH_INTAKE_PUBLIC_RESOURCES,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicOverviewPayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-intake-public-candidate-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/research/intake/[candidateId]/brief.md/route.ts',
);

interface CandidateBriefModule {
  buildResearchIntakePublicCandidateBrief: (candidateId: string) => string | null;
}

function loadCandidateBriefModule(): CandidateBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-public-candidate-brief',
  ) as CandidateBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

function withoutLinks<T extends { links: unknown }>(value: T): Omit<T, 'links'> {
  const { links, ...body } = value;
  void links;
  return body;
}

describe('public human-readable exact candidate brief', () => {
  it('renders every canonical candidate from the exact safe public projection', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const briefModule = loadCandidateBriefModule();
    expect(briefModule).not.toBeNull();
    if (!briefModule) return;

    const catalog = buildResearchIntakePublicPayload();
    for (const record of catalog.records) {
      const first = briefModule.buildResearchIntakePublicCandidateBrief(record.id);
      const replay = briefModule.buildResearchIntakePublicCandidateBrief(record.id);
      expect(first).not.toBeNull();
      expect(replay).toBe(first);
      if (!first) continue;

      expect(first).toContain(`# ${record.title}`);
      expect(first).toContain(
        `- Pinned source position: ${record.sourcePosition + 1} of 61`,
      );
      expect(first).toContain(`- Evidence status: ${record.evidenceState.label}`);
      expect(first).toContain(record.evidenceState.meaning);
      expect(first).toContain(
        `- Performance gates evaluated: ${record.evidenceState.performanceGatesEvaluated ? 'Yes' : 'No'}`,
      );
      expect(first).toContain(`[Open upstream source](${record.sourceUrl})`);
      expect(first).toMatch(/upstream gross discovery metadata/i);
      expect(first).toContain('- Selects or recommends a strategy: No');
      expect(first).toContain('- Publishes, broadcasts, or trades: No');

      if (record.evidenceState.taskId) {
        expect(first).toContain(`\`${record.evidenceState.taskId}\``);
        expect(first).toContain(record.evidenceState.decisionSummary!);
        expect(first).toContain(`\`${record.evidenceState.evidenceRecordedOn}\``);
      } else {
        expect(first).toContain('No TradeClaw audit or replication decision is recorded.');
      }

      expect(first).not.toMatch(
        /\/api\/admin|nextAction|marketingDisposition|marketingReviewDraft|researchLoop|latestReceipt|currentWindowReceipts|owner decision/i,
      );
    }

    expect(fingerprint(catalog.records.map((record) => ({
      id: record.id,
      brief: briefModule.buildResearchIntakePublicCandidateBrief(record.id),
    })))).toEqual({
      bytes: 144_350,
      sha256: '4de0cdea57d5ac9645742082249410de5e515c1d1d72e3ff686a3ed4f511ba5e',
    });
    expect({
      untouched: fingerprint(
        briefModule.buildResearchIntakePublicCandidateBrief(
          'a-study-of-differences-in-returns-between-large-and-small-companies-in-europe',
        )!,
      ),
      sourceAuditOnly: fingerprint(
        briefModule.buildResearchIntakePublicCandidateBrief(
          'properties-of-the-most-diversified-portfolio',
        )!,
      ),
      qaOnly: fingerprint(
        briefModule.buildResearchIntakePublicCandidateBrief(
          'predictable-end-of-month-treasury-returns',
        )!,
      ),
      modeledFail: fingerprint(
        briefModule.buildResearchIntakePublicCandidateBrief('trading-the-term-premium')!,
      ),
      lastCandidate: fingerprint(
        briefModule.buildResearchIntakePublicCandidateBrief(
          'a-risk-based-approach-to-tactical-asset-allocation',
        )!,
      ),
    }).toEqual({
      untouched: {
        bytes: 1_917,
        sha256: 'd1852dc5eee89fb9927166fccdcce3c1bdc8b8d7e7d0f024637bbfb58c7e33f7',
      },
      sourceAuditOnly: {
        bytes: 2_229,
        sha256: 'c4784ec12c68f740d131ae00c573fb670399ad546e090c89815ffee8e00541da',
      },
      qaOnly: {
        bytes: 2_611,
        sha256: 'ef17ef3e0b3f24abd72e167e8321c3a511819333637d4bc5598d6be7ca9c6b1d',
      },
      modeledFail: {
        bytes: 2_540,
        sha256: '36d7f484f532a9460cb29600cbcb54ae94c0f4562654db66a4e2ac59fc795bb8',
      },
      lastCandidate: {
        bytes: 2_087,
        sha256: 'b2a789aa91d0377828f32c6287f357da5884ad73483337a53c2ff8281d77928c',
      },
    });

    expect(briefModule.buildResearchIntakePublicCandidateBrief('missing')).toBeNull();
  });

  it('makes the exact human brief discoverable on every public record and first in the human index', () => {
    const catalog = buildResearchIntakePublicPayload();
    const evidenceIndex = buildResearchIntakePublicEvidenceIndexPayload();

    for (const record of catalog.records) {
      expect((record.links as unknown as Record<string, string>).candidateBrief).toBe(
        `${record.links.candidate}/brief.md`,
      );
    }
    for (const item of evidenceIndex.items) {
      expect((item.links as unknown as Record<string, string>).candidateBrief).toBe(
        `${item.links.candidate}/brief.md`,
      );
    }

    const indexBrief = buildResearchIntakePublicEvidenceIndexBrief();
    for (const item of evidenceIndex.items) {
      const human = `- Human-readable record: [Read this record](${item.links.candidate}/brief.md)`;
      const machine = `- Machine-readable record: \`${item.links.candidate}\``;
      expect(indexBrief).toContain(human);
      expect(indexBrief).toContain(machine);
      expect(indexBrief.indexOf(human)).toBeLessThan(indexBrief.indexOf(machine));
    }
    expect(fingerprint(indexBrief)).toEqual({
      bytes: 11_853,
      sha256: '5180ed5b7a95cdee714a649f82acd25cbe26773557852320bc1f40c968f44887',
    });
    expect({
      catalogLinks: fingerprint(catalog.records.map((record) => record.links)),
      indexLinks: fingerprint(evidenceIndex.items.map((item) => item.links)),
    }).toEqual({
      catalogLinks: {
        bytes: 13_287,
        sha256: '957a66e1dda4f057304512d8b666350b1c153e3f8d51eb4a18bd94ceec049dce',
      },
      indexLinks: {
        bytes: 2_527,
        sha256: '469987b2e9f106712e97aa650bbfea2f2e8e311ad0f9428e1d5d86203cf9b99a',
      },
    });
  });

  it('defines a cacheable exact-ID GET-only Markdown route with a non-reflective 404', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    expect(route).toContain('buildResearchIntakePublicCandidateBrief(candidateId)');
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(route).toContain('Research intake candidate not found.');
    expect(route).toContain("X-Content-Type-Options': 'nosniff");
    expect(route).not.toMatch(/assertAdmin|Cookie|Authorization/);
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the exact human candidate route and link in canonical public OpenAPI', () => {
    const spec = buildOpenApiSpec() as {
      components: {
        schemas: {
          ResearchIntakePublicRecordLinks: {
            required: string[];
            properties: Record<string, { type?: string; description?: string }>;
          };
        };
      };
      paths: Record<string, {
        get?: {
          security?: unknown[];
          description?: string;
          parameters?: Array<{ name?: string; in?: string; required?: boolean }>;
          responses?: Record<string, {
            content?: Record<string, { schema?: { type?: string } }>;
          }>;
        };
      }>;
    };
    const links = spec.components.schemas.ResearchIntakePublicRecordLinks;
    const operation = spec.paths['/api/research/intake/{candidateId}/brief.md']?.get;

    expect(links.required).toContain('candidateBrief');
    expect(links.properties.candidateBrief).toMatchObject({ type: 'string' });
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(
      /human-readable.*canonical candidate.*exact.*case-sensitive.*no API key/i,
    );
    expect(operation?.parameters).toContainEqual(expect.objectContaining({
      name: 'candidateId',
      in: 'path',
      required: true,
    }));
    expect(operation?.responses?.['200']?.content?.['text/markdown']?.schema).toMatchObject({
      type: 'string',
    });
    expect(operation?.responses).toHaveProperty('404');
  });

  it('keeps evidence meaning, source records, summaries, resources, and every CSV byte-identical', () => {
    const catalog = buildResearchIntakePublicPayload();
    const evidence = buildResearchIntakePublicEvidencePayload();
    const index = buildResearchIntakePublicEvidenceIndexPayload();

    expect({
      sourceRecords: fingerprint(SYSTEMATIC_RESEARCH_INTAKE),
      catalogRecordBodies: fingerprint(catalog.records.map(withoutLinks)),
      evidenceRecordBodies: fingerprint(evidence.records.map(withoutLinks)),
      compactItemBodies: fingerprint(index.items.map(withoutLinks)),
      overview: fingerprint(buildResearchIntakePublicOverviewPayload()),
      resources: fingerprint(RESEARCH_INTAKE_PUBLIC_RESOURCES),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(
        buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      ),
      protectedReviewCsv: fingerprint(
        buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      ),
    }).toEqual({
      sourceRecords: {
        bytes: 93_140,
        sha256: '4ad2dfe02ba0f68f1f000f24f03fd8802a712a485909d34069060b7097c683e9',
      },
      catalogRecordBodies: {
        bytes: 116_908,
        sha256: '081e897581b02b318f4c6d74fd8a5a7edaff47160a33ae1ea3c04c6026b3b3b7',
      },
      evidenceRecordBodies: {
        bytes: 65_453,
        sha256: 'ae64874074790dff3d10d1c65b7973751eec8b7cafaf3ed646433a3e9d572d39',
      },
      compactItemBodies: {
        bytes: 10_420,
        sha256: 'f348393a3e3cfbf6691bbca6a026589c0aa8d652515453f841da2ee0b40deada',
      },
      overview: {
        bytes: 7_749,
        sha256: 'ad38ae1c4caa50b7e21afd524e8ff188346b34cee535e108f9245de0722d5870',
      },
      resources: {
        bytes: 374,
        sha256: 'c2ab8ff38c715b07414a0ddcdd73b0e7f016c0eac9e66db17caca18d784c3323',
      },
      publicCatalogCsv: {
        bytes: 37_418,
        sha256: '2b990e994ec88fbea657170a673702daa3cf208de01b0ca61e0a555d9dc0288f',
      },
      publicEvidenceCsv: {
        bytes: 9_138,
        sha256: 'e6cfe5fdaee58678f734ffbd8ea05e719d585eb4ae0477c054420f4dff53b941',
      },
      protectedEvidenceCsv: {
        bytes: 19_965,
        sha256: 'e641315a42b9f66768b3420619e77072474c6dc94392fb6bc9fd37af5aeac35f',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });

  it('documents the complete human index-to-record journey and safety boundary', () => {
    const documents = [
      readFileSync(resolve(ROOT, 'README.md'), 'utf8'),
      readFileSync(
        resolve(
          ROOT,
          'docs/plans/2026-08-29-three-hour-research-marketing-loop.md',
        ),
        'utf8',
      ),
    ];

    for (const document of documents) {
      expect(document).toContain('/api/research/intake/{candidateId}/brief.md');
      expect(document).toMatch(/human-readable index.*human-readable exact record/i);
      expect(document).toMatch(/does not\s+rank.*recommend.*publish.*trade/i);
    }
  });
});

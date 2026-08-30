import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicOverviewPayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { buildResearchIntakePublicEvidenceBrief } from '../research-intake-public-evidence-brief';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-intake-public-evidence-index-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/research/intake/evidence/index.md/route.ts',
);
const TC267 = 'when-factor-timing-makes-sense';

interface EvidenceIndexBriefModule {
  buildResearchIntakePublicEvidenceIndexBrief: () => string;
}

function loadEvidenceIndexBriefModule(): EvidenceIndexBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-public-evidence-index-brief',
  ) as EvidenceIndexBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('public human-readable examined-candidate index', () => {
  it('renders every compact evidence row in pinned source order without adding meaning', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const briefModule = loadEvidenceIndexBriefModule();
    expect(briefModule).not.toBeNull();
    if (!briefModule) return;

    const payload = buildResearchIntakePublicEvidenceIndexPayload();
    const first = briefModule.buildResearchIntakePublicEvidenceIndexBrief();
    const replay = briefModule.buildResearchIntakePublicEvidenceIndexBrief();

    expect(replay).toBe(first);
    expect(fingerprint(first)).toEqual({
      bytes: 11_853,
      sha256: '5180ed5b7a95cdee714a649f82acd25cbe26773557852320bc1f40c968f44887',
    });
    expect(first).toContain('# TradeClaw examined-candidate index');
    expect(first).toContain(
      '**13 of 61 pinned candidates have a TradeClaw source audit or replication record. This list is in pinned upstream source order and is not performance-ranked.**',
    );
    expect(first.match(/^## \d+\./gm)).toHaveLength(13);

    for (const item of payload.items) {
      const state = item.candidate.evidenceState;
      expect(first).toContain(
        `## ${item.evidencePosition}. ${item.candidate.title}`,
      );
      expect(first).toContain(`- Asset class: ${item.candidate.assetClass}`);
      expect(first).toContain(
        `- Pinned source position: ${item.candidate.sourcePosition + 1} of 61`,
      );
      expect(first).toContain(
        `- Evidence: ${state.label} (\`${state.performanceEvidenceStatus}\`)`,
      );
      expect(first).toContain(
        `- Performance gates evaluated: ${state.performanceGatesEvaluated ? 'Yes' : 'No'}`,
      );
      expect(first).toContain(
        `- Decision record: \`${state.taskId}\` on \`${state.evidenceRecordedOn}\``,
      );
      expect(first).toContain(`- Decision: ${state.decisionSummary}`);
      expect(first).toContain(
        `- Human-readable record: [Read this record](${item.links.candidateBrief})`,
      );
      expect(first).toContain(
        `- Machine-readable record: \`${item.links.candidate}\``,
      );
    }

    expect(first).toContain(
      '- Source-audit-only means TradeClaw stopped before a local performance test; it is not a performance failure.',
    );
    expect(first).toContain(
      '- Machine-readable index: `/api/research/intake/evidence/index`',
    );
    expect(first).toContain('- Selects or recommends a strategy: No');
    expect(first).toContain('- Publishes, broadcasts, or trades: No');
    expect(first).not.toMatch(
      /\/api\/admin|receipt|marketing|owner decision|nextAction|tradeClawEvidence|tradeClawSourceAudit/i,
    );
  });

  it('advertises the human index everywhere public and makes it the brief next click', () => {
    const candidate = buildResearchIntakePublicCandidatePayload(TC267);
    expect(candidate).not.toBeNull();
    const projections = [
      buildResearchIntakePublicOverviewPayload(),
      buildResearchIntakePublicEvidenceIndexPayload(),
      buildResearchIntakePublicPayload(),
      buildResearchIntakePublicEvidencePayload(),
      candidate,
    ];

    for (const projection of projections) {
      expect(projection?.resources).toMatchObject({
        evidenceIndexBrief: '/api/research/intake/evidence/index.md',
      });
      expect(JSON.stringify(projection?.resources)).not.toContain('/api/admin');
    }

    const orientation = buildResearchIntakePublicEvidenceBrief();
    expect(orientation).toContain(
      '- Open human-readable index: `/api/research/intake/evidence/index.md`',
    );
    expect(orientation).toContain(
      '- Machine-readable index: `/api/research/intake/evidence/index`',
    );
    expect(orientation.indexOf('Open human-readable index')).toBeLessThan(
      orientation.indexOf('Machine-readable index'),
    );
  });

  it('defines a cacheable GET-only inline Markdown route with no private state', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    expect(route).toContain('buildResearchIntakePublicEvidenceIndexBrief()');
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(route).toContain('tradeclaw-examined-candidate-index.md');
    expect(route).toContain("X-Content-Type-Options': 'nosniff");
    expect(route).not.toMatch(/assertAdmin|Cookie|Authorization/);
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the human index in canonical dynamic public OpenAPI', () => {
    const spec = buildOpenApiSpec() as {
      components: {
        schemas: {
          ResearchIntakePublicResources: {
            required: string[];
            properties: Record<string, { const?: string }>;
          };
        };
      };
      paths: Record<string, {
        get?: {
          security?: unknown[];
          description?: string;
          responses?: Record<string, {
            content?: Record<string, { schema?: { type?: string } }>;
          }>;
        };
      }>;
    };
    const operation = spec.paths['/api/research/intake/evidence/index.md']?.get;
    const resources = spec.components.schemas.ResearchIntakePublicResources;

    expect(resources.required).toContain('evidenceIndexBrief');
    expect(resources.properties.evidenceIndexBrief?.const).toBe(
      '/api/research/intake/evidence/index.md',
    );
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(
      /human-readable.*13.*pinned source order.*not performance-ranked.*no API key/i,
    );
    expect(operation?.responses?.['200']?.content?.['text/markdown']?.schema).toMatchObject({
      type: 'string',
    });
  });

  it('keeps compact rows, research records, and every CSV byte-identical', () => {
    expect({
      compactItems: fingerprint(buildResearchIntakePublicEvidenceIndexPayload().items),
      catalogRecords: fingerprint(buildResearchIntakePublicPayload().records),
      evidenceRecords: fingerprint(buildResearchIntakePublicEvidencePayload().records),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(
        buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      ),
      protectedReviewCsv: fingerprint(
        buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      ),
    }).toEqual({
      compactItems: {
        bytes: 13_050,
        sha256: '5c9a212db38a963ccaa0d0305c7f102d4ad65a08feddb888cca860ea9d0601fd',
      },
      catalogRecords: {
        bytes: 130_682,
        sha256: '46d16a3331dc0c863ddaa7f99778cc63d2a0292ba4ae24256c84c58bfb7ca049',
      },
      evidenceRecords: {
        bytes: 68_083,
        sha256: '0539db65ddaf5c6dbdc139dcef9003d7c32160a9f0f3d373c12c30476a8e23b8',
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

  it('documents the human next click and its non-authorizing boundary', () => {
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
      expect(document).toContain('/api/research/intake/evidence/index.md');
      expect(document).toMatch(/human-readable examined-candidate index/i);
      expect(document).toMatch(/does not\s+rank.*recommend.*publish.*trade/i);
    }
  });
});

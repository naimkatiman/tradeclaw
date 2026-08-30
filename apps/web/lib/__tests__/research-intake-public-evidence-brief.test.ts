import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakePublicCandidatePayload,
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicOverviewPayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';

const ROOT = resolve(__dirname, '../../../..');
const MODULE_PATH = resolve(
  __dirname,
  '../research-intake-public-evidence-brief.ts',
);
const ROUTE_PATH = resolve(
  ROOT,
  'apps/web/app/api/research/intake/brief.md/route.ts',
);
const TC267 = 'when-factor-timing-makes-sense';

const EXPECTED_BRIEF = [
  '# TradeClaw research evidence brief',
  '',
  'TradeClaw publishes the cost-adjusted evidence record, not a strategy leaderboard, paid signal feed, or promise of an edge.',
  '',
  '## What the record says',
  '',
  '**3 of 61 pinned candidates reached TradeClaw performance gates; all 3 failed. The other 58 have no evaluated TradeClaw performance gate.**',
  '',
  '- Pinned candidates: 61',
  '- TradeClaw evidence records: 13',
  '- Source-audit-only records: 9',
  '- QA-only records with no performance result: 1',
  '- Modeled historical passes: 0',
  '- Modeled historical failures: 3',
  '- Modeled historical inconclusive results: 0',
  '- Performance gates evaluated: 3',
  '- Performance gates not evaluated: 58',
  '- Summary: 61 candidates: 48 not tested by TradeClaw, 9 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
  '',
  '## Start here',
  '',
  '**Browse 13 examined candidates**',
  '',
  'This lightweight index includes every TradeClaw source audit and replication in pinned source order, with exact candidate-detail links and no performance ranking.',
  '',
  '- Open human-readable index: `/api/research/intake/evidence/index.md`',
  '- Machine-readable index: `/api/research/intake/evidence/index`',
  '- Automatic action: No',
  '',
  '## How to read this record',
  '',
  '- Upstream repository: `https://github.com/paperswithbacktest/awesome-systematic-trading`',
  '- Pinned commit: `d9c98521c76662d5eae03ab97a4fc721d010dde3`',
  '- Snapshot date: `2026-08-29`',
  '- Upstream performance basis: `gross-of-trading-costs`',
  '- TradeClaw treatment: `discovery-only`',
  '- Source-order policy: Source order is preserved. Upstream Sharpe, t-statistic, volatility, and years are gross discovery metadata and are never TradeClaw evidence, a default sort, or a promotion score.',
  '- Upstream metrics: Sharpe, t-statistic, volatility, and years are upstream gross discovery-only metadata. They are not TradeClaw results, scores, or promotion evidence.',
  '- Source audits: A TradeClaw source audit records reconstructibility and feasibility. A no-go is not a local performance failure when no TradeClaw backtest ran.',
  '- Replications: TradeClaw replication records are modeled historical research, not live performance or broker fills. A QA-stopped record can contain no performance result.',
  '',
  '## Evidence workflow',
  '',
  '- `discovered`: A pinned source record exists. No performance, feasibility, or evidence claim is permitted.',
  '- `source-audited`: The primary paper or article, exact public rule, ambiguities, data rights, required history, and expected turnover are recorded.',
  '- `preregistered`: Rule, fills, costs, datasets and hashes, benchmarks, folds, holdout, falsification market, metrics, and pass gates are frozen before result access.',
  '- `replicated`: A deterministic artifact, replay, focused tests, full research tests, limitations, and PASS/FAIL/INCONCLUSIVE verdict are retained.',
  '- `prospective`: Only a separately eligible result may enter an immutable prospective ledger. Promotion and activation remain separate owner actions.',
  '',
  '## Open data',
  '',
  '- Machine-readable overview: `/api/research/intake/overview`',
  '- Human-readable evidence index: `/api/research/intake/evidence/index.md`',
  '- Lightweight evidence index: `/api/research/intake/evidence/index`',
  '- Complete pinned catalog: `/api/research/intake`',
  '- Complete evidence records: `/api/research/intake/evidence`',
  '- Catalog CSV: `/api/research/intake.csv`',
  '- Evidence CSV: `/api/research/intake/evidence.csv`',
  '',
  '## Safety',
  '',
  '- Public read-only: Yes',
  '- Authentication or API key required: No',
  '- Performance-ranked: No',
  '- Creates evidence or changes research state: No',
  '- Selects or recommends a strategy: No',
  '- Publishes, broadcasts, or trades: No',
  '- Grants publication authority: No',
  '- Grants trading authority: No',
  '- Executes trades: No',
  '',
].join('\n');

interface EvidenceBriefModule {
  buildResearchIntakePublicEvidenceBrief: () => string;
}

function loadEvidenceBriefModule(): EvidenceBriefModule | null {
  if (!existsSync(MODULE_PATH)) return null;
  return jest.requireActual(
    '../research-intake-public-evidence-brief',
  ) as EvidenceBriefModule;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('public human-readable research evidence brief', () => {
  it('renders the exact adverse-inclusive brief from the record-free public overview', () => {
    expect(existsSync(MODULE_PATH)).toBe(true);
    const briefModule = loadEvidenceBriefModule();
    expect(briefModule).not.toBeNull();
    if (!briefModule) return;

    const first = briefModule.buildResearchIntakePublicEvidenceBrief();
    const replay = briefModule.buildResearchIntakePublicEvidenceBrief();

    expect(replay).toBe(first);
    expect(first).toBe(EXPECTED_BRIEF);
    expect(fingerprint(first)).toEqual({
      bytes: 3_761,
      sha256: '2c6160b0185d429b8fb197e1839d2f2425e9ec5bf57d05eecba2ec753c8b55c1',
    });
    expect(first).not.toMatch(
      /\/api\/admin|receipt|marketing|owner decision|candidate record bodies/i,
    );
  });

  it('advertises the brief on every public projection without changing records', () => {
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
        evidenceBrief: '/api/research/intake/brief.md',
      });
      expect(JSON.stringify(projection?.resources)).not.toContain('/api/admin');
    }

    expect({
      catalogRecords: fingerprint(buildResearchIntakePublicPayload().records),
      evidenceRecords: fingerprint(
        buildResearchIntakePublicEvidencePayload().records,
      ),
      candidateRecord: fingerprint(candidate?.record ?? null),
    }).toEqual({
      catalogRecords: {
        bytes: 130_682,
        sha256: '46d16a3331dc0c863ddaa7f99778cc63d2a0292ba4ae24256c84c58bfb7ca049',
      },
      evidenceRecords: {
        bytes: 68_083,
        sha256: '0539db65ddaf5c6dbdc139dcef9003d7c32160a9f0f3d373c12c30476a8e23b8',
      },
      candidateRecord: {
        bytes: 6_381,
        sha256: 'd7e7e4673e5dd033e24bed4fcb46cf28ce95c5b2040a9a849c5a5a8a0d025dac',
      },
    });
  });

  it('defines a cacheable GET-only inline Markdown route with no auth or mutation', () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    if (!existsSync(ROUTE_PATH)) return;

    const route = readFileSync(ROUTE_PATH, 'utf8');
    expect(route).toContain('buildResearchIntakePublicEvidenceBrief()');
    expect(route).toContain('text/markdown; charset=utf-8');
    expect(route).toContain(
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(route).toContain('tradeclaw-research-evidence-brief.md');
    expect(route).toContain("X-Content-Type-Options': 'nosniff");
    expect(route).not.toMatch(/assertAdmin|Cookie|Authorization/);
    expect(route).not.toMatch(
      /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)/,
    );
    expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it('documents the Markdown resource in canonical dynamic public OpenAPI', () => {
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
    const operation = spec.paths['/api/research/intake/brief.md']?.get;
    const resources = spec.components.schemas.ResearchIntakePublicResources;
    expect(resources.required).toContain('evidenceBrief');
    expect(resources.properties.evidenceBrief?.const).toBe(
      '/api/research/intake/brief.md',
    );
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
    expect(operation?.description).toMatch(
      /human-readable.*61.*3.*failed.*58.*not evaluated.*no API key/i,
    );
    expect(operation?.responses?.['200']?.content?.['text/markdown']?.schema).toMatchObject({
      type: 'string',
    });
  });

  it('keeps every public and protected CSV byte-identical', () => {
    expect({
      publicCatalog: fingerprint(buildResearchIntakeCsv()),
      publicEvidence: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidence: fingerprint(
        buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      ),
      protectedReview: fingerprint(
        buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      ),
    }).toEqual({
      publicCatalog: {
        bytes: 37_418,
        sha256: '2b990e994ec88fbea657170a673702daa3cf208de01b0ca61e0a555d9dc0288f',
      },
      publicEvidence: {
        bytes: 9_138,
        sha256: 'e6cfe5fdaee58678f734ffbd8ea05e719d585eb4ae0477c054420f4dff53b941',
      },
      protectedEvidence: {
        bytes: 19_965,
        sha256: 'e641315a42b9f66768b3420619e77072474c6dc94392fb6bc9fd37af5aeac35f',
      },
      protectedReview: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });
  });

  it('documents the public entry point and its non-authorizing boundary', () => {
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
      expect(document).toContain('/api/research/intake/brief.md');
      expect(document).toMatch(/human-readable research evidence brief/i);
      expect(document).toMatch(/does not\s+recommend.*publish.*trade/i);
    }
  });
});

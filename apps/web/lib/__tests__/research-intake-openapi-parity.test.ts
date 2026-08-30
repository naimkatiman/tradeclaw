import { buildOpenApiSpec } from '../openapi';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';

interface SummaryExampleProperties {
  total: { example: number };
  discovered: { example: number };
  sourceAudited: { example: number };
  preregistered: { example: number };
  replicated: { example: number };
  prospective: { example: number };
  passed: { example: number };
  failed: { example: number };
  inconclusive: { example: number };
  untested: { example: number };
  sourceNoGo: { example: number };
}

interface ResearchOpenApiSchemas {
  ResearchIntakePublicRecord: {
    properties: {
      sourcePosition: { maximum: number };
    };
  };
  ResearchIntakeResponse: {
    properties: {
      catalogSummary: { properties: SummaryExampleProperties };
      catalogEvidenceStateSummary: { description: string };
      records: { minItems: number; maxItems: number };
    };
  };
  ResearchIntakeEvidenceResponse: {
    description: string;
    properties: {
      catalogEvidenceStateSummary: { description: string };
      evidenceSummary: {
        allOf: readonly [unknown, {
          description: string;
          properties: SummaryExampleProperties;
        }];
      };
      evidenceStateSummary: { description: string };
      records: { minItems: number; maxItems: number };
    };
  };
  ResearchIntakeCandidateNavigationItem: {
    properties: { position: { maximum: number } };
  };
  ResearchIntakeCandidateNavigation: {
    properties: {
      currentPosition: { maximum: number };
      totalCandidates: { enum: number[] };
    };
  };
}

interface ResearchOpenApiPaths {
  '/api/research/intake': {
    get: { description: string };
  };
  '/api/research/intake/evidence': {
    get: { description: string };
  };
  '/api/research/intake/evidence.csv': {
    get: {
      description: string;
      responses: {
        '200': {
          content: { 'text/csv': { schema: { description: string } } };
        };
      };
    };
  };
  '/api/research/intake.csv': {
    get: {
      description: string;
      responses: {
        '200': {
          content: { 'text/csv': { schema: { description: string } } };
        };
      };
    };
  };
}

interface ResearchOpenApiDocument {
  components: { schemas: ResearchOpenApiSchemas };
  paths: ResearchOpenApiPaths;
}

function summaryExamples(summary: ReturnType<typeof buildResearchIntakePublicPayload>['catalogSummary']) {
  return {
    total: { example: summary.total },
    discovered: { example: summary.discovered },
    sourceAudited: { example: summary.sourceAudited },
    preregistered: { example: summary.preregistered },
    replicated: { example: summary.replicated },
    prospective: { example: summary.prospective },
    passed: { example: summary.passed },
    failed: { example: summary.failed },
    inconclusive: { example: summary.inconclusive },
    untested: { example: summary.untested },
    sourceNoGo: { example: summary.sourceNoGo },
  };
}

function researchSpec(): ResearchOpenApiDocument {
  return buildOpenApiSpec() as unknown as ResearchOpenApiDocument;
}

function researchSchemas(): ResearchOpenApiSchemas {
  return researchSpec().components.schemas;
}

describe('public research OpenAPI payload parity', () => {
  it('derives catalog examples, interpretation, and record bounds from the real payload', () => {
    const payload = buildResearchIntakePublicPayload();
    const schemas = researchSchemas();
    const catalog = schemas.ResearchIntakeResponse.properties;

    expect(catalog.catalogSummary.properties).toMatchObject(
      summaryExamples(payload.catalogSummary),
    );
    expect(catalog.catalogEvidenceStateSummary.description).toContain(
      payload.catalogEvidenceStateSummary.plainLanguageSummary,
    );
    expect(catalog.records).toMatchObject({
      minItems: payload.records.length,
      maxItems: payload.records.length,
    });
  });

  it('derives evidence examples, descriptions, and record bounds from the complete subset', () => {
    const payload = buildResearchIntakePublicEvidencePayload();
    const evidence = researchSchemas().ResearchIntakeEvidenceResponse;
    const summaryOverlay = evidence.properties.evidenceSummary.allOf[1];

    expect(evidence.description).toContain(`all ${payload.records.length} candidates`);
    expect(evidence.properties.catalogEvidenceStateSummary.description).toContain(
      `${payload.records.length}-record evidenceStateSummary`,
    );
    expect(summaryOverlay.description).toContain(
      `complete ${payload.records.length}-record index`,
    );
    expect(summaryOverlay.properties).toMatchObject(
      summaryExamples(payload.evidenceSummary),
    );
    expect(evidence.properties.evidenceStateSummary.description).toContain(
      `complete ${payload.records.length}-record evidence subset`,
    );
    expect(evidence.properties.records).toMatchObject({
      minItems: payload.records.length,
      maxItems: payload.records.length,
    });
  });

  it('derives source and candidate navigation bounds from catalog length', () => {
    const payload = buildResearchIntakePublicPayload();
    const schemas = researchSchemas();
    const catalogLength = payload.records.length;

    expect(
      schemas.ResearchIntakePublicRecord.properties.sourcePosition.maximum,
    ).toBe(catalogLength - 1);
    expect(
      schemas.ResearchIntakeCandidateNavigationItem.properties.position.maximum,
    ).toBe(catalogLength);
    expect(
      schemas.ResearchIntakeCandidateNavigation.properties.currentPosition.maximum,
    ).toBe(catalogLength);
    expect(
      schemas.ResearchIntakeCandidateNavigation.properties.totalCandidates.enum,
    ).toEqual([catalogLength]);
  });

  it('derives JSON and CSV endpoint count copy from the same payloads', () => {
    const catalogCount = buildResearchIntakePublicPayload().records.length;
    const evidenceCount = buildResearchIntakePublicEvidencePayload().records.length;
    const paths = researchSpec().paths;

    expect(paths['/api/research/intake'].get.description).toContain(
      `all ${catalogCount} source candidates`,
    );
    expect(paths['/api/research/intake/evidence'].get.description).toContain(
      `all ${evidenceCount} candidates`,
    );
    expect(paths['/api/research/intake/evidence.csv'].get.description).toContain(
      `all ${evidenceCount} examined candidates`,
    );
    expect(
      paths['/api/research/intake/evidence.csv'].get.responses['200']
        .content['text/csv'].schema.description,
    ).toContain(`plus ${evidenceCount} source-ordered evidence rows`);
    expect(paths['/api/research/intake.csv'].get.description).toContain(
      `all ${catalogCount} source candidates`,
    );
    expect(
      paths['/api/research/intake.csv'].get.responses['200']
        .content['text/csv'].schema.description,
    ).toContain(`plus ${catalogCount} source-ordered rows`);
  });
});

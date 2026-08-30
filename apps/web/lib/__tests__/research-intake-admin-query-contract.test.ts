import { createHash } from 'node:crypto';
import {
  RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT,
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
  parseResearchIntakeAdminQuery,
} from '../research-intake-admin';
import { buildResearchIntakePublicPayload } from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T18:00:40.000Z';
const DETERMINISTIC_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

function expectDeeplyFrozen(value: unknown, visited = new Set<unknown>()): void {
  if (value === null || typeof value !== 'object' || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child, visited);
}

describe('protected research catalog query and navigation contract', () => {
  it('publishes one deeply frozen parser-aligned query contract', () => {
    expect(RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT).toEqual({
      parameterOrder: [
        'q',
        'assetClass',
        'stage',
        'verdict',
        'sourceAuditDisposition',
        'evidenceStatus',
        'page',
        'limit',
      ],
      unknownParameters: 'rejected',
      duplicateParameters: 'rejected',
      parameters: {
        q: {
          type: 'text',
          appliedField: 'query',
          default: null,
          trimWhitespace: true,
          emptyMeans: null,
          maxLength: 120,
          controlCharacters: 'rejected',
        },
        assetClass: {
          type: 'enum',
          default: 'all',
          values: [
            'all',
            'Equities',
            'Bonds',
            'Commodities',
            'Currencies',
            'Cryptocurrencies',
            'Derivatives',
            'Multi-asset',
          ],
        },
        stage: {
          type: 'enum',
          default: 'all',
          values: [
            'all',
            'discovered',
            'source-audited',
            'preregistered',
            'replicated',
            'prospective',
          ],
        },
        verdict: {
          type: 'enum',
          default: 'all',
          values: ['all', 'not-tested', 'pass', 'fail', 'inconclusive'],
        },
        sourceAuditDisposition: {
          type: 'enum',
          default: 'all',
          values: ['all', 'advance', 'hold', 'no-go'],
        },
        evidenceStatus: {
          type: 'enum',
          appliedField: 'evidenceState.performanceEvidenceStatus',
          default: 'all',
          values: [
            'all',
            'not-tested',
            'source-audit-only-no-local-backtest',
            'qa-only-no-performance-result',
            'modeled-historical-pass',
            'modeled-historical-fail',
            'modeled-historical-inconclusive',
          ],
        },
        page: {
          type: 'positive-integer',
          default: 1,
          minimum: 1,
          maximum: 10_000,
        },
        limit: {
          type: 'positive-integer',
          default: 25,
          minimum: 1,
          maximum: 100,
        },
      },
      canonicalLinks: {
        basePath: '/api/admin/research-intake',
        omitDefaultFilters: true,
        alwaysInclude: ['page', 'limit'],
        previousAndNextNullable: true,
        lastPageFloor: 1,
      },
    });
    expectDeeplyFrozen(RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT);

    const payload = buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT);
    expect(payload.queryContract).toBe(RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT);
    expect(payload.catalogEvidenceStateSummary.plainLanguageSummary).toBe(
      '61 candidates: 47 not tested by TradeClaw, 10 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );
  });

  it('keeps every declared default, enum, and maximum aligned with the parser', () => {
    const { parameters } = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT;
    const defaults = parseResearchIntakeAdminQuery(new URLSearchParams());

    expect(defaults).toEqual({
      assetClass: parameters.assetClass.default,
      stage: parameters.stage.default,
      verdict: parameters.verdict.default,
      sourceAuditDisposition: parameters.sourceAuditDisposition.default,
      evidenceStatus: parameters.evidenceStatus.default,
      page: parameters.page.default,
      limit: parameters.limit.default,
    });

    for (const value of parameters.assetClass.values) {
      expect(parseResearchIntakeAdminQuery(new URLSearchParams({ assetClass: value })).assetClass)
        .toBe(value);
    }
    for (const value of parameters.stage.values) {
      expect(parseResearchIntakeAdminQuery(new URLSearchParams({ stage: value })).stage).toBe(value);
    }
    for (const value of parameters.verdict.values) {
      expect(parseResearchIntakeAdminQuery(new URLSearchParams({ verdict: value })).verdict)
        .toBe(value);
    }
    for (const value of parameters.sourceAuditDisposition.values) {
      expect(parseResearchIntakeAdminQuery(
        new URLSearchParams({ sourceAuditDisposition: value }),
      ).sourceAuditDisposition).toBe(value);
    }
    for (const value of parameters.evidenceStatus.values) {
      expect(parseResearchIntakeAdminQuery(
        new URLSearchParams({ evidenceStatus: value }),
      ).evidenceStatus).toBe(value);
    }

    expect(parseResearchIntakeAdminQuery(new URLSearchParams({
      q: 'x'.repeat(parameters.q.maxLength),
      page: String(parameters.page.maximum),
      limit: String(parameters.limit.maximum),
    }))).toMatchObject({
      query: 'x'.repeat(parameters.q.maxLength),
      page: parameters.page.maximum,
      limit: parameters.limit.maximum,
    });
    expect(parseResearchIntakeAdminQuery(new URLSearchParams({ q: '  term premium  ' })).query)
      .toBe('term premium');
    expect(parseResearchIntakeAdminQuery(new URLSearchParams({ q: '   ' })).query)
      .toBeUndefined();
    expect(() => parseResearchIntakeAdminQuery(new URLSearchParams({ q: 'term\u0000premium' })))
      .toThrow(/control characters/i);
    expect(() => parseResearchIntakeAdminQuery(
      new URLSearchParams({ limit: String(parameters.limit.maximum + 1) }),
    )).toThrow(/limit must not exceed 100/i);
  });

  it('authors canonical links in declared order without default-filter noise', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&page=2&limit=3'),
      OBSERVED_AT,
    );

    expect(payload.pagination).toMatchObject({
      page: 2,
      limit: 3,
      totalRecords: 12,
      totalPages: 4,
      hasPreviousPage: true,
      hasNextPage: true,
      links: {
        self: '/api/admin/research-intake?assetClass=Equities&page=2&limit=3',
        first: '/api/admin/research-intake?assetClass=Equities&page=1&limit=3',
        previous: '/api/admin/research-intake?assetClass=Equities&page=1&limit=3',
        next: '/api/admin/research-intake?assetClass=Equities&page=3&limit=3',
        last: '/api/admin/research-intake?assetClass=Equities&page=4&limit=3',
      },
    });
  });

  it('returns stable reset links for an empty result without inventing adjacent pages', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('q=no-such-research-candidate'),
      OBSERVED_AT,
    );
    const pageOne =
      '/api/admin/research-intake?q=no-such-research-candidate&page=1&limit=25';

    expect(payload.pagination.links).toEqual({
      self: pageOne,
      first: pageOne,
      previous: null,
      next: null,
      last: pageOne,
    });
  });

  it('keeps query capabilities catalog-only and outside every public payload', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    for (const payload of [
      candidate,
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
      buildResearchIntakePublicPayload(),
    ]) {
      expect(payload).not.toHaveProperty('queryContract');
      expect(payload).not.toHaveProperty('pagination.links');
    }
  });

  it('serializes the frozen contract and protected catalog deterministically', () => {
    const contract = JSON.stringify(RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT);
    const defaultCatalog = JSON.stringify(
      buildResearchIntakeAdminPayload(new URLSearchParams(), DETERMINISTIC_AT),
    );
    const completeCatalog = JSON.stringify(buildResearchIntakeAdminPayload(
      new URLSearchParams('limit=100'),
      DETERMINISTIC_AT,
    ));

    expect(Buffer.byteLength(contract, 'utf8')).toBe(1_430);
    expect(createHash('sha256').update(contract).digest('hex')).toBe(
      '83fc68d46e4965dfa622175c3c25a076bd2b625219e9eaa83ca5749061938c94',
    );
    expect(Buffer.byteLength(defaultCatalog, 'utf8')).toBe(83_163);
    expect(createHash('sha256').update(defaultCatalog).digest('hex')).toBe(
      '7bd16fe28b7e5c2bd623907112a137ca86a251dbb3241a3b43f86cd020cf7d84',
    );
    expect(Buffer.byteLength(completeCatalog, 'utf8')).toBe(177_805);
    expect(createHash('sha256').update(completeCatalog).digest('hex')).toBe(
      'debe56021a4981b548cd32387afcf47aba21e9e09ba208945b6a94033ce86b39',
    );
  });
});

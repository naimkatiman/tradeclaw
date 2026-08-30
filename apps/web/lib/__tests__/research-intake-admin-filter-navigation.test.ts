import { createHash } from 'node:crypto';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakePublicPayload } from '../research-intake-public';

const OBSERVED_AT = '2026-08-29T18:00:40.000Z';
const DETERMINISTIC_AT = '2026-08-29T15:59:59.999Z';
const CANDIDATE_ID =
  'know-when-to-hodl-em-know-when-to-fodl-em-an-investigation-of-factor-based-investing-in-the-cryptocurrency-space';

interface ActiveFilter {
  parameter: string;
  label: string;
  value: string;
  displayValue: string;
  removeHref: string;
}

interface FilterNavigation {
  contract: {
    activeParameterOrder: string[];
    facetSelectionMode: string;
    resetPageTo: number;
    preserveLimit: boolean;
    preserveUnrelatedFilters: boolean;
    removeOneFilterAtATime: boolean;
    clearAllPreservesLimit: boolean;
    canonicalSerialization: string;
  };
  activeFilterCount: number;
  clearAllHref: string;
  activeFilters: ActiveFilter[];
}

interface FacetOptionLink {
  value: string;
  href?: string;
}

interface FilterFacetsWithLinks {
  dimensions: Record<string, { options: FacetOptionLink[] }>;
}

function readFilterNavigation(payload: unknown): FilterNavigation | undefined {
  return (payload as { filterNavigation?: FilterNavigation }).filterNavigation;
}

function readFilterFacets(payload: unknown): FilterFacetsWithLinks | undefined {
  return (payload as { filterFacets?: FilterFacetsWithLinks }).filterFacets;
}

function expectDeeplyFrozen(value: unknown, visited = new Set<unknown>()): void {
  if (value === null || typeof value !== 'object' || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child, visited);
}

function optionHref(
  facets: FilterFacetsWithLinks | undefined,
  dimension: string,
  value: string,
): string | undefined {
  return facets?.dimensions[dimension]?.options.find((entry) => entry.value === value)?.href;
}

describe('protected research catalog filter navigation', () => {
  it('publishes one deeply frozen canonical action contract and a quiet default state', () => {
    const payload = buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT);
    const navigation = readFilterNavigation(payload);

    expect(payload.filteredEvidenceStateSummary.plainLanguageSummary).toBe(
      '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.',
    );

    expect(navigation).toEqual({
      contract: {
        activeParameterOrder: [
          'q',
          'assetClass',
          'stage',
          'verdict',
          'sourceAuditDisposition',
          'evidenceStatus',
        ],
        facetSelectionMode: 'replace-own-dimension',
        resetPageTo: 1,
        preserveLimit: true,
        preserveUnrelatedFilters: true,
        removeOneFilterAtATime: true,
        clearAllPreservesLimit: true,
        canonicalSerialization: 'query-contract',
      },
      activeFilterCount: 0,
      clearAllHref: '/api/admin/research-intake?page=1&limit=25',
      activeFilters: [],
    });
    expectDeeplyFrozen(navigation?.contract);
  });

  it('authors labeled active filters and remove-one links in canonical order', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams(
        'q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&page=2&limit=3',
      ),
      OBSERVED_AT,
    );
    const navigation = readFilterNavigation(payload);

    expect(payload.filteredEvidenceStateSummary.plainLanguageSummary).toBe(
      '2 candidates: 2 modeled historical failures. Performance gates were evaluated for all 2 candidates.',
    );

    expect(navigation).toEqual({
      contract: expect.any(Object),
      activeFilterCount: 3,
      clearAllHref: '/api/admin/research-intake?page=1&limit=3',
      activeFilters: [
        {
          parameter: 'q',
          label: 'Search',
          value: 'bitcoin',
          displayValue: 'bitcoin',
          removeHref:
            '/api/admin/research-intake?assetClass=Cryptocurrencies&verdict=fail&page=1&limit=3',
        },
        {
          parameter: 'assetClass',
          label: 'Asset class',
          value: 'Cryptocurrencies',
          displayValue: 'Cryptocurrencies',
          removeHref: '/api/admin/research-intake?q=bitcoin&verdict=fail&page=1&limit=3',
        },
        {
          parameter: 'verdict',
          label: 'TradeClaw verdict',
          value: 'fail',
          displayValue: 'Fail',
          removeHref:
            '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&page=1&limit=3',
        },
      ],
    });
  });

  it('authors facet-selection links that replace only the own dimension', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams(
        'q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&page=2&limit=3',
      ),
      OBSERVED_AT,
    );
    const facets = readFilterFacets(payload);

    expect(optionHref(facets, 'assetClass', 'all')).toBe(
      '/api/admin/research-intake?q=bitcoin&verdict=fail&page=1&limit=3',
    );
    expect(optionHref(facets, 'assetClass', 'Cryptocurrencies')).toBe(
      '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&page=1&limit=3',
    );
    expect(optionHref(facets, 'stage', 'all')).toBe(
      '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&page=1&limit=3',
    );
    expect(optionHref(facets, 'stage', 'replicated')).toBe(
      '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&stage=replicated&verdict=fail&page=1&limit=3',
    );
    expect(optionHref(facets, 'verdict', 'all')).toBe(
      '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&page=1&limit=3',
    );
    expect(optionHref(facets, 'sourceAuditDisposition', 'advance')).toBe(
      '/api/admin/research-intake?q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&sourceAuditDisposition=advance&page=1&limit=3',
    );
  });

  it('keeps all filter actions independent of the current page', () => {
    const firstPage = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=1&limit=3'),
      OBSERVED_AT,
    );
    const laterPage = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=3&limit=3'),
      OBSERVED_AT,
    );

    expect(readFilterNavigation(laterPage)).toEqual(readFilterNavigation(firstPage));
    expect(readFilterFacets(laterPage)).toEqual(readFilterFacets(firstPage));
  });

  it('serializes the action contract and representative states deterministically', () => {
    const defaultNavigation = readFilterNavigation(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    ));
    const combinedNavigation = readFilterNavigation(buildResearchIntakeAdminPayload(
      new URLSearchParams(
        'q=bitcoin&assetClass=Cryptocurrencies&verdict=fail&page=2&limit=3',
      ),
      DETERMINISTIC_AT,
    ));
    if (!defaultNavigation || !combinedNavigation) {
      throw new Error('protected filter-navigation fixtures are missing');
    }

    const contract = JSON.stringify(defaultNavigation.contract);
    const defaultBody = JSON.stringify(defaultNavigation);
    const combinedBody = JSON.stringify(combinedNavigation);

    expect(Buffer.byteLength(contract, 'utf8')).toBe(319);
    expect(createHash('sha256').update(contract).digest('hex')).toBe(
      'ff08df4045df7fc697a5fa08800c79e1b4b5e22841b08e5489387bef085201b9',
    );
    expect(Buffer.byteLength(defaultBody, 'utf8')).toBe(433);
    expect(createHash('sha256').update(defaultBody).digest('hex')).toBe(
      '72e1c1ca44bef034397fe9396a97db9eb476a6c0952eb4b3cce89123ba1b9590',
    );
    expect(Buffer.byteLength(combinedBody, 'utf8')).toBe(981);
    expect(createHash('sha256').update(combinedBody).digest('hex')).toBe(
      'c3cdc137407808003debfbf45a59e8f6c77c9297dc6510387c07103290c6e09c',
    );
  });

  it('keeps filter actions catalog-only and outside every public payload', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    for (const payload of [
      candidate,
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
      buildResearchIntakePublicPayload(),
    ]) {
      expect(payload).not.toHaveProperty('filterNavigation');
      expect(JSON.stringify(payload)).not.toMatch(/removeHref|clearAllHref/);
    }
  });
});

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

interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

interface FacetDimension {
  label: string;
  selected: string;
  options: FacetOption[];
}

interface FilterFacets {
  contract: {
    dimensionOrder: string[];
    countingMode: string;
    scope: string;
    queryAppliedToEveryCount: boolean;
    otherActiveFiltersApplied: boolean;
    ownDimensionReplaced: boolean;
    zeroCountOptionsIncluded: boolean;
    optionOrder: string;
    paginationAffectsCounts: boolean;
  };
  dimensions: Record<string, FacetDimension>;
}

function readFilterFacets(payload: unknown): FilterFacets | undefined {
  return (payload as { filterFacets?: FilterFacets }).filterFacets;
}

function expectDeeplyFrozen(value: unknown, visited = new Set<unknown>()): void {
  if (value === null || typeof value !== 'object' || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child, visited);
}

function option(
  value: string,
  label: string,
  count: number,
  selected = false,
): FacetOption {
  return { value, label, count, selected };
}

describe('protected research catalog filter facets', () => {
  it('publishes one explicit deeply frozen disjunctive counting contract', () => {
    const facets = readFilterFacets(
      buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT),
    );

    expect(facets?.contract).toEqual({
      dimensionOrder: ['assetClass', 'stage', 'verdict', 'sourceAuditDisposition'],
      countingMode: 'disjunctive',
      scope: 'complete-catalog-before-pagination',
      queryAppliedToEveryCount: true,
      otherActiveFiltersApplied: true,
      ownDimensionReplaced: true,
      zeroCountOptionsIncluded: true,
      optionOrder: 'query-contract',
      paginationAffectsCounts: false,
    });
    expectDeeplyFrozen(facets?.contract);
    expect(Object.keys(facets?.dimensions ?? {})).toEqual(
      facets?.contract.dimensionOrder,
    );
  });

  it('returns every query-contract option in stable order with exact global counts', () => {
    const facets = readFilterFacets(
      buildResearchIntakeAdminPayload(new URLSearchParams(), OBSERVED_AT),
    );

    expect(facets?.dimensions.assetClass).toEqual({
      label: 'Asset class',
      selected: 'all',
      options: [
        option('all', 'All asset classes', 61, true),
        option('Equities', 'Equities', 12),
        option('Bonds', 'Bonds', 12),
        option('Commodities', 'Commodities', 3),
        option('Currencies', 'Currencies', 4),
        option('Cryptocurrencies', 'Cryptocurrencies', 8),
        option('Derivatives', 'Derivatives', 10),
        option('Multi-asset', 'Multi-asset', 12),
      ],
    });
    expect(facets?.dimensions.stage).toEqual({
      label: 'Research stage',
      selected: 'all',
      options: [
        option('all', 'All stages', 61, true),
        option('discovered', 'Discovered', 54),
        option('source-audited', 'Source audited', 3),
        option('preregistered', 'Preregistered', 0),
        option('replicated', 'Replicated', 4),
        option('prospective', 'Prospective', 0),
      ],
    });
    expect(facets?.dimensions.verdict).toEqual({
      label: 'TradeClaw verdict',
      selected: 'all',
      options: [
        option('all', 'All verdicts', 61, true),
        option('not-tested', 'Not tested', 57),
        option('pass', 'Pass', 0),
        option('fail', 'Fail', 3),
        option('inconclusive', 'Inconclusive', 1),
      ],
    });
    expect(facets?.dimensions.sourceAuditDisposition).toEqual({
      label: 'Source-audit disposition',
      selected: 'all',
      options: [
        option('all', 'All records', 61, true),
        option('advance', 'Advance', 3),
        option('hold', 'Hold', 0),
        option('no-go', 'No-go', 3),
      ],
    });
  });

  it('replaces each facet own filter while retaining every other active filter', () => {
    const payload = buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=2&limit=3'),
      OBSERVED_AT,
    );
    const facets = readFilterFacets(payload);

    expect(payload.pagination).toMatchObject({
      page: 2,
      limit: 3,
      totalRecords: 12,
      returnedRecords: 3,
    });
    expect(facets?.dimensions.assetClass.options.map(({ value, count, selected }) => ({
      value,
      count,
      selected,
    }))).toEqual([
      { value: 'all', count: 54, selected: false },
      { value: 'Equities', count: 12, selected: true },
      { value: 'Bonds', count: 10, selected: false },
      { value: 'Commodities', count: 3, selected: false },
      { value: 'Currencies', count: 4, selected: false },
      { value: 'Cryptocurrencies', count: 4, selected: false },
      { value: 'Derivatives', count: 10, selected: false },
      { value: 'Multi-asset', count: 11, selected: false },
    ]);
    expect(facets?.dimensions.stage.options.map(({ value, count, selected }) => ({
      value,
      count,
      selected,
    }))).toEqual([
      { value: 'all', count: 12, selected: false },
      { value: 'discovered', count: 12, selected: true },
      { value: 'source-audited', count: 0, selected: false },
      { value: 'preregistered', count: 0, selected: false },
      { value: 'replicated', count: 0, selected: false },
      { value: 'prospective', count: 0, selected: false },
    ]);
    expect(Object.values(facets?.dimensions ?? {}).map((dimension) => ({
      selected: dimension.selected,
      selectedOptions: dimension.options
        .filter((entry) => entry.selected)
        .map((entry) => entry.value),
    }))).toEqual([
      { selected: 'Equities', selectedOptions: ['Equities'] },
      { selected: 'discovered', selectedOptions: ['discovered'] },
      { selected: 'all', selectedOptions: ['all'] },
      { selected: 'all', selectedOptions: ['all'] },
    ]);
  });

  it('applies q to every count and includes zero-count options', () => {
    const facets = readFilterFacets(buildResearchIntakeAdminPayload(
      new URLSearchParams('q=bitcoin&assetClass=Cryptocurrencies&verdict=fail'),
      OBSERVED_AT,
    ));

    expect(facets?.dimensions.verdict.options.map(({ value, count }) => ({ value, count })))
      .toEqual([
        { value: 'all', count: 2 },
        { value: 'not-tested', count: 0 },
        { value: 'pass', count: 0 },
        { value: 'fail', count: 2 },
        { value: 'inconclusive', count: 0 },
      ]);
    expect(
      facets?.dimensions.sourceAuditDisposition.options.map(({ value, count }) => ({
        value,
        count,
      })),
    ).toEqual([
      { value: 'all', count: 2 },
      { value: 'advance', count: 1 },
      { value: 'hold', count: 0 },
      { value: 'no-go', count: 0 },
    ]);
  });

  it('keeps facet counts independent of pagination', () => {
    const complete = readFilterFacets(buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=1&limit=100'),
      OBSERVED_AT,
    ));
    const paged = readFilterFacets(buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=2&limit=3'),
      OBSERVED_AT,
    ));

    expect(paged).toEqual(complete);
  });

  it('serializes both frozen and disjunctive facet states deterministically', () => {
    const defaultFacets = readFilterFacets(buildResearchIntakeAdminPayload(
      new URLSearchParams(),
      DETERMINISTIC_AT,
    ));
    const disjunctiveFacets = readFilterFacets(buildResearchIntakeAdminPayload(
      new URLSearchParams('assetClass=Equities&stage=discovered&page=2&limit=3'),
      DETERMINISTIC_AT,
    ));
    if (!defaultFacets || !disjunctiveFacets) {
      throw new Error('protected facet fixtures are missing');
    }

    const contract = JSON.stringify(defaultFacets.contract);
    const defaultBody = JSON.stringify(defaultFacets);
    const disjunctiveBody = JSON.stringify(disjunctiveFacets);

    expect(Buffer.byteLength(contract, 'utf8')).toBe(338);
    expect(createHash('sha256').update(contract).digest('hex')).toBe(
      '0114ebd94cc22669f3437ffbb0bd8213f31f1367c12b4da2ec780d898406bcf2',
    );
    expect(Buffer.byteLength(defaultBody, 'utf8')).toBe(2_249);
    expect(createHash('sha256').update(defaultBody).digest('hex')).toBe(
      '9ef90ebe7a35c831bd01af3658c420991f5f868ae64b5ceb2842ed5fe210179a',
    );
    expect(Buffer.byteLength(disjunctiveBody, 'utf8')).toBe(2_261);
    expect(createHash('sha256').update(disjunctiveBody).digest('hex')).toBe(
      '1a9d5639621649535782b005a473c30ca82d4b29fa67ea3b9c1f6a2c289092f4',
    );
  });

  it('keeps filter facets catalog-only and outside every public payload', () => {
    const candidate = buildResearchIntakeAdminCandidatePayload(CANDIDATE_ID, OBSERVED_AT);
    if (!candidate) throw new Error('TC-261 admin candidate fixture is missing');

    for (const payload of [
      candidate,
      buildResearchIntakeAdminEvidencePayload(OBSERVED_AT),
      buildResearchIntakeAdminReviewPayload(OBSERVED_AT),
      buildResearchIntakePublicPayload(),
    ]) {
      expect(payload).not.toHaveProperty('filterFacets');
    }
  });
});

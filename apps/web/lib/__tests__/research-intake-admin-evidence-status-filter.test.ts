import {
  RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT,
  buildResearchIntakeAdminPayload,
  parseResearchIntakeAdminQuery,
} from '../research-intake-admin';

const AUDIT_AT = '2026-08-29T21:09:39.110Z';

const STATUS_VALUES = [
  'all',
  'not-tested',
  'source-audit-only-no-local-backtest',
  'qa-only-no-performance-result',
  'modeled-historical-pass',
  'modeled-historical-fail',
  'modeled-historical-inconclusive',
] as const;

const STATUS_COUNTS = [61, 51, 6, 1, 0, 3, 0] as const;
const CLASSIFIER_COUNTS = STATUS_COUNTS.slice(1);
const CATALOG_PLAIN_LANGUAGE_SUMMARY =
  '61 candidates: 51 not tested by TradeClaw, 6 source-audit-only records, 1 QA-only record with no performance result, and 3 modeled historical failures. Performance gates were evaluated for 3 candidates and not evaluated for 58 candidates.';

interface EvidenceStatusOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
  href: string;
}

interface EvidenceStatusView {
  appliedFilters: { evidenceStatus?: string };
  filterFacets: {
    contract: { dimensionOrder: string[] };
    dimensions: {
      evidenceStatus?: {
        label: string;
        selected: string;
        options: EvidenceStatusOption[];
      };
    };
  };
  filterNavigation: {
    activeFilterCount: number;
    clearAllHref: string;
    activeFilters: Array<{
      parameter: string;
      label: string;
      value: string;
      displayValue: string;
      removeHref: string;
    }>;
  };
  catalogEvidenceStateSummary?: {
    totalCandidates: number;
    withTradeClawRecord: number;
    performanceGatesEvaluated: number;
    performanceGatesNotEvaluated: number;
    plainLanguageSummary: string;
    statuses: Array<{ performanceEvidenceStatus: string; count: number }>;
  };
  filteredEvidenceStateSummary?: EvidenceStatusView['catalogEvidenceStateSummary'];
  pagination: {
    totalRecords: number;
    returnedRecords: number;
    links: { self: string };
  };
  resultView: {
    status: string;
    recoveryAction: { href: string } | null;
  };
  records: Array<{
    id: string;
    sourcePosition: number;
    evidenceState: {
      performanceEvidenceStatus: string;
      performanceGatesEvaluated: boolean;
    };
  }>;
}

function view(search: string): EvidenceStatusView {
  return buildResearchIntakeAdminPayload(
    new URLSearchParams(search),
    AUDIT_AT,
  ) as unknown as EvidenceStatusView;
}

function statusCounts(summary: EvidenceStatusView['catalogEvidenceStateSummary']): number[] {
  return summary?.statuses.map((status) => status.count) ?? [];
}

describe('protected research catalog evidence-status filter', () => {
  it('publishes a strict parser-aligned evidenceStatus enum', () => {
    const contract = RESEARCH_INTAKE_ADMIN_QUERY_CONTRACT as unknown as {
      parameterOrder: string[];
      parameters: {
        evidenceStatus?: {
          type: string;
          appliedField: string;
          default: string;
          values: readonly string[];
        };
      };
    };

    expect(contract.parameterOrder).toEqual([
      'q',
      'assetClass',
      'stage',
      'verdict',
      'sourceAuditDisposition',
      'evidenceStatus',
      'page',
      'limit',
    ]);
    expect(contract.parameters.evidenceStatus).toEqual({
      type: 'enum',
      appliedField: 'evidenceState.performanceEvidenceStatus',
      default: 'all',
      values: STATUS_VALUES,
    });
    expect(
      (parseResearchIntakeAdminQuery(
        new URLSearchParams('evidenceStatus=qa-only-no-performance-result'),
      ) as unknown as { evidenceStatus: string }).evidenceStatus,
    ).toBe('qa-only-no-performance-result');
    expect(() => parseResearchIntakeAdminQuery(
      new URLSearchParams('evidenceStatus=fail'),
    )).toThrow(/evidenceStatus must be one of/i);
    expect(() => parseResearchIntakeAdminQuery(
      new URLSearchParams(
        'evidenceStatus=not-tested&evidenceStatus=modeled-historical-fail',
      ),
    )).toThrow(/evidenceStatus must appear at most once/i);
  });

  it('returns one ordered global facet and both classifier-backed summaries', () => {
    const payload = view('');
    const facet = payload.filterFacets.dimensions.evidenceStatus;

    expect(payload.appliedFilters.evidenceStatus).toBe('all');
    expect(payload.filterFacets.contract.dimensionOrder).toEqual([
      'assetClass',
      'stage',
      'verdict',
      'sourceAuditDisposition',
      'evidenceStatus',
    ]);
    expect(facet).toMatchObject({
      label: 'Evidence status',
      selected: 'all',
    });
    expect(facet?.options.map(({ value, count, selected }) => ({
      value,
      count,
      selected,
    }))).toEqual(STATUS_VALUES.map((value, index) => ({
      value,
      count: STATUS_COUNTS[index],
      selected: value === 'all',
    })));
    expect(facet?.options.map((option) => option.href)).toEqual([
      '/api/admin/research-intake?page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=not-tested&page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=source-audit-only-no-local-backtest&page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=qa-only-no-performance-result&page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=modeled-historical-pass&page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=modeled-historical-fail&page=1&limit=25',
      '/api/admin/research-intake?evidenceStatus=modeled-historical-inconclusive&page=1&limit=25',
    ]);
    expect(payload.catalogEvidenceStateSummary).toMatchObject({
      totalCandidates: 61,
      withTradeClawRecord: 10,
      performanceGatesEvaluated: 3,
      performanceGatesNotEvaluated: 58,
      plainLanguageSummary: CATALOG_PLAIN_LANGUAGE_SUMMARY,
    });
    expect(statusCounts(payload.catalogEvidenceStateSummary)).toEqual(CLASSIFIER_COUNTS);
    expect(payload.filteredEvidenceStateSummary).toEqual(
      payload.catalogEvidenceStateSummary,
    );
  });

  it('isolates QA-only evidence without relabeling it as evaluated inconclusive', () => {
    const qaOnly = view('evidenceStatus=qa-only-no-performance-result&limit=100');

    expect(qaOnly.pagination).toMatchObject({
      totalRecords: 1,
      returnedRecords: 1,
      links: {
        self: '/api/admin/research-intake?evidenceStatus=qa-only-no-performance-result&page=1&limit=100',
      },
    });
    expect(qaOnly.records).toMatchObject([{
      id: 'predictable-end-of-month-treasury-returns',
      evidenceState: {
        performanceEvidenceStatus: 'qa-only-no-performance-result',
        performanceGatesEvaluated: false,
      },
    }]);
    expect(statusCounts(qaOnly.filteredEvidenceStateSummary)).toEqual([
      0, 0, 1, 0, 0, 0,
    ]);
    expect(qaOnly.filteredEvidenceStateSummary?.plainLanguageSummary).toBe(
      '1 candidate: 1 QA-only record with no performance result. No performance gates were evaluated.',
    );
    expect(qaOnly.filterNavigation).toMatchObject({
      activeFilterCount: 1,
      clearAllHref: '/api/admin/research-intake?page=1&limit=100',
      activeFilters: [{
        parameter: 'evidenceStatus',
        label: 'Evidence status',
        value: 'qa-only-no-performance-result',
        displayValue: 'QA complete; no performance result',
        removeHref: '/api/admin/research-intake?page=1&limit=100',
      }],
    });

    const modeledInconclusive = view(
      'evidenceStatus=modeled-historical-inconclusive&limit=100',
    );
    expect(modeledInconclusive.pagination.totalRecords).toBe(0);
    expect(modeledInconclusive.records).toEqual([]);
    expect(modeledInconclusive.filteredEvidenceStateSummary?.plainLanguageSummary).toBe(
      'No candidates are in this view. No performance gates were evaluated.',
    );
    expect(modeledInconclusive.resultView).toMatchObject({
      status: 'no-matches',
      recoveryAction: {
        href: '/api/admin/research-intake?page=1&limit=100',
      },
    });
  });

  it('combines with other filters, keeps pinned order, and exposes disjunctive counts', () => {
    const payload = view(
      'assetClass=Cryptocurrencies&evidenceStatus=modeled-historical-fail&limit=100',
    );

    expect(payload.records.map((record) => record.id)).toEqual([
      'how-to-design-a-simple-multi-timeframe-trend-strategy-on-bitcoin',
      'seasonality-trend-following-and-mean-reversion-in-bitcoin',
    ]);
    expect(payload.records.map((record) => record.sourcePosition)).toEqual([31, 33]);
    expect(payload.pagination.totalRecords).toBe(2);
    expect(statusCounts(payload.filteredEvidenceStateSummary)).toEqual([
      0, 0, 0, 0, 2, 0,
    ]);
    expect(payload.filteredEvidenceStateSummary?.plainLanguageSummary).toBe(
      '2 candidates: 2 modeled historical failures. Performance gates were evaluated for all 2 candidates.',
    );
    expect(
      payload.filterFacets.dimensions.evidenceStatus?.options.map((option) => option.count),
    ).toEqual([8, 3, 3, 0, 0, 2, 0]);
    expect(payload.filterNavigation).toMatchObject({
      activeFilterCount: 2,
      clearAllHref: '/api/admin/research-intake?page=1&limit=100',
      activeFilters: [
        {
          parameter: 'assetClass',
          removeHref:
            '/api/admin/research-intake?evidenceStatus=modeled-historical-fail&page=1&limit=100',
        },
        {
          parameter: 'evidenceStatus',
          removeHref:
            '/api/admin/research-intake?assetClass=Cryptocurrencies&page=1&limit=100',
        },
      ],
    });
  });
});

export type ApiUsageScope = 'signals' | 'leaderboard' | 'screener';

export interface ApiUsageScopeRow {
  name: string;
  path: string;
  scope: ApiUsageScope;
  enabled: boolean;
  helperText: string;
}

const SCOPE_ACCESS_MATRIX: Array<Pick<ApiUsageScopeRow, 'name' | 'path' | 'scope' | 'helperText'>> = [
  {
    name: 'Signals',
    path: '/api/v1/signals',
    scope: 'signals',
    helperText: 'Live signal feed and historical lookups for trading integrations.',
  },
  {
    name: 'Leaderboard',
    path: '/api/v1/leaderboard',
    scope: 'leaderboard',
    helperText: 'Public performance and track-record surfaces for proof-first apps.',
  },
  {
    name: 'Screener',
    path: '/api/v1/screener',
    scope: 'screener',
    helperText: 'Higher-conviction scan surface for traders filtering setups programmatically.',
  },
];

export function buildScopeAccessRows(scopes: readonly string[] | undefined): ApiUsageScopeRow[] {
  const enabledScopes = new Set(scopes ?? []);

  return SCOPE_ACCESS_MATRIX.map((row) => ({
    ...row,
    enabled: enabledScopes.has(row.scope),
  }));
}

export function getUsageAccessSummary(scopes: readonly string[] | undefined): {
  enabledCount: number;
  totalCount: number;
  allEnabled: boolean;
} {
  const rows = buildScopeAccessRows(scopes);
  const enabledCount = rows.filter((row) => row.enabled).length;

  return {
    enabledCount,
    totalCount: rows.length,
    allEnabled: enabledCount === rows.length,
  };
}
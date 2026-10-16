export type RecostAssetClass = 'crypto' | 'metals' | 'fx' | 'stocks/cmdty';
export type RecostBand = 'all' | 'standard' | 'premium';

export interface RecostCellStats {
  n: number;
  winRatePct: number;
  grossExpectancyR: number;
  netExpectancyR: number;
  avgCostR: number;
  netReturnPct: number;
  maxDrawdownPct: number;
  conclusive: boolean;
}

export type RecostCellResult = {
  assetClass: RecostAssetClass;
  band: RecostBand;
} & RecostCellStats;

export interface RecostJsonReport {
  window: number | null;
  minN: number;
  all: RecostCellStats;
  cells: RecostCellResult[];
}

const RECOST_ASSET_CLASSES: readonly RecostAssetClass[] = ['crypto', 'metals', 'fx', 'stocks/cmdty'];
const RECOST_BANDS: readonly RecostBand[] = ['all', 'standard', 'premium'];

function renderReportValue(value: unknown): string {
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertValidJsonReportWindow(window: number | null): void {
  if (window !== null && (!Number.isSafeInteger(window) || window <= 0)) {
    throw new Error(`Invalid recost JSON report window: expected null or a positive safe integer, got ${String(window)}.`);
  }
}

function assertValidJsonReportMinN(minN: number): void {
  if (!Number.isSafeInteger(minN) || minN <= 0) {
    throw new Error(`Invalid recost JSON report minN: expected a positive safe integer, got ${String(minN)}.`);
  }
}

function assertNonNegativeSafeInteger(field: string, value: unknown): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`Invalid recost JSON report ${field}: expected a non-negative safe integer, got ${renderReportValue(value)}.`);
  }
}

function assertFinitePercentage(field: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid recost JSON report ${field}: expected a finite percentage between 0 and 100, got ${renderReportValue(value)}.`);
  }
}

function assertFiniteNumber(field: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid recost JSON report ${field}: expected a finite number, got ${renderReportValue(value)}.`);
  }
}

function assertFiniteNonNegativeNumber(field: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid recost JSON report ${field}: expected a finite non-negative number, got ${renderReportValue(value)}.`);
  }
}

function assertBoolean(field: string, value: unknown): void {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid recost JSON report ${field}: expected a boolean, got ${renderReportValue(value)}.`);
  }
}

function assertValidJsonReportStats(field: string, stats: unknown): asserts stats is RecostCellStats {
  if (!isRecord(stats)) {
    throw new Error(`Invalid recost JSON report ${field}: expected an object, got ${renderReportValue(stats)}.`);
  }

  assertNonNegativeSafeInteger(`${field}.n`, stats.n);
  assertFinitePercentage(`${field}.winRatePct`, stats.winRatePct);
  assertFiniteNumber(`${field}.grossExpectancyR`, stats.grossExpectancyR);
  assertFiniteNumber(`${field}.netExpectancyR`, stats.netExpectancyR);
  assertFiniteNonNegativeNumber(`${field}.avgCostR`, stats.avgCostR);
  assertFiniteNumber(`${field}.netReturnPct`, stats.netReturnPct);
  assertFiniteNonNegativeNumber(`${field}.maxDrawdownPct`, stats.maxDrawdownPct);
  assertBoolean(`${field}.conclusive`, stats.conclusive);
}

function assertKnownValue<T extends string>(field: string, value: unknown, allowedValues: readonly T[]): asserts value is T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new Error(`Invalid recost JSON report ${field}: expected one of ${allowedValues.join(', ')}, got ${renderReportValue(value)}.`);
  }
}

function assertValidJsonReportCell(index: number, cell: unknown): asserts cell is RecostCellResult {
  if (!isRecord(cell)) {
    throw new Error(`Invalid recost JSON report cell[${index}]: expected an object, got ${renderReportValue(cell)}.`);
  }

  assertKnownValue(`cell[${index}].assetClass`, cell.assetClass, RECOST_ASSET_CLASSES);
  assertKnownValue(`cell[${index}].band`, cell.band, RECOST_BANDS);
  assertValidJsonReportStats(`cell[${index}]`, cell);
}

function assertValidJsonReportCells(cells: unknown): asserts cells is RecostCellResult[] {
  if (!Array.isArray(cells)) {
    throw new Error(`Invalid recost JSON report cells: expected an array, got ${renderReportValue(cells)}.`);
  }

  const seenKeys = new Set<string>();
  cells.forEach((cell, index) => {
    assertValidJsonReportCell(index, cell);
    const key = `${cell.assetClass}/${cell.band}`;
    if (seenKeys.has(key)) {
      throw new Error(`Invalid recost JSON report cells: duplicate ${key} cell at index ${index}.`);
    }
    seenKeys.add(key);
  });
}

export function buildRecostJsonReport({
  window,
  minN,
  all,
  cells,
}: RecostJsonReport): RecostJsonReport {
  assertValidJsonReportWindow(window);
  assertValidJsonReportMinN(minN);
  assertValidJsonReportStats('all', all);
  assertValidJsonReportCells(cells);
  return { window, minN, all, cells };
}

function assertPositiveFiniteCostOption(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid recost cost reality ${name}: expected a positive finite number, got ${String(value)}.`);
  }
}

export function formatRecostCostRealityLines(
  all: Pick<RecostCellStats, 'grossExpectancyR' | 'netExpectancyR' | 'avgCostR' | 'netReturnPct' | 'maxDrawdownPct'>,
  options: { legacyFlatCostPct?: number; riskPerTradePct?: number } = {},
): string[] {
  const legacyFlatCostPct = options.legacyFlatCostPct ?? 0.02;
  const riskPerTradePct = options.riskPerTradePct ?? 1.0;
  assertPositiveFiniteCostOption('legacyFlatCostPct', legacyFlatCostPct);
  assertPositiveFiniteCostOption('riskPerTradePct', riskPerTradePct);
  const legacyFlatCostR = legacyFlatCostPct / riskPerTradePct;
  const realToLegacyRatio = all.avgCostR / legacyFlatCostR;

  return [
    'Cost reality check (ALL symbols, ALL band):',
    `  legacy flat-cost baseline : ${legacyFlatCostR.toFixed(4)} R/trade  (${legacyFlatCostPct.toFixed(2)}% equity; pre-real-cost curve baseline)`,
    `  REAL avg cost             : ${all.avgCostR.toFixed(4)} R/trade  (${realToLegacyRatio.toFixed(1)}x the legacy flat baseline)`,
    `  gross expectancy          : ${all.grossExpectancyR.toFixed(4)} R/trade`,
    `  NET expectancy            : ${all.netExpectancyR.toFixed(4)} R/trade  ${all.netExpectancyR > 0 ? 'POSITIVE' : 'negative'}`,
    `  net return / maxDD        : ${all.netReturnPct}% / -${all.maxDrawdownPct}%`,
  ];
}

function isValidRecostCellForVerdict(cell: RecostCellResult): boolean {
  return (
    Number.isSafeInteger(cell.n) &&
    cell.n > 0 &&
    Number.isFinite(cell.winRatePct) &&
    cell.winRatePct >= 0 &&
    cell.winRatePct <= 100 &&
    Number.isFinite(cell.grossExpectancyR) &&
    Number.isFinite(cell.netExpectancyR) &&
    Number.isFinite(cell.avgCostR) &&
    cell.avgCostR >= 0 &&
    Number.isFinite(cell.netReturnPct) &&
    Number.isFinite(cell.maxDrawdownPct) &&
    cell.maxDrawdownPct >= 0
  );
}

export function getClearingRecostCells(cells: RecostCellResult[]): RecostCellResult[] {
  return cells
    .filter(cell => cell.conclusive && isValidRecostCellForVerdict(cell) && cell.netExpectancyR > 0)
    .sort(
      (a, b) =>
        b.netExpectancyR - a.netExpectancyR ||
        b.n - a.n ||
        a.assetClass.localeCompare(b.assetClass) ||
        a.band.localeCompare(b.band),
    );
}

function assertValidVerdictMinN(minN: number): void {
  if (!Number.isSafeInteger(minN) || minN <= 0) {
    throw new Error(`Invalid recost verdict minN: expected a positive safe integer, got ${String(minN)}.`);
  }
}

export function formatRecostVerdictLines(cells: RecostCellResult[], minN: number): string[] {
  assertValidVerdictMinN(minN);
  const survivors = getClearingRecostCells(cells).filter(cell => cell.n >= minN);
  if (survivors.length === 0) {
    return [
      'No asset-class x band cell clears its own cost at n >= ' + minN + '.',
      'Selectivity does not rescue net edge at real cost — escalate to a different edge source.',
    ];
  }

  return [
    'Subsets that CLEAR their real cost (net-positive, n >= ' + minN + '):',
    ...survivors.map(
      s =>
        `  ${s.assetClass}/${s.band}: net ${s.netExpectancyR.toFixed(4)} R/trade, n=${s.n}, win ${s.winRatePct}%, netRet ${s.netReturnPct}%`,
    ),
  ];
}

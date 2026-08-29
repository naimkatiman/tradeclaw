/**
 * Pure deterministic assembly for TC-257's preregistered month-end Treasury
 * replication. This module has no file, network, clock, environment, database,
 * signal, or execution access.
 */

import crypto from 'crypto';

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;
const FINANCING_YEAR_DAYS = 360;
const FOLD_COUNT = 4;
const ONE_SIDED_5_PERCENT_T = 1.645;
const HEADLINE_ROUND_TRIP_COST = 0.0005;
const STRESS_ROUND_TRIP_COST = 0.001;
const STRESS_FINANCING_SPREAD_PCT = 1;
const YIELD_QA_TOLERANCE_PCT = 0.0001;

export const END_OF_MONTH_TREASURY_TASK = 'TC-257' as const;
export const END_OF_MONTH_TREASURY_PREREGISTRATION_SHA256 =
  '4e3d9ed5392aa9cbe8eed9865483f583a31336c6cc770e9773230f4fe829b3de';
export const END_OF_MONTH_TREASURY_SOURCE_AUDIT_SHA256 =
  '3df7f04b4ef3d94a1fe245bf61262f7cfe41dc2582bdb748162ee1dbb086c127';
export const END_OF_MONTH_TREASURY_EXPECTED_SHA256 = {
  nominal: '4fab6cf297594f77f6e1ccfa4fbd099b4eb17dc407c9611a488039da33c2c41f',
  financing: 'ea8b35582a3f88cc0a0d42ae94addc3d85aaf008d4bb574246dd8a83780db600',
  dollar: 'a3ac96e8eb53625936eb7fd9d14e181c10308ca1831db6ee0b58b35fdfafdb47',
} as const;

const NOMINAL_HEADER = [
  'Date',
  'BETA0',
  'BETA1',
  'BETA2',
  'BETA3',
  'TAU1',
  'TAU2',
  'SVENY01',
  'SVENY05',
  'SVENY10',
] as const;

export interface CurvePoint {
  date: string;
  beta0: number;
  beta1: number;
  beta2: number;
  beta3: number;
  tau1: number;
  tau2: number;
  suppliedYield1Pct: number;
  suppliedYield5Pct: number;
  suppliedYield10Pct: number;
}

export interface RatePoint {
  date: string;
  value: number;
}

export interface EndOfMonthTreasuryFrozenInput {
  nominalText: string;
  financingText: string;
  dollarText: string;
}

export interface MonthSchedule {
  month: string;
  previousMonthEnd: CurvePoint;
  firstEntry: CurvePoint;
  firstExit: CurvePoint;
  monthEndEntry: CurvePoint;
  monthEndExit: CurvePoint;
}

export interface CurveTradeObservation {
  month: string;
  entryDate: string;
  exitDate: string;
  initialMaturityYears: number;
  exitMaturityYears: number;
  calendarDays: number;
  priceLogReturn: number;
  headlineFinancingLog: number;
  stressFinancingLog: number;
  preFrictionExcessLog: number;
  headlineNetLog: number;
  stressNetLog: number;
}

export interface SeriesObservation {
  month: string;
  value: number;
}

export interface SeriesMetrics {
  observations: number;
  fromMonth: string;
  toMonth: string;
  mean: number;
  sampleStandardDeviation: number;
  tStatistic: number;
  annualizedSharpe: number;
  compoundedReturn: number;
  positiveFraction: number;
  maximumDrawdown: number;
}

export interface CurveTradeMetrics {
  observations: number;
  fromMonth: string;
  toMonth: string;
  meanCalendarDays: number;
  meanPriceLogReturn: number;
  meanHeadlineFinancingLog: number;
  meanStressFinancingLog: number;
  meanPreFrictionExcessLog: number;
  meanHeadlineNetLog: number;
  meanStressNetLog: number;
  preFrictionTStatistic: number;
  headlineTStatistic: number;
  stressTStatistic: number;
  preFrictionAnnualizedSharpe: number;
  headlineAnnualizedSharpe: number;
  stressAnnualizedSharpe: number;
  preFrictionCompoundedReturn: number;
  headlineCompoundedReturn: number;
  stressCompoundedReturn: number;
  headlinePositiveFraction: number;
  stressPositiveFraction: number;
  headlineMaximumDrawdown: number;
  stressMaximumDrawdown: number;
  breakEvenRoundTripCostBps: number;
}

export interface FoldReceipt<TMetrics> {
  fold: number;
  fromMonth: string;
  toMonth: string;
  metrics: TMetrics;
}

export interface CurveLaneResult {
  full: CurveTradeMetrics;
  paperWindow: CurveTradeMetrics;
  holdout: CurveTradeMetrics;
  folds: Array<FoldReceipt<CurveTradeMetrics>>;
}

export interface PairedLaneResult {
  full: SeriesMetrics;
  paperWindow: SeriesMetrics;
  holdout: SeriesMetrics;
  folds: Array<FoldReceipt<SeriesMetrics>>;
}

export interface DollarControlResult {
  observations: number;
  firstWindow: SeriesMetrics;
  monthEndWindow: SeriesMetrics;
  pairedActive: SeriesMetrics;
  holdoutPairedActive: SeriesMetrics;
  folds: Array<FoldReceipt<SeriesMetrics>>;
}

export interface DecisionInputs {
  qaPassed: boolean;
  fiveYear: CurveLaneResult;
  tenYear: CurveLaneResult;
  oneYear: CurveLaneResult;
  allOtherDays: CurveLaneResult;
  pairedPrimaryMinusFirst: PairedLaneResult;
  dollarControl: DollarControlResult;
}

export interface EndOfMonthTreasuryDecision {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  performanceGatesEvaluated: boolean;
  gates: {
    qaPassed: boolean;
    fiveYearPaperNetPositiveAndSignificant: boolean;
    fiveYearFullAndHoldoutNetPositive: boolean;
    fiveYearPositiveFolds: boolean;
    fiveYearStressPositive: boolean;
    fiveYearBreakEvenClearsHeadlineCost: boolean;
    fiveYearSharpeBeatsAllOtherDays: boolean;
    pairedCalendarSpecificity: boolean;
    tenYearConfirmation: boolean;
    durationOrdering: boolean;
    externalDollarNotFalsified: boolean;
  };
  fiveYearPositiveFoldCount: number;
  dollarPositiveFoldCount: number;
  externalDollarFalsified: boolean;
  failedCoreGates: string[];
  qaFailureReasons: string[];
  eligibleForProspectiveReview: boolean;
  activationApproved: false;
  publicationApproved: false;
  allocationApproved: false;
  executionApproved: false;
}

export interface EndOfMonthTreasuryArtifact {
  schemaVersion: 1;
  meta: {
    task: 'TC-257';
    studyDate: '2026-08-29';
    candidateId: 'predictable-end-of-month-treasury-returns';
    catalogCommit: string;
    preregistrationPath: string;
    preregistrationSha256: string;
    sourceAuditPath: string;
    sourceAuditSha256: string;
    evidenceBasis: 'modeled-current-vintage-independent-replication';
  };
  sources: {
    nominal: { path: string; sha256: string; completeSourceSha256: string };
    financing: { path: string; sha256: string; proxyFor: 'general-collateral-repo' };
    dollar: { path: string; sha256: string; rawExportSha256: string };
  };
  spec: {
    evaluationWindow: string;
    paperWindow: string;
    holdoutWindow: string;
    maturitiesYears: readonly [1, 5, 10];
    finalTradingIntervals: 2;
    folds: 4;
    headlineRoundTripCostBps: 5;
    stressRoundTripCostBps: 10;
    stressFinancingSpreadBpsAnnual: 100;
    financingProxy: 'DFF';
    priceModel: 'Svensson continuously-compounded zero-coupon discount function';
  };
  qa: {
    nominalRows: number;
    financingRows: number;
    dollarRows: number;
    evaluationMonths: number;
    paperWindowMonths: number;
    holdoutMonths: number;
    externalControlMonths: number;
    externalControlHoldoutMonths: number;
    minimumCurveDaysPerMonth: number;
    maximumCurveDaysPerMonth: number;
    suppliedYieldChecks: number;
    suppliedYieldChecksAboveTolerance: number;
    maximumSuppliedYieldErrorPct: number;
    maximumSuppliedYieldError: {
      date: string;
      maturityYears: number;
      reconstructedYieldPct: number;
      suppliedYieldPct: number;
      absoluteErrorPct: number;
    };
    hashesPassed: boolean;
    strictDatesPassed: boolean;
    financingContinuityPassed: boolean;
    suppliedYieldReconstructionPassed: boolean;
    countsPassed: boolean;
    passed: boolean;
  };
  results: {
    fiveYearMonthEnd: CurveLaneResult;
    tenYearMonthEnd: CurveLaneResult;
    oneYearMonthEnd: CurveLaneResult;
    fiveYearFirstWindowPlacebo: CurveLaneResult;
    fiveYearAllOtherDays: CurveLaneResult;
    pairedFiveYearMonthEndMinusFirstWindow: PairedLaneResult;
    broadDollarControl: DollarControlResult;
  } | null;
  observations: {
    fiveYearMonthEnd: CurveTradeObservation[];
    tenYearMonthEnd: CurveTradeObservation[];
    oneYearMonthEnd: CurveTradeObservation[];
    fiveYearFirstWindowPlacebo: CurveTradeObservation[];
    fiveYearAllOtherDays: CurveTradeObservation[];
    broadDollar: Array<{
      month: string;
      firstWindowLogReturn: number;
      monthEndLogReturn: number;
      pairedActiveLogReturn: number;
    }>;
  } | null;
  decision: EndOfMonthTreasuryDecision;
  limitations: string[];
}

function round(value: number, digits = 12): number {
  return Number(value.toFixed(digits));
}

function deepRound<T>(value: T): T {
  if (typeof value === 'number') return round(value) as T;
  if (Array.isArray(value)) return value.map((item) => deepRound(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepRound(item)]),
    ) as T;
  }
  return value;
}

export function canonicalizeResearchText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function canonicalResearchSha256(text: string): string {
  return crypto.createHash('sha256').update(canonicalizeResearchText(text), 'utf8').digest('hex');
}

function requireFrozenHash(text: string, expected: string, label: string): void {
  const actual = canonicalResearchSha256(text);
  if (actual !== expected) {
    throw new Error(`${label} canonical SHA-256 mismatch: expected ${expected}, received ${actual}`);
  }
}

function timestamp(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`invalid ISO date: ${date}`);
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) {
    throw new Error(`invalid calendar date: ${date}`);
  }
  return value;
}

function calendarDays(from: string, to: string): number {
  const days = (timestamp(to) - timestamp(from)) / DAY_MS;
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error(`date range must span positive whole calendar days: ${from}/${to}`);
  }
  return days;
}

function strictRows(text: string, expectedHeader: string): string[][] {
  const canonical = canonicalizeResearchText(text);
  if (!canonical.endsWith('\n')) throw new Error('frozen CSV must end with one newline');
  const lines = canonical.slice(0, -1).split('\n');
  if (lines[0] !== expectedHeader) {
    throw new Error(`frozen CSV header mismatch: expected ${expectedHeader}`);
  }
  return lines.slice(1).map((line, index) => {
    if (!line || line.includes('"')) throw new Error(`frozen CSV row ${index + 2} is malformed`);
    return line.split(',');
  });
}

function finite(value: string, label: string): number {
  if (value.trim() !== value || value === '') throw new Error(`${label} is empty or padded`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be finite`);
  return parsed;
}

export function parseNominalCurveCsv(text: string): CurvePoint[] {
  const rows = strictRows(text, NOMINAL_HEADER.join(','));
  let previous = '';
  return rows.map((cells, index) => {
    if (cells.length !== NOMINAL_HEADER.length) {
      throw new Error(`nominal row ${index + 2} must have ${NOMINAL_HEADER.length} fields`);
    }
    const date = cells[0];
    timestamp(date);
    if (date <= previous) throw new Error(`nominal dates are not strictly increasing at ${date}`);
    previous = date;
    const values = cells.slice(1).map((value, valueIndex) => (
      finite(value, `nominal ${date} ${NOMINAL_HEADER[valueIndex + 1]}`)
    ));
    const [beta0, beta1, beta2, beta3, tau1, tau2, supplied1, supplied5, supplied10] = values;
    if (tau1 <= 0 || tau2 <= 0) throw new Error(`nominal taus must be positive at ${date}`);
    return {
      date,
      beta0,
      beta1,
      beta2,
      beta3,
      tau1,
      tau2,
      suppliedYield1Pct: supplied1,
      suppliedYield5Pct: supplied5,
      suppliedYield10Pct: supplied10,
    };
  });
}

export function parseRateCsv(text: string, mnemonic: 'DFF' | 'DTWEXBGS'): RatePoint[] {
  const rows = strictRows(text, `observation_date,${mnemonic}`);
  let previous = '';
  return rows.map((cells, index) => {
    if (cells.length !== 2) throw new Error(`${mnemonic} row ${index + 2} must have 2 fields`);
    const [date, rawValue] = cells;
    timestamp(date);
    if (date <= previous) throw new Error(`${mnemonic} dates are not strictly increasing at ${date}`);
    previous = date;
    const value = finite(rawValue, `${mnemonic} ${date}`);
    if (mnemonic === 'DTWEXBGS' && value <= 0) throw new Error(`${mnemonic} must be positive at ${date}`);
    return { date, value };
  });
}

function svenssonLoading(x: number): number {
  if (!Number.isFinite(x) || x <= 0) throw new Error('Svensson loading requires positive x');
  return -Math.expm1(-x) / x;
}

export function svenssonZeroCouponYieldPct(point: CurvePoint, maturityYears: number): number {
  if (!Number.isFinite(maturityYears) || maturityYears <= 0) {
    throw new Error('zero-coupon maturity must be positive');
  }
  const x1 = maturityYears / point.tau1;
  const x2 = maturityYears / point.tau2;
  const a1 = svenssonLoading(x1);
  const a2 = svenssonLoading(x2);
  const yieldPct = point.beta0
    + point.beta1 * a1
    + point.beta2 * (a1 - Math.exp(-x1))
    + point.beta3 * (a2 - Math.exp(-x2));
  if (!Number.isFinite(yieldPct)) throw new Error(`non-finite Svensson yield at ${point.date}`);
  return yieldPct;
}

export function zeroCouponDiscountPrice(point: CurvePoint, maturityYears: number): number {
  const yieldPct = svenssonZeroCouponYieldPct(point, maturityYears);
  const price = Math.exp(-(yieldPct / 100) * maturityYears);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`invalid zero-coupon price at ${point.date}`);
  }
  return price;
}

function previousMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const value = new Date(Date.UTC(year, monthNumber - 2, 1));
  return value.toISOString().slice(0, 7);
}

function expectedMonthKeys(from: string, to: string): string[] {
  const values: string[] = [];
  let cursor = `${from}-01`;
  while (cursor.slice(0, 7) <= to) {
    values.push(cursor.slice(0, 7));
    const date = new Date(timestamp(cursor));
    date.setUTCMonth(date.getUTCMonth() + 1);
    cursor = date.toISOString().slice(0, 10);
  }
  return values;
}

export function buildMonthSchedules(points: CurvePoint[]): MonthSchedule[] {
  const grouped = new Map<string, CurvePoint[]>();
  for (const point of points) {
    const month = point.date.slice(0, 7);
    const group = grouped.get(month) ?? [];
    group.push(point);
    grouped.set(month, group);
  }

  const evaluationMonths = expectedMonthKeys('1990-01', '2026-07');
  return evaluationMonths.map((month) => {
    const rows = grouped.get(month);
    const previousRows = grouped.get(previousMonth(month));
    if (!rows || rows.length < 3) throw new Error(`month ${month} has fewer than 3 curve rows`);
    if (!previousRows || previousRows.length === 0) {
      throw new Error(`month ${month} is missing its previous-month buffer`);
    }
    return {
      month,
      previousMonthEnd: previousRows.at(-1)!,
      firstEntry: rows[0],
      firstExit: rows[2],
      monthEndEntry: rows.at(-3)!,
      monthEndExit: rows.at(-1)!,
    };
  });
}

function rateMap(points: RatePoint[]): Map<string, number> {
  return new Map(points.map((point) => [point.date, point.value]));
}

function financingLog(
  from: string,
  to: string,
  financing: ReadonlyMap<string, number>,
  annualSpreadPct: number,
): number {
  let sum = 0;
  for (let cursor = timestamp(from); cursor < timestamp(to); cursor += DAY_MS) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const ratePct = financing.get(date);
    if (ratePct === undefined) throw new Error(`financing is missing ${date}`);
    sum += ((ratePct + annualSpreadPct) / 100) / FINANCING_YEAR_DAYS;
  }
  return sum;
}

export function simulateCurveTrade(
  month: string,
  entry: CurvePoint,
  exit: CurvePoint,
  initialMaturityYears: number,
  financing: ReadonlyMap<string, number>,
): CurveTradeObservation {
  const days = calendarDays(entry.date, exit.date);
  const exitMaturityYears = initialMaturityYears - days / YEAR_DAYS;
  if (exitMaturityYears <= 0) throw new Error(`trade maturity expires in ${month}`);
  const entryPrice = zeroCouponDiscountPrice(entry, initialMaturityYears);
  const exitPrice = zeroCouponDiscountPrice(exit, exitMaturityYears);
  const priceLogReturn = Math.log(exitPrice / entryPrice);
  const headlineFinancingLog = financingLog(entry.date, exit.date, financing, 0);
  const stressFinancingLog = financingLog(
    entry.date,
    exit.date,
    financing,
    STRESS_FINANCING_SPREAD_PCT,
  );
  const preFrictionExcessLog = priceLogReturn - headlineFinancingLog;
  const headlineNetLog = preFrictionExcessLog + Math.log1p(-HEADLINE_ROUND_TRIP_COST);
  const stressNetLog = priceLogReturn - stressFinancingLog
    + Math.log1p(-STRESS_ROUND_TRIP_COST);
  return {
    month,
    entryDate: entry.date,
    exitDate: exit.date,
    initialMaturityYears,
    exitMaturityYears,
    calendarDays: days,
    priceLogReturn,
    headlineFinancingLog,
    stressFinancingLog,
    preFrictionExcessLog,
    headlineNetLog,
    stressNetLog,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) throw new Error('cannot summarize an empty series');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) throw new Error('series requires at least two observations');
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1),
  );
}

function maximumDrawdown(logReturns: number[]): number {
  let wealth = 1;
  let peak = 1;
  let maximum = 0;
  for (const value of logReturns) {
    wealth *= Math.exp(value);
    peak = Math.max(peak, wealth);
    maximum = Math.max(maximum, 1 - wealth / peak);
  }
  return maximum;
}

export function summarizeSeries(rows: SeriesObservation[]): SeriesMetrics {
  if (rows.length < 2) throw new Error('series summary requires at least two rows');
  const values = rows.map((row) => row.value);
  const average = mean(values);
  const deviation = sampleStandardDeviation(values);
  if (deviation === 0) throw new Error('series standard deviation must be positive');
  return {
    observations: rows.length,
    fromMonth: rows[0].month,
    toMonth: rows.at(-1)!.month,
    mean: average,
    sampleStandardDeviation: deviation,
    tStatistic: average / (deviation / Math.sqrt(rows.length)),
    annualizedSharpe: Math.sqrt(12) * average / deviation,
    compoundedReturn: Math.exp(values.reduce((sum, value) => sum + value, 0)) - 1,
    positiveFraction: values.filter((value) => value > 0).length / values.length,
    maximumDrawdown: maximumDrawdown(values),
  };
}

export function summarizeCurveTrades(rows: CurveTradeObservation[]): CurveTradeMetrics {
  if (rows.length < 2) throw new Error('curve-trade summary requires at least two rows');
  const preFriction = rows.map((row) => row.preFrictionExcessLog);
  const headline = rows.map((row) => row.headlineNetLog);
  const stress = rows.map((row) => row.stressNetLog);
  const preFrictionDeviation = sampleStandardDeviation(preFriction);
  const headlineDeviation = sampleStandardDeviation(headline);
  const stressDeviation = sampleStandardDeviation(stress);
  if (preFrictionDeviation === 0 || headlineDeviation === 0 || stressDeviation === 0) {
    throw new Error('curve-trade standard deviation must be positive');
  }
  const meanPreFriction = mean(preFriction);
  const meanHeadline = mean(headline);
  const meanStress = mean(stress);
  return {
    observations: rows.length,
    fromMonth: rows[0].month,
    toMonth: rows.at(-1)!.month,
    meanCalendarDays: mean(rows.map((row) => row.calendarDays)),
    meanPriceLogReturn: mean(rows.map((row) => row.priceLogReturn)),
    meanHeadlineFinancingLog: mean(rows.map((row) => row.headlineFinancingLog)),
    meanStressFinancingLog: mean(rows.map((row) => row.stressFinancingLog)),
    meanPreFrictionExcessLog: meanPreFriction,
    meanHeadlineNetLog: meanHeadline,
    meanStressNetLog: meanStress,
    preFrictionTStatistic: meanPreFriction / (preFrictionDeviation / Math.sqrt(rows.length)),
    headlineTStatistic: meanHeadline / (headlineDeviation / Math.sqrt(rows.length)),
    stressTStatistic: meanStress / (stressDeviation / Math.sqrt(rows.length)),
    preFrictionAnnualizedSharpe: Math.sqrt(12) * meanPreFriction / preFrictionDeviation,
    headlineAnnualizedSharpe: Math.sqrt(12) * meanHeadline / headlineDeviation,
    stressAnnualizedSharpe: Math.sqrt(12) * meanStress / stressDeviation,
    preFrictionCompoundedReturn: Math.exp(preFriction.reduce((sum, value) => sum + value, 0)) - 1,
    headlineCompoundedReturn: Math.exp(headline.reduce((sum, value) => sum + value, 0)) - 1,
    stressCompoundedReturn: Math.exp(stress.reduce((sum, value) => sum + value, 0)) - 1,
    headlinePositiveFraction: headline.filter((value) => value > 0).length / headline.length,
    stressPositiveFraction: stress.filter((value) => value > 0).length / stress.length,
    headlineMaximumDrawdown: maximumDrawdown(headline),
    stressMaximumDrawdown: maximumDrawdown(stress),
    breakEvenRoundTripCostBps: (1 - Math.exp(-meanPreFriction)) * 10_000,
  };
}

export function equalChronologicalFolds<T extends { month: string }>(rows: T[]): T[][] {
  if (rows.length < FOLD_COUNT) throw new Error('not enough observations for four folds');
  return Array.from({ length: FOLD_COUNT }, (_value, index) => (
    rows.slice(
      Math.floor(index * rows.length / FOLD_COUNT),
      Math.floor((index + 1) * rows.length / FOLD_COUNT),
    )
  ));
}

function curveLane(rows: CurveTradeObservation[]): CurveLaneResult {
  const paper = rows.filter((row) => row.month <= '2018-12');
  const holdout = rows.filter((row) => row.month >= '2019-01');
  return {
    full: summarizeCurveTrades(rows),
    paperWindow: summarizeCurveTrades(paper),
    holdout: summarizeCurveTrades(holdout),
    folds: equalChronologicalFolds(rows).map((fold, index) => ({
      fold: index + 1,
      fromMonth: fold[0].month,
      toMonth: fold.at(-1)!.month,
      metrics: summarizeCurveTrades(fold),
    })),
  };
}

function pairedLane(rows: SeriesObservation[]): PairedLaneResult {
  const paper = rows.filter((row) => row.month <= '2018-12');
  const holdout = rows.filter((row) => row.month >= '2019-01');
  return {
    full: summarizeSeries(rows),
    paperWindow: summarizeSeries(paper),
    holdout: summarizeSeries(holdout),
    folds: equalChronologicalFolds(rows).map((fold, index) => ({
      fold: index + 1,
      fromMonth: fold[0].month,
      toMonth: fold.at(-1)!.month,
      metrics: summarizeSeries(fold),
    })),
  };
}

function requireFiniteMetrics(values: unknown, path = 'metrics'): void {
  if (typeof values === 'number' && !Number.isFinite(values)) {
    throw new Error(`${path} contains a non-finite number`);
  }
  if (Array.isArray(values)) {
    values.forEach((value, index) => requireFiniteMetrics(value, `${path}[${index}]`));
  } else if (values !== null && typeof values === 'object') {
    Object.entries(values).forEach(([key, value]) => requireFiniteMetrics(value, `${path}.${key}`));
  }
}

export function decideEndOfMonthTreasuryReplication(
  input: DecisionInputs,
): EndOfMonthTreasuryDecision {
  if (!input.qaPassed) {
    return qaFailureDecision(['standing source/data QA did not pass']);
  }
  const fiveYearPositiveFoldCount = input.fiveYear.folds.filter(
    (fold) => fold.metrics.meanHeadlineNetLog > 0,
  ).length;
  const dollarPositiveFoldCount = input.dollarControl.folds.filter(
    (fold) => fold.metrics.mean > 0,
  ).length;
  const externalDollarFalsified = input.dollarControl.pairedActive.mean > 0
    && input.dollarControl.pairedActive.tStatistic >= ONE_SIDED_5_PERCENT_T
    && dollarPositiveFoldCount >= 3;

  const gates = {
    qaPassed: input.qaPassed,
    fiveYearPaperNetPositiveAndSignificant:
      input.fiveYear.paperWindow.meanHeadlineNetLog > 0
      && input.fiveYear.paperWindow.headlineTStatistic >= ONE_SIDED_5_PERCENT_T,
    fiveYearFullAndHoldoutNetPositive:
      input.fiveYear.full.meanHeadlineNetLog > 0
      && input.fiveYear.holdout.meanHeadlineNetLog > 0,
    fiveYearPositiveFolds: fiveYearPositiveFoldCount >= 3,
    fiveYearStressPositive: input.fiveYear.full.meanStressNetLog > 0,
    fiveYearBreakEvenClearsHeadlineCost:
      input.fiveYear.paperWindow.breakEvenRoundTripCostBps > 5
      && input.fiveYear.holdout.breakEvenRoundTripCostBps > 5,
    fiveYearSharpeBeatsAllOtherDays:
      input.fiveYear.paperWindow.headlineAnnualizedSharpe
      > input.allOtherDays.paperWindow.headlineAnnualizedSharpe,
    pairedCalendarSpecificity:
      input.pairedPrimaryMinusFirst.paperWindow.mean > 0
      && input.pairedPrimaryMinusFirst.paperWindow.tStatistic >= ONE_SIDED_5_PERCENT_T
      && input.pairedPrimaryMinusFirst.holdout.mean > 0,
    tenYearConfirmation:
      input.tenYear.paperWindow.meanHeadlineNetLog > 0
      && input.tenYear.paperWindow.headlineTStatistic >= ONE_SIDED_5_PERCENT_T
      && input.tenYear.holdout.meanHeadlineNetLog > 0,
    durationOrdering:
      input.tenYear.paperWindow.meanPreFrictionExcessLog
        > input.fiveYear.paperWindow.meanPreFrictionExcessLog
      && input.fiveYear.paperWindow.meanPreFrictionExcessLog
        > input.oneYear.paperWindow.meanPreFrictionExcessLog,
    externalDollarNotFalsified: !externalDollarFalsified,
  };

  const coreGateNames = [
    'fiveYearPaperNetPositiveAndSignificant',
    'fiveYearFullAndHoldoutNetPositive',
    'fiveYearPositiveFolds',
    'fiveYearStressPositive',
    'fiveYearBreakEvenClearsHeadlineCost',
    'fiveYearSharpeBeatsAllOtherDays',
    'pairedCalendarSpecificity',
    'tenYearConfirmation',
    'durationOrdering',
  ] as const;
  const failedCoreGates = coreGateNames.filter((name) => !gates[name]);
  const verdict = !gates.qaPassed
    ? 'INCONCLUSIVE'
    : failedCoreGates.length > 0
      ? 'FAIL'
      : externalDollarFalsified
        ? 'INCONCLUSIVE'
        : 'PASS';

  return {
    verdict,
    performanceGatesEvaluated: true,
    gates,
    fiveYearPositiveFoldCount,
    dollarPositiveFoldCount,
    externalDollarFalsified,
    failedCoreGates: [...failedCoreGates],
    qaFailureReasons: [],
    eligibleForProspectiveReview: verdict === 'PASS',
    activationApproved: false,
    publicationApproved: false,
    allocationApproved: false,
    executionApproved: false,
  };
}

function qaFailureDecision(reasons: string[]): EndOfMonthTreasuryDecision {
  return {
    verdict: 'INCONCLUSIVE',
    performanceGatesEvaluated: false,
    gates: {
      qaPassed: false,
      fiveYearPaperNetPositiveAndSignificant: false,
      fiveYearFullAndHoldoutNetPositive: false,
      fiveYearPositiveFolds: false,
      fiveYearStressPositive: false,
      fiveYearBreakEvenClearsHeadlineCost: false,
      fiveYearSharpeBeatsAllOtherDays: false,
      pairedCalendarSpecificity: false,
      tenYearConfirmation: false,
      durationOrdering: false,
      externalDollarNotFalsified: false,
    },
    fiveYearPositiveFoldCount: 0,
    dollarPositiveFoldCount: 0,
    externalDollarFalsified: false,
    failedCoreGates: [],
    qaFailureReasons: reasons,
    eligibleForProspectiveReview: false,
    activationApproved: false,
    publicationApproved: false,
    allocationApproved: false,
    executionApproved: false,
  };
}

function validateInputs(
  nominal: CurvePoint[],
  financing: RatePoint[],
  dollar: RatePoint[],
  schedules: MonthSchedule[],
): EndOfMonthTreasuryArtifact['qa'] {
  const groupedCounts = new Map<string, number>();
  for (const point of nominal.filter((point) => point.date >= '1990-01-01')) {
    const month = point.date.slice(0, 7);
    groupedCounts.set(month, (groupedCounts.get(month) ?? 0) + 1);
  }
  const counts = [...groupedCounts.values()];
  const suppliedPairs: Array<[CurvePoint, number, number]> = nominal.flatMap((point) => [
    [point, 1, point.suppliedYield1Pct],
    [point, 5, point.suppliedYield5Pct],
    [point, 10, point.suppliedYield10Pct],
  ] as Array<[CurvePoint, number, number]>);
  const suppliedYieldErrors = suppliedPairs.map(([point, maturity, supplied]) => {
    const reconstructed = svenssonZeroCouponYieldPct(point, maturity);
    return {
      date: point.date,
      maturityYears: maturity,
      reconstructedYieldPct: reconstructed,
      suppliedYieldPct: supplied,
      absoluteErrorPct: Math.abs(reconstructed - supplied),
    };
  });
  const maximumSuppliedYieldError = suppliedYieldErrors.reduce((maximum, current) => (
    current.absoluteErrorPct > maximum.absoluteErrorPct ? current : maximum
  ));
  const maximumSuppliedYieldErrorPct = maximumSuppliedYieldError.absoluteErrorPct;

  let financingContinuityPassed = financing.length === 13_392
    && financing[0]?.date === '1989-12-01'
    && financing.at(-1)?.date === '2026-07-31';
  for (let index = 1; index < financing.length; index++) {
    if (timestamp(financing[index].date) - timestamp(financing[index - 1].date) !== DAY_MS) {
      financingContinuityPassed = false;
      break;
    }
  }

  const countsPassed = nominal.length === 9_151
    && schedules.length === 439
    && schedules.filter((schedule) => schedule.month <= '2018-12').length === 348
    && schedules.filter((schedule) => schedule.month >= '2019-01').length === 91
    && dollar.length === 5_159
    && Math.min(...counts) === 17
    && Math.max(...counts) === 23;
  const suppliedYieldReconstructionPassed = maximumSuppliedYieldErrorPct
    <= YIELD_QA_TOLERANCE_PCT;
  const passed = financingContinuityPassed && countsPassed && suppliedYieldReconstructionPassed;
  return {
    nominalRows: nominal.length,
    financingRows: financing.length,
    dollarRows: dollar.length,
    evaluationMonths: schedules.length,
    paperWindowMonths: schedules.filter((schedule) => schedule.month <= '2018-12').length,
    holdoutMonths: schedules.filter((schedule) => schedule.month >= '2019-01').length,
    externalControlMonths: 0,
    externalControlHoldoutMonths: 0,
    minimumCurveDaysPerMonth: Math.min(...counts),
    maximumCurveDaysPerMonth: Math.max(...counts),
    suppliedYieldChecks: suppliedYieldErrors.length,
    suppliedYieldChecksAboveTolerance: suppliedYieldErrors.filter(
      (error) => error.absoluteErrorPct > YIELD_QA_TOLERANCE_PCT,
    ).length,
    maximumSuppliedYieldErrorPct,
    maximumSuppliedYieldError,
    hashesPassed: true,
    strictDatesPassed: true,
    financingContinuityPassed,
    suppliedYieldReconstructionPassed,
    countsPassed,
    passed,
  };
}

export function assembleEndOfMonthTreasuryReplication(
  input: EndOfMonthTreasuryFrozenInput,
): EndOfMonthTreasuryArtifact {
  requireFrozenHash(input.nominalText, END_OF_MONTH_TREASURY_EXPECTED_SHA256.nominal, 'nominal');
  requireFrozenHash(
    input.financingText,
    END_OF_MONTH_TREASURY_EXPECTED_SHA256.financing,
    'financing',
  );
  requireFrozenHash(input.dollarText, END_OF_MONTH_TREASURY_EXPECTED_SHA256.dollar, 'dollar');

  const nominal = parseNominalCurveCsv(input.nominalText);
  const financing = parseRateCsv(input.financingText, 'DFF');
  const dollar = parseRateCsv(input.dollarText, 'DTWEXBGS');
  const schedules = buildMonthSchedules(nominal);
  const financingByDate = rateMap(financing);
  const dollarByDate = rateMap(dollar);
  const qa = validateInputs(nominal, financing, dollar, schedules);

  const dollarEligibleSchedules = schedules.filter((schedule) => [
    schedule.firstEntry.date,
    schedule.firstExit.date,
    schedule.monthEndEntry.date,
    schedule.monthEndExit.date,
  ].every((date) => dollarByDate.has(date)));
  qa.externalControlMonths = dollarEligibleSchedules.length;
  qa.externalControlHoldoutMonths = dollarEligibleSchedules.filter(
    (schedule) => schedule.month >= '2019-01',
  ).length;
  qa.countsPassed = qa.countsPassed
    && qa.externalControlMonths === 243
    && qa.externalControlHoldoutMonths === 90;
  qa.passed = qa.passed && qa.countsPassed;

  const shared = {
    meta: {
      task: END_OF_MONTH_TREASURY_TASK,
      studyDate: '2026-08-29' as const,
      candidateId: 'predictable-end-of-month-treasury-returns' as const,
      catalogCommit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
      preregistrationPath: 'docs/plans/2026-08-29-end-of-month-treasury-replication.md',
      preregistrationSha256: END_OF_MONTH_TREASURY_PREREGISTRATION_SHA256,
      sourceAuditPath:
        'docs/research/2026-08-29-predictable-end-of-month-treasury-source-audit.md',
      sourceAuditSha256: END_OF_MONTH_TREASURY_SOURCE_AUDIT_SHA256,
      evidenceBasis: 'modeled-current-vintage-independent-replication' as const,
    },
    sources: {
      nominal: {
        path:
          'docs/research/data/end-of-month-treasury/fed-nominal-svensson-1989-12-01-2026-07-31.csv',
        sha256: END_OF_MONTH_TREASURY_EXPECTED_SHA256.nominal,
        completeSourceSha256:
          '877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7',
      },
      financing: {
        path: 'docs/research/data/end-of-month-treasury/DFF-1989-12-01-2026-07-31.csv',
        sha256: END_OF_MONTH_TREASURY_EXPECTED_SHA256.financing,
        proxyFor: 'general-collateral-repo' as const,
      },
      dollar: {
        path: 'docs/research/data/end-of-month-treasury/DTWEXBGS-2006-01-02-2026-07-31.csv',
        sha256: END_OF_MONTH_TREASURY_EXPECTED_SHA256.dollar,
        rawExportSha256:
          '88db7d787e99129e671015fcc581f3507d0a2c527804c285ab555c2b83cd8054',
      },
    },
    spec: {
      evaluationWindow: '1990-01/2026-07',
      paperWindow: '1990-01/2018-12',
      holdoutWindow: '2019-01/2026-07',
      maturitiesYears: [1, 5, 10] as const,
      finalTradingIntervals: 2 as const,
      folds: 4 as const,
      headlineRoundTripCostBps: 5 as const,
      stressRoundTripCostBps: 10 as const,
      stressFinancingSpreadBpsAnnual: 100 as const,
      financingProxy: 'DFF' as const,
      priceModel: 'Svensson continuously-compounded zero-coupon discount function' as const,
    },
    limitations: [
      'DFF is a disclosed financing proxy because the paper does not identify a frozen historical GC-repo export.',
      'The Federal Reserve curve is a revisable current-vintage staff research product, not the authors historical vintage.',
      'Smoothed hypothetical zero-coupon curve closes are modeled observations, not executable CUSIP fills.',
      'The broad-dollar index is a non-tradable calendar falsification control and carries no portfolio authority.',
      'Historical PASS, if any, grants only prospective-review eligibility; publication and trading remain unapproved.',
    ],
  };

  if (!qa.passed) {
    const reasons: string[] = [];
    if (!qa.financingContinuityPassed) reasons.push('financing-continuity');
    if (!qa.countsPassed) reasons.push('frozen-counts');
    if (!qa.suppliedYieldReconstructionPassed) {
      reasons.push(
        `supplied-yield-reconstruction max error ${qa.maximumSuppliedYieldErrorPct} percentage point exceeds ${YIELD_QA_TOLERANCE_PCT}`,
      );
    }
    return deepRound({
      schemaVersion: 1,
      ...shared,
      qa,
      results: null,
      observations: null,
      decision: qaFailureDecision(reasons),
    } as EndOfMonthTreasuryArtifact);
  }

  const monthEnd = (maturity: number) => schedules.map((schedule) => simulateCurveTrade(
    schedule.month,
    schedule.monthEndEntry,
    schedule.monthEndExit,
    maturity,
    financingByDate,
  ));
  const fiveYearMonthEnd = monthEnd(5);
  const tenYearMonthEnd = monthEnd(10);
  const oneYearMonthEnd = monthEnd(1);
  const fiveYearFirstWindow = schedules.map((schedule) => simulateCurveTrade(
    schedule.month,
    schedule.firstEntry,
    schedule.firstExit,
    5,
    financingByDate,
  ));
  const fiveYearAllOtherDays = schedules.map((schedule) => simulateCurveTrade(
    schedule.month,
    schedule.previousMonthEnd,
    schedule.monthEndEntry,
    5,
    financingByDate,
  ));

  const pairedFiveYear = fiveYearMonthEnd.map((row, index) => ({
    month: row.month,
    value: row.headlineNetLog - fiveYearFirstWindow[index].headlineNetLog,
  }));

  const dollarObservations = dollarEligibleSchedules.map((schedule) => {
    const firstEntry = dollarByDate.get(schedule.firstEntry.date)!;
    const firstExit = dollarByDate.get(schedule.firstExit.date)!;
    const monthEndEntry = dollarByDate.get(schedule.monthEndEntry.date)!;
    const monthEndExit = dollarByDate.get(schedule.monthEndExit.date)!;
    const firstWindowLogReturn = Math.log(firstExit / firstEntry);
    const monthEndLogReturn = Math.log(monthEndExit / monthEndEntry);
    return {
      month: schedule.month,
      firstWindowLogReturn,
      monthEndLogReturn,
      pairedActiveLogReturn: monthEndLogReturn - firstWindowLogReturn,
    };
  });

  const dollarFirst = dollarObservations.map((row) => ({
    month: row.month,
    value: row.firstWindowLogReturn,
  }));
  const dollarMonthEnd = dollarObservations.map((row) => ({
    month: row.month,
    value: row.monthEndLogReturn,
  }));
  const dollarActive = dollarObservations.map((row) => ({
    month: row.month,
    value: row.pairedActiveLogReturn,
  }));
  const dollarControl: DollarControlResult = {
    observations: dollarActive.length,
    firstWindow: summarizeSeries(dollarFirst),
    monthEndWindow: summarizeSeries(dollarMonthEnd),
    pairedActive: summarizeSeries(dollarActive),
    holdoutPairedActive: summarizeSeries(
      dollarActive.filter((row) => row.month >= '2019-01'),
    ),
    folds: equalChronologicalFolds(dollarActive).map((fold, index) => ({
      fold: index + 1,
      fromMonth: fold[0].month,
      toMonth: fold.at(-1)!.month,
      metrics: summarizeSeries(fold),
    })),
  };

  const results = {
    fiveYearMonthEnd: curveLane(fiveYearMonthEnd),
    tenYearMonthEnd: curveLane(tenYearMonthEnd),
    oneYearMonthEnd: curveLane(oneYearMonthEnd),
    fiveYearFirstWindowPlacebo: curveLane(fiveYearFirstWindow),
    fiveYearAllOtherDays: curveLane(fiveYearAllOtherDays),
    pairedFiveYearMonthEndMinusFirstWindow: pairedLane(pairedFiveYear),
    broadDollarControl: dollarControl,
  };
  requireFiniteMetrics(results);
  const decision = decideEndOfMonthTreasuryReplication({
    qaPassed: qa.passed,
    fiveYear: results.fiveYearMonthEnd,
    tenYear: results.tenYearMonthEnd,
    oneYear: results.oneYearMonthEnd,
    allOtherDays: results.fiveYearAllOtherDays,
    pairedPrimaryMinusFirst: results.pairedFiveYearMonthEndMinusFirstWindow,
    dollarControl: results.broadDollarControl,
  });

  return deepRound({
    schemaVersion: 1,
    ...shared,
    qa,
    results,
    observations: {
      fiveYearMonthEnd,
      tenYearMonthEnd,
      oneYearMonthEnd,
      fiveYearFirstWindowPlacebo: fiveYearFirstWindow,
      fiveYearAllOtherDays,
      broadDollar: dollarObservations,
    },
    decision,
  } as EndOfMonthTreasuryArtifact);
}

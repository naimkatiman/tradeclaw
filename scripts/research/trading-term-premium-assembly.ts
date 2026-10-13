/**
 * Pure deterministic assembly for TC-259's preregistered term-premium study.
 * This module has no file, network, clock, environment, database, signal, or
 * execution access.
 */

import crypto from 'crypto';

const SIGNAL_WINDOW = 40;
const FOLD_COUNT = 4;
const HEADLINE_SIDE_COST = 0.0005;
const STRESS_SIDE_COST = 0.00125;
const SUPPLIED_YIELD_TOLERANCE_PCT = 0.0005;
const FULL_FROM = '1968-01';
const FULL_TO = '2026-07';
const PAPER_TO = '2021-01';
const BRIDGE_FROM = '2021-02';
const BRIDGE_TO = '2023-01';
const HOLDOUT_FROM = '2023-02';

export const TRADING_TERM_PREMIUM_TASK = 'TC-259' as const;
export const TRADING_TERM_PREMIUM_INPUT_SHA256 =
  '29442bea3f4ccef06aa741ff4afd6202c2a029cf6f43966f04e482960959f041';
export const TRADING_TERM_PREMIUM_SOURCE_AUDIT_SHA256 =
  'cef21d66d07f29fb32af67f542a482491c4ffd0e00b656ea79bdb9600e0f8965';
export const TRADING_TERM_PREMIUM_PREREGISTRATION_SHA256 =
  '74b138499e36ea55f03490069a3c3f3823e458997c4cb00daf82903bd3f6387b';

const INPUT_HEADER = [
  'Date',
  'BETA0',
  'BETA1',
  'BETA2',
  'BETA3',
  'TAU1',
  'TAU2',
  ...Array.from({ length: 30 }, (_value, index) => (
    `SVENY${String(index + 1).padStart(2, '0')}`
  )),
] as const;

export type TermCurveModel = 'nelson-siegel' | 'svensson';
export type MovingAverageMode = 'include-current' | 'prior-only';
export type TermPremiumLane =
  | 'canonical'
  | 'priorOnly'
  | 'alwaysTenYear'
  | 'alwaysOneMonth';
export type TermPremiumSleeve = 'ten-year' | 'one-month';

export interface TermCurvePoint {
  date: string;
  model: TermCurveModel;
  beta0: number;
  beta1: number;
  beta2: number;
  beta3: number;
  tau1: number;
  tau2: number;
  suppliedYieldPct: Array<number | null>;
}

export interface FrozenTradingTermPremiumInput {
  inputText: string;
  sourceAuditText: string;
  preregistrationText: string;
}

export interface CostPenalties {
  entry: number;
  exit: number;
  roundTrip: number;
}

export interface SleeveReturn {
  sleeve: TermPremiumSleeve;
  grossLog: number;
  headlineNetLog: number;
  stressNetLog: number;
}

export interface TermPremiumOutcome {
  month: string;
  decisionDate: string;
  nextDate: string;
  canonicalHigh: boolean;
  priorOnlyHigh: boolean;
  modeledTenYearExtrapolated: boolean;
  grossLogTenYear: number;
  grossLogOneMonth: number;
  returns: Record<TermPremiumLane, SleeveReturn>;
}

export interface TermPremiumObservation extends TermPremiumOutcome {
  spreadPct: number;
  canonicalAveragePct: number;
  priorOnlyAveragePct: number;
}

export interface ReturnSeriesMetrics {
  observations: number;
  fromMonth: string;
  toMonth: string;
  meanLogReturn: number;
  sampleStandardDeviation: number;
  annualizedSharpe: number;
  compoundedReturn: number;
  positiveFraction: number;
  maximumDrawdown: number;
}

export interface LaneMetrics {
  observations: number;
  fromMonth: string;
  toMonth: string;
  selectedTenYearMonths: number;
  selectedOneMonthMonths: number;
  sleeveTransitions: number;
  gross: ReturnSeriesMetrics;
  headline: ReturnSeriesMetrics;
  stress: ReturnSeriesMetrics;
}

export interface PairedHeadlineMetrics {
  observations: number;
  fromMonth: string;
  toMonth: string;
  meanHeadlineNetLogDifference: number;
  compoundedHeadlineNetExcessReturn: number;
}

export interface WindowResult {
  canonical: LaneMetrics;
  priorOnly: LaneMetrics;
  alwaysTenYear: LaneMetrics;
  alwaysOneMonth: LaneMetrics;
  pairedHeadline: {
    canonicalMinusAlwaysTenYear: PairedHeadlineMetrics;
    canonicalMinusAlwaysOneMonth: PairedHeadlineMetrics;
  };
}

export interface FoldResult {
  fold: number;
  fromMonth: string;
  toMonth: string;
  metrics: WindowResult;
}

export interface TradingTermPremiumResults {
  full: WindowResult;
  paperWindow: WindowResult;
  bridge: WindowResult;
  holdout: WindowResult;
  naturalWarmup: WindowResult;
  paperFolds: FoldResult[];
}

export interface HeadlineGateSnapshot {
  compoundedReturn: number;
  annualizedSharpe: number;
  maximumDrawdown: number;
}

export interface GateWindow {
  canonical: HeadlineGateSnapshot;
  alwaysTenYear: HeadlineGateSnapshot;
  alwaysOneMonth: HeadlineGateSnapshot;
}

export interface TradingTermPremiumDecisionInput {
  qaPassed: boolean;
  full: GateWindow;
  paperFolds: GateWindow[];
  holdout: GateWindow;
}

type PerformanceGateName =
  | 'fullCanonicalPositive'
  | 'fullBeatsAlwaysOneMonth'
  | 'fullSharpeBeatsAlwaysTenYear'
  | 'fullDrawdownBeatsAlwaysTenYear'
  | 'paperFoldStability'
  | 'holdoutCanonicalPositive'
  | 'holdoutBeatsAlwaysOneMonth'
  | 'holdoutSharpeBeatsAlwaysTenYear'
  | 'holdoutDrawdownBeatsAlwaysTenYear';

export interface TradingTermPremiumDecision {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  performanceGatesEvaluated: boolean;
  gates: { qaPassed: boolean } & Record<PerformanceGateName, boolean | null>;
  passingPaperFoldCount: number;
  failedPerformanceGates: PerformanceGateName[];
  qaFailureReasons: string[];
  eligibleForProspectiveReview: boolean;
  publicationApproved: false;
  activationApproved: false;
  allocationApproved: false;
  broadcastApproved: false;
  executionApproved: false;
}

export interface QaCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface TradingTermPremiumQaSummary {
  rows: number;
  firstDate: string;
  lastDate: string;
  nelsonSiegelRows: number;
  svenssonRows: number;
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
  missingSuppliedTenYearRows: number;
  firstSuppliedTenYearDate: string;
  modeledPriceChecks: number;
  eligibleOutcomes: number;
  naturalWarmupOutcomes: number;
  fullOutcomes: number;
  paperOutcomes: number;
  bridgeOutcomes: number;
  holdoutOutcomes: number;
  earlyExtrapolatedPaperOutcomes: number;
  canonicalInventory: RegimeInventory;
  priorOnlyInventory: RegimeInventory;
  paperFoldCanonicalInventories: RegimeInventory[];
  bridgeCanonicalInventory: RegimeInventory;
  holdoutCanonicalInventory: RegimeInventory;
  disagreementOutcomes: string[];
  prefixInvariant: boolean;
  equalityClassifiedLow: boolean;
  costLedgerPassed: boolean;
}

export interface RegimeInventory {
  high: number;
  low: number;
  transitions: number;
}

export interface TradingTermPremiumQa {
  passed: boolean;
  failureReasons: string[];
  checks: QaCheck[];
  summary: TradingTermPremiumQaSummary | null;
}

export interface TradingTermPremiumArtifact {
  schemaVersion: 1;
  meta: {
    task: 'TC-259';
    studyDate: '2026-08-29';
    candidateId: 'trading-the-term-premium';
    catalogCommit: string;
    preregistrationCommit: string;
    evidenceBasis: 'modeled-current-vintage-independent-replication';
  };
  sources: {
    input: {
      path: string;
      expectedSha256: string;
      actualSha256: string;
      completeSourceSha256: string;
    };
    sourceAudit: {
      path: string;
      expectedSha256: string;
      actualSha256: string;
    };
    preregistration: {
      path: string;
      expectedSha256: string;
      actualSha256: string;
    };
  };
  spec: {
    evaluationWindow: '1968-01/2026-07';
    paperWindow: '1968-01/2021-01';
    bridgeWindow: '2021-02/2023-01';
    holdoutWindow: '2023-02/2026-07';
    signal: '10y-minus-3m spread above causal include-current MA40';
    ambiguityControl: 'prior-only MA40';
    priceModel: 'dual Nelson-Siegel/Svensson continuously-compounded zero-coupon discount function';
    headlineSideCostBps: 5;
    stressSideCostBps: 12.5;
    folds: 4;
  };
  qa: TradingTermPremiumQa;
  results: TradingTermPremiumResults | null;
  observations: TermPremiumObservation[] | null;
  decision: TradingTermPremiumDecision;
  limitations: string[];
}

interface SignalPlanRow {
  decisionIndex: number;
  month: string;
  outcomeMonth: string;
  spreadPct: number;
  canonicalAveragePct: number;
  priorOnlyAveragePct: number;
  canonicalHigh: boolean;
  priorOnlyHigh: boolean;
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

export function serializeTradingTermPremiumArtifact(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function timestamp(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`invalid ISO date: ${date}`);
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) {
    throw new Error(`invalid calendar date: ${date}`);
  }
  return value;
}

function finite(raw: string, label: string): number {
  if (raw === '' || raw.trim() !== raw) throw new Error(`${label} is empty or padded`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

export function parseTradingTermPremiumCsv(text: string): TermCurvePoint[] {
  const canonical = canonicalizeResearchText(text);
  if (!canonical.endsWith('\n') || canonical.endsWith('\n\n')) {
    throw new Error('frozen CSV must end with exactly one newline');
  }
  const lines = canonical.slice(0, -1).split('\n');
  const expectedHeader = INPUT_HEADER.join(',');
  if (lines[0] !== expectedHeader) {
    throw new Error(`frozen CSV header mismatch: expected ${expectedHeader}`);
  }

  let previousDate = '';
  return lines.slice(1).map((line, rowIndex) => {
    if (!line || line.includes('"')) throw new Error(`frozen CSV row ${rowIndex + 2} is malformed`);
    const cells = line.split(',');
    if (cells.length !== INPUT_HEADER.length) {
      throw new Error(
        `frozen CSV row ${rowIndex + 2} must have ${INPUT_HEADER.length} fields`,
      );
    }
    const date = cells[0];
    timestamp(date);
    if (date <= previousDate) throw new Error(`curve dates are not strictly increasing at ${date}`);
    previousDate = date;

    const [beta0, beta1, beta2, beta3, tau1, tau2] = cells
      .slice(1, 7)
      .map((raw, index) => finite(raw, `${date} ${INPUT_HEADER[index + 1]}`));
    if (tau1 <= 0) throw new Error(`TAU1 must be positive at ${date}`);
    let model: TermCurveModel;
    if (tau2 === -999.99) {
      if (beta3 !== 0) {
        throw new Error(`Nelson-Siegel sentinel requires BETA3=0 at ${date}`);
      }
      model = 'nelson-siegel';
    } else {
      if (tau2 <= 0) throw new Error(`active Svensson TAU2 must be positive at ${date}`);
      model = 'svensson';
    }

    const suppliedYieldPct = cells.slice(7).map((raw, index) => {
      if (raw === 'NA') return null;
      return finite(raw, `${date} SVENY${String(index + 1).padStart(2, '0')}`);
    });
    return {
      date,
      model,
      beta0,
      beta1,
      beta2,
      beta3,
      tau1,
      tau2,
      suppliedYieldPct,
    };
  });
}

function curveLoading(x: number): number {
  if (!Number.isFinite(x) || x <= 0) throw new Error('curve loading requires positive x');
  return -Math.expm1(-x) / x;
}

export function termCurveYieldPct(point: TermCurvePoint, maturityYears: number): number {
  if (!Number.isFinite(maturityYears) || maturityYears <= 0) {
    throw new Error('zero-coupon maturity must be positive');
  }
  if (!Number.isFinite(point.tau1) || point.tau1 <= 0) {
    throw new Error(`TAU1 must be positive at ${point.date}`);
  }
  const x1 = maturityYears / point.tau1;
  const a1 = curveLoading(x1);
  let yieldPct = point.beta0
    + point.beta1 * a1
    + point.beta2 * (a1 - Math.exp(-x1));
  if (point.model === 'nelson-siegel') {
    if (point.beta3 !== 0 || point.tau2 !== -999.99) {
      throw new Error(`Nelson-Siegel sentinel drift at ${point.date}`);
    }
  } else {
    if (!Number.isFinite(point.tau2) || point.tau2 <= 0) {
      throw new Error(`active Svensson TAU2 must be positive at ${point.date}`);
    }
    const x2 = maturityYears / point.tau2;
    const a2 = curveLoading(x2);
    yieldPct += point.beta3 * (a2 - Math.exp(-x2));
  }
  if (!Number.isFinite(yieldPct)) throw new Error(`non-finite curve yield at ${point.date}`);
  return yieldPct;
}

export function termZeroCouponPrice(point: TermCurvePoint, maturityYears: number): number {
  const yieldPct = termCurveYieldPct(point, maturityYears);
  const price = Math.exp(-(yieldPct / 100) * maturityYears);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`invalid zero-coupon price at ${point.date}/${maturityYears}`);
  }
  return price;
}

function movingAverageValues(
  values: readonly number[],
  window: number,
  mode: MovingAverageMode,
): Array<number | null> {
  if (!Number.isInteger(window) || window <= 0) throw new Error('moving-average window must be positive');
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('moving-average values must be finite');
  }
  return values.map((_value, index) => {
    const endExclusive = mode === 'include-current' ? index + 1 : index;
    const start = endExclusive - window;
    if (start < 0) return null;
    const sample = values.slice(start, endExclusive);
    return sample.reduce((sum, value) => sum + value, 0) / window;
  });
}

export function movingAverageFlags(
  values: readonly number[],
  window: number,
  mode: MovingAverageMode,
): Array<boolean | null> {
  const averages = movingAverageValues(values, window, mode);
  return averages.map((average, index) => (
    average === null ? null : values[index] > average
  ));
}

export function costPenalties(sideCost: number): CostPenalties {
  if (!Number.isFinite(sideCost) || sideCost < 0 || sideCost >= 1) {
    throw new Error('side cost must be finite and in [0, 1)');
  }
  const entry = Math.log1p(sideCost);
  const exit = -Math.log1p(-sideCost);
  return { entry, exit, roundTrip: entry + exit };
}

function sleeveReturn(
  sleeve: TermPremiumSleeve,
  grossLog: number,
  headline: CostPenalties,
  stress: CostPenalties,
): SleeveReturn {
  const headlinePenalty = sleeve === 'ten-year' ? headline.roundTrip : headline.entry;
  const stressPenalty = sleeve === 'ten-year' ? stress.roundTrip : stress.entry;
  return {
    sleeve,
    grossLog,
    headlineNetLog: grossLog - headlinePenalty,
    stressNetLog: grossLog - stressPenalty,
  };
}

export function buildTermPremiumOutcome(
  month: string,
  decision: TermCurvePoint,
  next: TermCurvePoint,
  canonicalHigh: boolean,
  priorOnlyHigh: boolean,
): TermPremiumOutcome {
  if (next.date.slice(0, 7) !== month) {
    throw new Error(`outcome month ${month} does not match next curve point ${next.date}`);
  }
  const grossLogTenYear = Math.log(
    termZeroCouponPrice(next, 119 / 12) / termZeroCouponPrice(decision, 10),
  );
  const grossLogOneMonth = -Math.log(termZeroCouponPrice(decision, 1 / 12));
  if (!Number.isFinite(grossLogTenYear) || !Number.isFinite(grossLogOneMonth)) {
    throw new Error(`non-finite modeled return for ${month}`);
  }
  const headline = costPenalties(HEADLINE_SIDE_COST);
  const stress = costPenalties(STRESS_SIDE_COST);
  const tenYear = () => sleeveReturn('ten-year', grossLogTenYear, headline, stress);
  const oneMonth = () => sleeveReturn('one-month', grossLogOneMonth, headline, stress);
  return {
    month,
    decisionDate: decision.date,
    nextDate: next.date,
    canonicalHigh,
    priorOnlyHigh,
    modeledTenYearExtrapolated:
      decision.suppliedYieldPct[9] === null || next.suppliedYieldPct[9] === null,
    grossLogTenYear,
    grossLogOneMonth,
    returns: {
      canonical: canonicalHigh ? tenYear() : oneMonth(),
      priorOnly: priorOnlyHigh ? tenYear() : oneMonth(),
      alwaysTenYear: tenYear(),
      alwaysOneMonth: oneMonth(),
    },
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error('cannot summarize an empty series');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: readonly number[]): number {
  if (values.length < 2) throw new Error('series requires at least two observations');
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1),
  );
}

function maximumDrawdown(logReturns: readonly number[]): number {
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

export function summarizeReturnSeries(
  rows: ReadonlyArray<{ month: string; value: number }>,
): ReturnSeriesMetrics {
  if (rows.length < 2) throw new Error('return series requires at least two observations');
  if (rows.some((row) => !Number.isFinite(row.value))) {
    throw new Error('return series contains a non-finite value');
  }
  const values = rows.map((row) => row.value);
  const average = mean(values);
  const deviation = sampleStandardDeviation(values);
  if (!Number.isFinite(deviation) || deviation <= 0) {
    throw new Error('return series standard deviation must be positive');
  }
  return {
    observations: rows.length,
    fromMonth: rows[0].month,
    toMonth: rows.at(-1)!.month,
    meanLogReturn: average,
    sampleStandardDeviation: deviation,
    annualizedSharpe: Math.sqrt(12) * average / deviation,
    compoundedReturn: Math.exp(values.reduce((sum, value) => sum + value, 0)) - 1,
    positiveFraction: values.filter((value) => value > 0).length / values.length,
    maximumDrawdown: maximumDrawdown(values),
  };
}

export function equalChronologicalFolds<T extends { month: string }>(rows: readonly T[]): T[][] {
  if (rows.length < FOLD_COUNT) throw new Error('not enough observations for four folds');
  return Array.from({ length: FOLD_COUNT }, (_value, index) => (
    rows.slice(
      Math.floor(index * rows.length / FOLD_COUNT),
      Math.floor((index + 1) * rows.length / FOLD_COUNT),
    )
  ));
}

function summarizeLane(rows: readonly TermPremiumObservation[], lane: TermPremiumLane): LaneMetrics {
  if (rows.length < 2) throw new Error(`lane ${lane} requires at least two observations`);
  const sleeveReturns = rows.map((row) => row.returns[lane]);
  const metric = (key: 'grossLog' | 'headlineNetLog' | 'stressNetLog') => (
    summarizeReturnSeries(rows.map((row, index) => ({
      month: row.month,
      value: sleeveReturns[index][key],
    })))
  );
  return {
    observations: rows.length,
    fromMonth: rows[0].month,
    toMonth: rows.at(-1)!.month,
    selectedTenYearMonths: sleeveReturns.filter((row) => row.sleeve === 'ten-year').length,
    selectedOneMonthMonths: sleeveReturns.filter((row) => row.sleeve === 'one-month').length,
    sleeveTransitions: sleeveReturns.slice(1).filter(
      (row, index) => row.sleeve !== sleeveReturns[index].sleeve,
    ).length,
    gross: metric('grossLog'),
    headline: metric('headlineNetLog'),
    stress: metric('stressNetLog'),
  };
}

function pairedHeadline(
  rows: readonly TermPremiumObservation[],
  benchmark: 'alwaysTenYear' | 'alwaysOneMonth',
): PairedHeadlineMetrics {
  if (rows.length < 2) throw new Error('paired comparison requires at least two observations');
  const differences = rows.map(
    (row) => row.returns.canonical.headlineNetLog - row.returns[benchmark].headlineNetLog,
  );
  return {
    observations: rows.length,
    fromMonth: rows[0].month,
    toMonth: rows.at(-1)!.month,
    meanHeadlineNetLogDifference: mean(differences),
    compoundedHeadlineNetExcessReturn:
      Math.exp(differences.reduce((sum, value) => sum + value, 0)) - 1,
  };
}

function windowResult(rows: readonly TermPremiumObservation[]): WindowResult {
  return {
    canonical: summarizeLane(rows, 'canonical'),
    priorOnly: summarizeLane(rows, 'priorOnly'),
    alwaysTenYear: summarizeLane(rows, 'alwaysTenYear'),
    alwaysOneMonth: summarizeLane(rows, 'alwaysOneMonth'),
    pairedHeadline: {
      canonicalMinusAlwaysTenYear: pairedHeadline(rows, 'alwaysTenYear'),
      canonicalMinusAlwaysOneMonth: pairedHeadline(rows, 'alwaysOneMonth'),
    },
  };
}

function gateSnapshot(metrics: LaneMetrics): HeadlineGateSnapshot {
  return {
    compoundedReturn: metrics.headline.compoundedReturn,
    annualizedSharpe: metrics.headline.annualizedSharpe,
    maximumDrawdown: metrics.headline.maximumDrawdown,
  };
}

function gateWindow(result: WindowResult): GateWindow {
  return {
    canonical: gateSnapshot(result.canonical),
    alwaysTenYear: gateSnapshot(result.alwaysTenYear),
    alwaysOneMonth: gateSnapshot(result.alwaysOneMonth),
  };
}

function qaFailureDecision(reasons: string[]): TradingTermPremiumDecision {
  return {
    verdict: 'INCONCLUSIVE',
    performanceGatesEvaluated: false,
    gates: {
      qaPassed: false,
      fullCanonicalPositive: null,
      fullBeatsAlwaysOneMonth: null,
      fullSharpeBeatsAlwaysTenYear: null,
      fullDrawdownBeatsAlwaysTenYear: null,
      paperFoldStability: null,
      holdoutCanonicalPositive: null,
      holdoutBeatsAlwaysOneMonth: null,
      holdoutSharpeBeatsAlwaysTenYear: null,
      holdoutDrawdownBeatsAlwaysTenYear: null,
    },
    passingPaperFoldCount: 0,
    failedPerformanceGates: [],
    qaFailureReasons: reasons,
    eligibleForProspectiveReview: false,
    publicationApproved: false,
    activationApproved: false,
    allocationApproved: false,
    broadcastApproved: false,
    executionApproved: false,
  };
}

export function decideTradingTermPremiumReplication(
  input: TradingTermPremiumDecisionInput,
): TradingTermPremiumDecision {
  if (!input.qaPassed) return qaFailureDecision(['standing source/data QA did not pass']);
  if (input.paperFolds.length !== FOLD_COUNT) {
    return qaFailureDecision([`paper fold count ${input.paperFolds.length} does not equal 4`]);
  }
  const paperFoldPasses = input.paperFolds.map((fold) => (
    fold.canonical.compoundedReturn > fold.alwaysOneMonth.compoundedReturn
      && fold.canonical.annualizedSharpe > fold.alwaysTenYear.annualizedSharpe
  ));
  const passingPaperFoldCount = paperFoldPasses.filter(Boolean).length;
  const gates = {
    qaPassed: true,
    fullCanonicalPositive: input.full.canonical.compoundedReturn > 0,
    fullBeatsAlwaysOneMonth:
      input.full.canonical.compoundedReturn > input.full.alwaysOneMonth.compoundedReturn,
    fullSharpeBeatsAlwaysTenYear:
      input.full.canonical.annualizedSharpe > input.full.alwaysTenYear.annualizedSharpe,
    fullDrawdownBeatsAlwaysTenYear:
      input.full.canonical.maximumDrawdown < input.full.alwaysTenYear.maximumDrawdown,
    paperFoldStability: passingPaperFoldCount >= 3,
    holdoutCanonicalPositive: input.holdout.canonical.compoundedReturn > 0,
    holdoutBeatsAlwaysOneMonth:
      input.holdout.canonical.compoundedReturn > input.holdout.alwaysOneMonth.compoundedReturn,
    holdoutSharpeBeatsAlwaysTenYear:
      input.holdout.canonical.annualizedSharpe > input.holdout.alwaysTenYear.annualizedSharpe,
    holdoutDrawdownBeatsAlwaysTenYear:
      input.holdout.canonical.maximumDrawdown < input.holdout.alwaysTenYear.maximumDrawdown,
  } satisfies TradingTermPremiumDecision['gates'];
  const performanceGateNames: PerformanceGateName[] = [
    'fullCanonicalPositive',
    'fullBeatsAlwaysOneMonth',
    'fullSharpeBeatsAlwaysTenYear',
    'fullDrawdownBeatsAlwaysTenYear',
    'paperFoldStability',
    'holdoutCanonicalPositive',
    'holdoutBeatsAlwaysOneMonth',
    'holdoutSharpeBeatsAlwaysTenYear',
    'holdoutDrawdownBeatsAlwaysTenYear',
  ];
  const failedPerformanceGates = performanceGateNames.filter((name) => !gates[name]);
  const verdict = failedPerformanceGates.length === 0 ? 'PASS' : 'FAIL';
  return {
    verdict,
    performanceGatesEvaluated: true,
    gates,
    passingPaperFoldCount,
    failedPerformanceGates,
    qaFailureReasons: [],
    eligibleForProspectiveReview: verdict === 'PASS',
    publicationApproved: false,
    activationApproved: false,
    allocationApproved: false,
    broadcastApproved: false,
    executionApproved: false,
  };
}

function monthAfter(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error(`invalid month key: ${month}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
  return date.toISOString().slice(0, 7);
}

function regimeInventory(values: readonly boolean[]): RegimeInventory {
  return {
    high: values.filter(Boolean).length,
    low: values.filter((value) => !value).length,
    transitions: values.slice(1).filter((value, index) => value !== values[index]).length,
  };
}

function buildSignalPlan(points: readonly TermCurvePoint[]): {
  rows: SignalPlanRow[];
  spreads: number[];
  canonicalFlags: Array<boolean | null>;
  priorOnlyFlags: Array<boolean | null>;
} {
  const spreads = points.map(
    (point) => termCurveYieldPct(point, 10) - termCurveYieldPct(point, 0.25),
  );
  const canonicalAverages = movingAverageValues(spreads, SIGNAL_WINDOW, 'include-current');
  const priorOnlyAverages = movingAverageValues(spreads, SIGNAL_WINDOW, 'prior-only');
  const canonicalFlags = movingAverageFlags(spreads, SIGNAL_WINDOW, 'include-current');
  const priorOnlyFlags = movingAverageFlags(spreads, SIGNAL_WINDOW, 'prior-only');
  const rows: SignalPlanRow[] = [];
  for (let decisionIndex = 0; decisionIndex < points.length - 1; decisionIndex += 1) {
    const canonicalAveragePct = canonicalAverages[decisionIndex];
    const priorOnlyAveragePct = priorOnlyAverages[decisionIndex];
    const canonicalHigh = canonicalFlags[decisionIndex];
    const priorOnlyHigh = priorOnlyFlags[decisionIndex];
    if (
      canonicalAveragePct === null
      || priorOnlyAveragePct === null
      || canonicalHigh === null
      || priorOnlyHigh === null
    ) continue;
    const outcomeMonth = points[decisionIndex + 1].date.slice(0, 7);
    rows.push({
      decisionIndex,
      month: outcomeMonth,
      outcomeMonth,
      spreadPct: spreads[decisionIndex],
      canonicalAveragePct,
      priorOnlyAveragePct,
      canonicalHigh,
      priorOnlyHigh,
    });
  }
  return { rows, spreads, canonicalFlags, priorOnlyFlags };
}

function exactInventory(
  inventory: RegimeInventory,
  expected: RegimeInventory,
): boolean {
  return inventory.high === expected.high
    && inventory.low === expected.low
    && inventory.transitions === expected.transitions;
}

function requireFiniteMetrics(value: unknown, path = 'results'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path} contains a non-finite number`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => requireFiniteMetrics(item, `${path}[${index}]`));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => requireFiniteMetrics(item, `${path}.${key}`));
  }
}

function sharedArtifact(
  hashes: { input: string; sourceAudit: string; preregistration: string },
) {
  return {
    meta: {
      task: TRADING_TERM_PREMIUM_TASK,
      studyDate: '2026-08-29' as const,
      candidateId: 'trading-the-term-premium' as const,
      catalogCommit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
      preregistrationCommit: '5dd2457215314edb12e7a0089818bc368b3dd69a',
      evidenceBasis: 'modeled-current-vintage-independent-replication' as const,
    },
    sources: {
      input: {
        path:
          'docs/research/data/trading-term-premium/fed-nominal-month-end-1961-06-30-2026-07-31.csv',
        expectedSha256: TRADING_TERM_PREMIUM_INPUT_SHA256,
        actualSha256: hashes.input,
        completeSourceSha256:
          '877d0908ce3b875412eac0295715f88b40a011a94e24339e15959ec3bb04cad7',
      },
      sourceAudit: {
        path: 'docs/research/2026-08-29-trading-term-premium-source-audit.md',
        expectedSha256: TRADING_TERM_PREMIUM_SOURCE_AUDIT_SHA256,
        actualSha256: hashes.sourceAudit,
      },
      preregistration: {
        path: 'docs/plans/2026-08-29-trading-term-premium-replication.md',
        expectedSha256: TRADING_TERM_PREMIUM_PREREGISTRATION_SHA256,
        actualSha256: hashes.preregistration,
      },
    },
    spec: {
      evaluationWindow: '1968-01/2026-07' as const,
      paperWindow: '1968-01/2021-01' as const,
      bridgeWindow: '2021-02/2023-01' as const,
      holdoutWindow: '2023-02/2026-07' as const,
      signal: '10y-minus-3m spread above causal include-current MA40' as const,
      ambiguityControl: 'prior-only MA40' as const,
      priceModel:
        'dual Nelson-Siegel/Svensson continuously-compounded zero-coupon discount function' as const,
      headlineSideCostBps: 5 as const,
      stressSideCostBps: 12.5 as const,
      folds: 4 as const,
    },
    limitations: [
      'The paper describes a proof-of-concept study and omits transaction costs.',
      'All zero-coupon prices are fitted current-vintage curve values, not executable security fills.',
      'The first 44 paper-window outcomes extend beyond the supplied ten-year comparison field.',
      'The cost source is a modern modeling benchmark; commissions, taxes, custody, financing, market impact, and management fees remain omitted.',
      'The Federal Reserve curve can be revised; this artifact applies only to the exact frozen source bytes.',
      'Historical PASS, if any, grants only prospective-review eligibility; publication and trading remain unapproved.',
    ],
  };
}

function failedArtifact(
  shared: ReturnType<typeof sharedArtifact>,
  checks: QaCheck[],
  reasons: string[],
  summary: TradingTermPremiumQaSummary | null = null,
): TradingTermPremiumArtifact {
  return deepRound({
    schemaVersion: 1,
    ...shared,
    qa: { passed: false, failureReasons: reasons, checks, summary },
    results: null,
    observations: null,
    decision: qaFailureDecision(reasons),
  } as TradingTermPremiumArtifact);
}

function validateFrozenInput(
  points: readonly TermCurvePoint[],
  signalPlan: ReturnType<typeof buildSignalPlan>,
  hashChecks: QaCheck[],
): { qa: TradingTermPremiumQa; fullPlan: SignalPlanRow[] } {
  const checks = [...hashChecks];
  const add = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
  };

  const nelsonSiegelRows = points.filter((point) => point.model === 'nelson-siegel').length;
  const svenssonRows = points.filter((point) => point.model === 'svensson').length;
  const monthlyContinuity = points.every((point, index) => (
    index === 0 || point.date.slice(0, 7) === monthAfter(points[index - 1].date.slice(0, 7))
  ));
  add(
    'row-and-date-inventory',
    points.length === 782
      && points[0]?.date === '1961-06-30'
      && points.at(-1)?.date === '2026-07-31'
      && monthlyContinuity,
    `${points.length} rows ${points[0]?.date ?? 'none'}/${points.at(-1)?.date ?? 'none'}; monthly continuity ${monthlyContinuity}`,
  );
  add(
    'curve-model-inventory',
    nelsonSiegelRows === 223 && svenssonRows === 559,
    `${nelsonSiegelRows} Nelson-Siegel / ${svenssonRows} Svensson`,
  );

  const suppliedErrors: TradingTermPremiumQaSummary['maximumSuppliedYieldError'][] = [];
  for (const point of points) {
    point.suppliedYieldPct.forEach((suppliedYieldPct, index) => {
      if (suppliedYieldPct === null) return;
      const maturityYears = index + 1;
      const reconstructedYieldPct = termCurveYieldPct(point, maturityYears);
      suppliedErrors.push({
        date: point.date,
        maturityYears,
        reconstructedYieldPct,
        suppliedYieldPct,
        absoluteErrorPct: Math.abs(reconstructedYieldPct - suppliedYieldPct),
      });
    });
  }
  const maximumSuppliedYieldError = suppliedErrors.reduce((maximum, current) => (
    current.absoluteErrorPct > maximum.absoluteErrorPct ? current : maximum
  ));
  const suppliedAboveTolerance = suppliedErrors.filter(
    (error) => error.absoluteErrorPct > SUPPLIED_YIELD_TOLERANCE_PCT,
  ).length;
  const missingSuppliedTenYearRows = points.filter(
    (point) => point.suppliedYieldPct[9] === null,
  ).length;
  const firstSuppliedTenYearDate = points.find(
    (point) => point.suppliedYieldPct[9] !== null,
  )?.date ?? '';
  add(
    'supplied-yield-reconstruction',
    suppliedErrors.length === 18_334
      && suppliedAboveTolerance === 0
      && maximumSuppliedYieldError.absoluteErrorPct <= SUPPLIED_YIELD_TOLERANCE_PCT,
    `${suppliedErrors.length} checks; ${suppliedAboveTolerance} above ${SUPPLIED_YIELD_TOLERANCE_PCT} percentage point; max ${maximumSuppliedYieldError.absoluteErrorPct}`,
  );
  add(
    'supplied-ten-year-inventory',
    missingSuppliedTenYearRows === 122 && firstSuppliedTenYearDate === '1971-08-31',
    `${missingSuppliedTenYearRows} missing; first ${firstSuppliedTenYearDate || 'none'}`,
  );

  const priceMaturities = [1 / 12, 0.25, 119 / 12, 120 / 12, 10] as const;
  let modeledPriceChecks = 0;
  for (const point of points) {
    for (const maturity of priceMaturities) {
      termZeroCouponPrice(point, maturity);
      modeledPriceChecks += 1;
    }
  }
  add(
    'modeled-price-finiteness',
    modeledPriceChecks === 3_910,
    `${modeledPriceChecks} finite positive price checks`,
  );

  const fullPlan = signalPlan.rows.filter(
    (row) => row.outcomeMonth >= FULL_FROM && row.outcomeMonth <= FULL_TO,
  );
  const paperPlan = fullPlan.filter((row) => row.outcomeMonth <= PAPER_TO);
  const bridgePlan = fullPlan.filter(
    (row) => row.outcomeMonth >= BRIDGE_FROM && row.outcomeMonth <= BRIDGE_TO,
  );
  const holdoutPlan = fullPlan.filter((row) => row.outcomeMonth >= HOLDOUT_FROM);
  const naturalWarmupPlan = signalPlan.rows.filter((row) => row.outcomeMonth < FULL_FROM);
  const paperFolds = equalChronologicalFolds(paperPlan);
  add(
    'window-and-fold-counts',
    fullPlan.length === 703
      && paperPlan.length === 637
      && bridgePlan.length === 24
      && holdoutPlan.length === 42
      && paperFolds.map((fold) => fold.length).join(',') === '159,159,159,160'
      && paperFolds.map((fold) => `${fold[0].outcomeMonth}/${fold.at(-1)!.outcomeMonth}`).join(',')
        === '1968-01/1981-03,1981-04/1994-06,1994-07/2007-09,2007-10/2021-01',
    `${fullPlan.length}/${paperPlan.length}/${bridgePlan.length}/${holdoutPlan.length}; folds ${paperFolds.map((fold) => fold.length).join('/')}`,
  );

  const canonicalInventory = regimeInventory(fullPlan.map((row) => row.canonicalHigh));
  const priorOnlyInventory = regimeInventory(fullPlan.map((row) => row.priorOnlyHigh));
  const paperFoldCanonicalInventories = paperFolds.map(
    (fold) => regimeInventory(fold.map((row) => row.canonicalHigh)),
  );
  const bridgeCanonicalInventory = regimeInventory(bridgePlan.map((row) => row.canonicalHigh));
  const holdoutCanonicalInventory = regimeInventory(holdoutPlan.map((row) => row.canonicalHigh));
  const disagreementOutcomes = fullPlan
    .filter((row) => row.canonicalHigh !== row.priorOnlyHigh)
    .map((row) => row.outcomeMonth);
  add(
    'canonical-regime-inventory',
    exactInventory(canonicalInventory, { high: 341, low: 362, transitions: 50 })
      && paperFoldCanonicalInventories.every((inventory, index) => exactInventory(
        inventory,
        [
          { high: 84, low: 75, transitions: inventory.transitions },
          { high: 99, low: 60, transitions: inventory.transitions },
          { high: 52, low: 107, transitions: inventory.transitions },
          { high: 67, low: 93, transitions: inventory.transitions },
        ][index],
      ))
      && exactInventory(bridgeCanonicalInventory, { high: 18, low: 6, transitions: 1 })
      && exactInventory(holdoutCanonicalInventory, { high: 21, low: 21, transitions: 1 }),
    `full ${canonicalInventory.high}/${canonicalInventory.low}/${canonicalInventory.transitions}; folds ${paperFoldCanonicalInventories.map((inventory) => `${inventory.high}/${inventory.low}`).join(',')}; bridge ${bridgeCanonicalInventory.high}/${bridgeCanonicalInventory.low}/${bridgeCanonicalInventory.transitions}; holdout ${holdoutCanonicalInventory.high}/${holdoutCanonicalInventory.low}/${holdoutCanonicalInventory.transitions}`,
  );
  add(
    'prior-only-regime-inventory',
    exactInventory(priorOnlyInventory, { high: 335, low: 368, transitions: 48 })
      && disagreementOutcomes.join(',')
        === '1980-10,1990-09,2015-01,2015-08,2024-11,2024-12',
    `full ${priorOnlyInventory.high}/${priorOnlyInventory.low}/${priorOnlyInventory.transitions}; disagreements ${disagreementOutcomes.join(',')}`,
  );

  let prefixInvariant = true;
  for (let index = 0; index < signalPlan.spreads.length; index += 1) {
    const prefix = signalPlan.spreads.slice(0, index + 1);
    if (
      movingAverageFlags(prefix, SIGNAL_WINDOW, 'include-current')[index]
        !== signalPlan.canonicalFlags[index]
      || movingAverageFlags(prefix, SIGNAL_WINDOW, 'prior-only')[index]
        !== signalPlan.priorOnlyFlags[index]
    ) {
      prefixInvariant = false;
      break;
    }
  }
  const equalityClassifiedLow = movingAverageFlags(
    Array.from({ length: SIGNAL_WINDOW }, () => 1),
    SIGNAL_WINDOW,
    'include-current',
  ).at(-1) === false
    && movingAverageFlags(
      Array.from({ length: SIGNAL_WINDOW + 1 }, () => 1),
      SIGNAL_WINDOW,
      'prior-only',
    ).at(-1) === false;
  add(
    'causal-signal-boundaries',
    prefixInvariant && equalityClassifiedLow,
    `prefix invariant ${prefixInvariant}; equality low ${equalityClassifiedLow}`,
  );

  const sampleOutcome = buildTermPremiumOutcome(
    points[1].date.slice(0, 7),
    points[0],
    points[1],
    true,
    false,
  );
  const headline = costPenalties(HEADLINE_SIDE_COST);
  const stress = costPenalties(STRESS_SIDE_COST);
  const costLedgerPassed = Math.abs(
    sampleOutcome.returns.canonical.grossLog
      - sampleOutcome.returns.canonical.headlineNetLog
      - headline.roundTrip,
  ) < 1e-14
    && Math.abs(
      sampleOutcome.returns.priorOnly.grossLog
        - sampleOutcome.returns.priorOnly.headlineNetLog
        - headline.entry,
    ) < 1e-14
    && Math.abs(
      sampleOutcome.returns.alwaysTenYear.grossLog
        - sampleOutcome.returns.alwaysTenYear.stressNetLog
        - stress.roundTrip,
    ) < 1e-14
    && Math.abs(
      sampleOutcome.returns.alwaysOneMonth.grossLog
        - sampleOutcome.returns.alwaysOneMonth.stressNetLog
        - stress.entry,
    ) < 1e-14;
  add(
    'monthly-sleeve-cost-ledger',
    costLedgerPassed,
    `headline entry/round-trip ${headline.entry}/${headline.roundTrip}; stress ${stress.entry}/${stress.roundTrip}`,
  );

  const earlyExtrapolatedPaperOutcomes = paperPlan.filter((row) => {
    const decision = points[row.decisionIndex];
    const next = points[row.decisionIndex + 1];
    return decision.suppliedYieldPct[9] === null || next.suppliedYieldPct[9] === null;
  }).length;
  add(
    'early-ten-year-extrapolation-inventory',
    earlyExtrapolatedPaperOutcomes === 44,
    `${earlyExtrapolatedPaperOutcomes} paper outcomes`,
  );

  const summary: TradingTermPremiumQaSummary = {
    rows: points.length,
    firstDate: points[0]?.date ?? '',
    lastDate: points.at(-1)?.date ?? '',
    nelsonSiegelRows,
    svenssonRows,
    suppliedYieldChecks: suppliedErrors.length,
    suppliedYieldChecksAboveTolerance: suppliedAboveTolerance,
    maximumSuppliedYieldErrorPct: maximumSuppliedYieldError.absoluteErrorPct,
    maximumSuppliedYieldError,
    missingSuppliedTenYearRows,
    firstSuppliedTenYearDate,
    modeledPriceChecks,
    eligibleOutcomes: signalPlan.rows.length,
    naturalWarmupOutcomes: naturalWarmupPlan.length,
    fullOutcomes: fullPlan.length,
    paperOutcomes: paperPlan.length,
    bridgeOutcomes: bridgePlan.length,
    holdoutOutcomes: holdoutPlan.length,
    earlyExtrapolatedPaperOutcomes,
    canonicalInventory,
    priorOnlyInventory,
    paperFoldCanonicalInventories,
    bridgeCanonicalInventory,
    holdoutCanonicalInventory,
    disagreementOutcomes,
    prefixInvariant,
    equalityClassifiedLow,
    costLedgerPassed,
  };
  const failureReasons = checks.filter((check) => !check.passed).map((check) => check.name);
  return {
    qa: { passed: failureReasons.length === 0, failureReasons, checks, summary },
    fullPlan,
  };
}

function buildResults(observations: readonly TermPremiumObservation[]): TradingTermPremiumResults {
  const full = observations.filter((row) => row.month >= FULL_FROM && row.month <= FULL_TO);
  const paper = full.filter((row) => row.month <= PAPER_TO);
  const bridge = full.filter((row) => row.month >= BRIDGE_FROM && row.month <= BRIDGE_TO);
  const holdout = full.filter((row) => row.month >= HOLDOUT_FROM);
  const naturalWarmup = observations.filter((row) => row.month < FULL_FROM);
  return {
    full: windowResult(full),
    paperWindow: windowResult(paper),
    bridge: windowResult(bridge),
    holdout: windowResult(holdout),
    naturalWarmup: windowResult(naturalWarmup),
    paperFolds: equalChronologicalFolds(paper).map((fold, index) => ({
      fold: index + 1,
      fromMonth: fold[0].month,
      toMonth: fold.at(-1)!.month,
      metrics: windowResult(fold),
    })),
  };
}

export function assembleTradingTermPremiumReplication(
  input: FrozenTradingTermPremiumInput,
): TradingTermPremiumArtifact {
  const hashes = {
    input: canonicalResearchSha256(input.inputText),
    sourceAudit: canonicalResearchSha256(input.sourceAuditText),
    preregistration: canonicalResearchSha256(input.preregistrationText),
  };
  const shared = sharedArtifact(hashes);
  const hashChecks: QaCheck[] = [
    {
      name: 'input-hash',
      passed: hashes.input === TRADING_TERM_PREMIUM_INPUT_SHA256,
      detail: `expected ${TRADING_TERM_PREMIUM_INPUT_SHA256}; received ${hashes.input}`,
    },
    {
      name: 'source-audit-hash',
      passed: hashes.sourceAudit === TRADING_TERM_PREMIUM_SOURCE_AUDIT_SHA256,
      detail: `expected ${TRADING_TERM_PREMIUM_SOURCE_AUDIT_SHA256}; received ${hashes.sourceAudit}`,
    },
    {
      name: 'preregistration-hash',
      passed: hashes.preregistration === TRADING_TERM_PREMIUM_PREREGISTRATION_SHA256,
      detail: `expected ${TRADING_TERM_PREMIUM_PREREGISTRATION_SHA256}; received ${hashes.preregistration}`,
    },
  ];
  const hashFailures = hashChecks.filter((check) => !check.passed).map((check) => check.name);
  if (hashFailures.length > 0) return failedArtifact(shared, hashChecks, hashFailures);

  try {
    const points = parseTradingTermPremiumCsv(input.inputText);
    const signalPlan = buildSignalPlan(points);
    const { qa } = validateFrozenInput(points, signalPlan, hashChecks);
    if (!qa.passed) return failedArtifact(shared, qa.checks, qa.failureReasons, qa.summary);

    const observations = signalPlan.rows.map((signal): TermPremiumObservation => ({
      ...buildTermPremiumOutcome(
        signal.outcomeMonth,
        points[signal.decisionIndex],
        points[signal.decisionIndex + 1],
        signal.canonicalHigh,
        signal.priorOnlyHigh,
      ),
      spreadPct: signal.spreadPct,
      canonicalAveragePct: signal.canonicalAveragePct,
      priorOnlyAveragePct: signal.priorOnlyAveragePct,
    }));
    const results = buildResults(observations);
    requireFiniteMetrics(results);
    const decision = decideTradingTermPremiumReplication({
      qaPassed: true,
      full: gateWindow(results.full),
      paperFolds: results.paperFolds.map((fold) => gateWindow(fold.metrics)),
      holdout: gateWindow(results.holdout),
    });
    return deepRound({
      schemaVersion: 1,
      ...shared,
      qa,
      results,
      observations,
      decision,
    } as TradingTermPremiumArtifact);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failedArtifact(
      shared,
      [...hashChecks, { name: 'standing-validation', passed: false, detail: reason }],
      [`standing-validation: ${reason}`],
    );
  }
}

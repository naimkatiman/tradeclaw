/**
 * Pure deterministic assembly for TC-258. This module has no file, network,
 * clock, environment, database, or live-strategy access.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;
const FOLD_COUNT = 4;

export const BITCOIN_MAX_MIN_SYMBOLS = ['BTCUSD', 'ETHUSD'] as const;
export const BITCOIN_MAX_MIN_LOOKBACKS = [10, 20, 30, 40, 50] as const;
export const BITCOIN_MAX_MIN_COMPONENTS = ['at-max', 'at-min', 'composite'] as const;
export const BITCOIN_MAX_MIN_HOLDOUT_TS = Date.UTC(2022, 1, 4);
export const BITCOIN_MAX_MIN_END_EXCLUSIVE_TS = Date.UTC(2026, 7, 1);
export const BITCOIN_MAX_MIN_EVALUATION_START_TS = {
  BTCUSD: Date.UTC(2015, 11, 6),
  ETHUSD: Date.UTC(2016, 4, 20),
} as const;
export const BITCOIN_MAX_MIN_EXPECTED_INPUT_SHA256 = {
  BTCUSD: 'ab1e468e9065a77ed744314116e6c3bb41cbd88f492cc60a6e6fc4fdc87e9c68',
  ETHUSD: '6f5bc428c67da5534829f3b567d0c1e7b2e7b1294d6dde1fc56019deeccc20e4',
} as const;
export const BITCOIN_MAX_MIN_EXPECTED_SUBSET_SHA256 = {
  BTCUSD: 'e1a03d0a0ae1e2fe30c85b963086f6753790e1aa57699d30a839b40e4a283623',
  ETHUSD: '8bc32e4ef354ba2fd7c6644f1cb652082bfa42759b8f2ed96563459520a2f96d',
} as const;

export type BitcoinMaxMinSymbol = (typeof BITCOIN_MAX_MIN_SYMBOLS)[number];
export type BitcoinMaxMinLookback = (typeof BITCOIN_MAX_MIN_LOOKBACKS)[number];
export type BitcoinMaxMinComponent = (typeof BITCOIN_MAX_MIN_COMPONENTS)[number];
export type BitcoinMaxMinConfiguration = `${BitcoinMaxMinComponent}-${BitcoinMaxMinLookback}`;
export type CostReading = 'gross' | 'fee-only' | 'headline' | 'stress';

export interface ObservedDailyCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  observedHourlyBars: number;
  missingHourUtc: number | null;
}

export interface BitcoinMaxMinSourceFile {
  schemaVersion: 1;
  source: 'cryptodatadownload-gemini-h1';
  sourcePage: string;
  sourceUrl: string;
  sourceLicense: 'CC-BY-NC-SA-4.0';
  sourceSubsetSha256: string;
  venue: 'Gemini';
  symbol: BitcoinMaxMinSymbol;
  timeframe: 'D1-UTC-from-observed-H1';
  requestedWindow: { from: string; toExclusive: string };
  aggregation: { timezone: 'UTC'; missingHours: string };
  candles: ObservedDailyCandle[];
}

export interface FrozenBitcoinMaxMinInput {
  sourceSha256: string;
  data: BitcoinMaxMinSourceFile;
}

export interface EvaluationWindow {
  label: string;
  startTs: number;
  endExclusiveTs: number;
}

export interface StableStrategyMetrics {
  days: number;
  exposureDays: number;
  exposureFraction: number;
  completedEpisodes: number;
  delayedEntries: number;
  observedGapDays: number;
  compoundedReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpe: number | null;
  maximumDrawdown: number;
  calmar: number | null;
  meanEpisodeReturn: number | null;
  episodeReturnTStatistic: number | null;
  episodeWinRate: number | null;
  episodeProfitFactor: number | null;
  breakEvenSideCostPct: number | null;
}

interface RawStrategyMetrics extends StableStrategyMetrics {
  equity: number[];
  episodeReturns: number[];
}

export interface CostReadingSet {
  gross: StableStrategyMetrics;
  'fee-only': StableStrategyMetrics;
  headline: StableStrategyMetrics;
  stress: StableStrategyMetrics;
}

export interface FoldResult {
  label: string;
  from: string;
  toExclusive: string;
  readings: CostReadingSet;
}

export interface ConfigurationResult {
  lookback: BitcoinMaxMinLookback;
  component: BitcoinMaxMinComponent;
  full: CostReadingSet;
  holdout: CostReadingSet;
  folds: FoldResult[];
}

export interface SeriesQa {
  symbol: BitcoinMaxMinSymbol;
  sourceIdentityPassed: boolean;
  inputHashPassed: boolean;
  subsetHashPassed: boolean;
  bars: number;
  from: string;
  to: string;
  utcDailyAligned: boolean;
  strictlyIncreasing: boolean;
  validOhlcv: boolean;
  completeDays: number;
  incompleteDays: Array<{ date: string; missingHourUtc: number }>;
  expectedGapInventoryPassed: boolean;
  prefixInvariancePassed: boolean;
  passed: boolean;
  errors: string[];
}

export interface GateCheck {
  id: string;
  value: number | null;
  requirement: string;
  passed: boolean;
}

export interface CandidateGateMetrics {
  full: StableStrategyMetrics;
  holdout: StableStrategyMetrics;
  folds: StableStrategyMetrics[];
  benchmarkFull: StableStrategyMetrics;
}

export interface BitcoinMaxMinDecision {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  btcReplicationPassed: boolean;
  crossAssetConfirmationPassed: boolean;
  performanceGatesEvaluated: boolean;
  eligibleForProspectiveReview: boolean;
  activationApproved: false;
  publicationApproved: false;
  btcGates: GateCheck[];
  ethGates: GateCheck[];
}

export interface BitcoinMaxMinArtifact {
  meta: {
    schemaVersion: 1;
    task: 'TC-258';
    studyDate: '2026-08-29';
    catalogCommit: string;
    sourceAudit: string;
    sourceAuditSha256: string;
    preregistration: string;
    preregistrationSha256: string;
    primaryPaperSha256: string;
  };
  spec: {
    headlineConfiguration: 'composite-10';
    configurations: BitcoinMaxMinConfiguration[];
    lookbacks: BitcoinMaxMinLookback[];
    components: BitcoinMaxMinComponent[];
    symbols: BitcoinMaxMinSymbol[];
    originalMarket: 'BTCUSD';
    externalFalsificationMarket: 'ETHUSD';
    fills: string;
    costsPctPerSide: Record<CostReading, number>;
    folds: 4;
    holdoutFrom: string;
    endExclusive: string;
    noParameterSearch: true;
    researchOnly: true;
    intradayCostScreen: {
      publishedGrossAnnualizedReturn: 0.33;
      expectedRoundTripsPerYear: 365.25;
      breakEvenCostPctPerSide: number;
      feeOnlyImpliedAnnualizedNet: number;
      headlineImpliedAnnualizedNet: number;
      disposition: 'no-go-without-local-return-test';
    };
  };
  sources: Record<BitcoinMaxMinSymbol, {
    source: string;
    venue: string;
    license: string;
    sourceSha256: string;
    sourceSubsetSha256: string;
    bars: number;
    from: string;
    to: string;
  }>;
  qa: {
    series: Record<BitcoinMaxMinSymbol, SeriesQa>;
    passed: boolean;
  };
  windows: Record<BitcoinMaxMinSymbol, {
    full: { from: string; toExclusive: string };
    holdout: { from: string; toExclusive: string };
    folds: Array<{ label: string; from: string; toExclusive: string }>;
  }>;
  results: null | {
    symbols: Record<BitcoinMaxMinSymbol, {
      configurations: Record<BitcoinMaxMinConfiguration, ConfigurationResult>;
      benchmarks: {
        full: CostReadingSet;
        holdout: CostReadingSet;
      };
      paperWindowGrossControl: StableStrategyMetrics | null;
    }>;
  };
  decision: BitcoinMaxMinDecision;
}

const EXPECTED_INPUT_BARS: Record<BitcoinMaxMinSymbol, number> = {
  BTCUSD: 3_901,
  ETHUSD: 3_735,
};

const EXPECTED_INPUT_START: Record<BitcoinMaxMinSymbol, number> = {
  BTCUSD: Date.UTC(2015, 10, 26),
  ETHUSD: Date.UTC(2016, 4, 10),
};

const EXPECTED_GAPS = [
  { date: '2019-11-13', missingHourUtc: 0 },
  { date: '2019-11-20', missingHourUtc: 2 },
  { date: '2019-12-17', missingHourUtc: 1 },
];

const COST_RATIOS: Record<CostReading, number> = {
  gross: 0,
  'fee-only': 0.001,
  headline: 0.0025,
  stress: 0.004,
};

function round(value: number, digits = 8): number {
  return Number(value.toFixed(digits));
}

function finiteRound(value: number | null, digits = 8): number | null {
  return value === null || !Number.isFinite(value) ? null : round(value, digits);
}

function iso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values)!;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
    / (values.length - 1);
  return Math.sqrt(variance);
}

function tStatistic(values: number[]): number | null {
  const average = mean(values);
  const deviation = sampleStandardDeviation(values);
  if (average === null || deviation === null || deviation === 0) return null;
  return average / (deviation / Math.sqrt(values.length));
}

function maximumDrawdown(equity: number[]): number {
  let peak = equity[0] ?? 1;
  let maximum = 0;
  for (const value of equity) {
    peak = Math.max(peak, value);
    maximum = Math.max(maximum, peak > 0 ? (peak - value) / peak : 0);
  }
  return maximum;
}

function annualizedReturn(finalEquity: number, days: number): number {
  if (days <= 0 || finalEquity <= 0) return -1;
  return finalEquity ** (YEAR_DAYS / days) - 1;
}

function profitFactor(returns: number[]): number | null {
  const gains = returns.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(
    returns.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
  );
  if (losses === 0) return gains > 0 ? null : 0;
  return gains / losses;
}

function stabilizeMetrics(metrics: RawStrategyMetrics): StableStrategyMetrics {
  return {
    days: metrics.days,
    exposureDays: metrics.exposureDays,
    exposureFraction: round(metrics.exposureFraction),
    completedEpisodes: metrics.completedEpisodes,
    delayedEntries: metrics.delayedEntries,
    observedGapDays: metrics.observedGapDays,
    compoundedReturn: round(metrics.compoundedReturn),
    annualizedReturn: round(metrics.annualizedReturn),
    annualizedVolatility: round(metrics.annualizedVolatility),
    sharpe: finiteRound(metrics.sharpe),
    maximumDrawdown: round(metrics.maximumDrawdown),
    calmar: finiteRound(metrics.calmar),
    meanEpisodeReturn: finiteRound(metrics.meanEpisodeReturn),
    episodeReturnTStatistic: finiteRound(metrics.episodeReturnTStatistic),
    episodeWinRate: finiteRound(metrics.episodeWinRate),
    episodeProfitFactor: finiteRound(metrics.episodeProfitFactor),
    breakEvenSideCostPct: finiteRound(metrics.breakEvenSideCostPct),
  };
}

export function configurationId(
  component: BitcoinMaxMinComponent,
  lookback: BitcoinMaxMinLookback,
): BitcoinMaxMinConfiguration {
  return `${component}-${lookback}`;
}

export function buildExtremaExposure(
  candles: readonly ObservedDailyCandle[],
  lookback: BitcoinMaxMinLookback,
  component: BitcoinMaxMinComponent,
): boolean[] {
  return candles.map((_candle, index) => {
    if (index < lookback) return false;
    const previousCloses = candles.slice(index - lookback, index).map((item) => item.close);
    const priorClose = previousCloses.at(-1)!;
    const atMax = priorClose === Math.max(...previousCloses);
    const atMin = priorClose === Math.min(...previousCloses);
    if (component === 'at-max') return atMax;
    if (component === 'at-min') return atMin;
    return atMax || atMin;
  });
}

export function chronologicalFolds(
  startTs: number,
  endExclusiveTs: number,
): EvaluationWindow[] {
  const totalDays = (endExclusiveTs - startTs) / DAY_MS;
  if (!Number.isSafeInteger(totalDays) || totalDays < FOLD_COUNT) {
    throw new Error('fold window must contain at least four aligned UTC days');
  }
  const baseDays = Math.floor(totalDays / FOLD_COUNT);
  const folds: EvaluationWindow[] = [];
  let cursor = startTs;
  for (let index = 0; index < FOLD_COUNT; index += 1) {
    const next = index === FOLD_COUNT - 1 ? endExclusiveTs : cursor + baseDays * DAY_MS;
    folds.push({ label: `fold-${index + 1}`, startTs: cursor, endExclusiveTs: next });
    cursor = next;
  }
  return folds;
}

export function simulateExtremaWindow(
  candles: readonly ObservedDailyCandle[],
  exposure: readonly boolean[],
  window: EvaluationWindow,
  sideCostRatio: number,
): RawStrategyMetrics {
  if (candles.length !== exposure.length) throw new Error('candles and exposure must align');
  if (!Number.isFinite(sideCostRatio) || sideCostRatio < 0 || sideCostRatio >= 1) {
    throw new Error('side cost ratio must be in [0, 1)');
  }
  const indices = candles
    .map((candle, index) => ({ candle, index }))
    .filter(({ candle }) => candle.timestamp >= window.startTs && candle.timestamp < window.endExclusiveTs)
    .map(({ index }) => index);
  if (indices.length === 0) throw new Error(`${window.label} contains no source days`);

  let equity = 1;
  let units = 0;
  let inPosition = false;
  let entryPrice = 0;
  let exposureDays = 0;
  let delayedEntries = 0;
  const episodeReturns: number[] = [];
  const equityCurve = [1];

  for (let offset = 0; offset < indices.length; offset += 1) {
    const index = indices[offset];
    const candle = candles[index];
    const exposed = exposure[index];
    const nextIndex = indices[offset + 1];
    const nextExposed = nextIndex !== undefined && exposure[nextIndex];

    if (exposed) {
      exposureDays += 1;
      if (!inPosition) {
        equity *= 1 - sideCostRatio;
        units = equity / candle.open;
        entryPrice = candle.open;
        inPosition = true;
        if (candle.missingHourUtc === 0) delayedEntries += 1;
      }
      equity = units * candle.close;
      if (!nextExposed) {
        equity *= 1 - sideCostRatio;
        units = 0;
        inPosition = false;
        const grossFactor = candle.close / entryPrice;
        episodeReturns.push(grossFactor * (1 - sideCostRatio) ** 2 - 1);
      }
    } else if (inPosition) {
      throw new Error('position state diverged from the frozen exposure schedule');
    }
    equityCurve.push(equity);
  }

  if (inPosition) throw new Error('window did not force-close its terminal position');
  const dailyReturns = equityCurve.slice(1).map((value, index) => value / equityCurve[index] - 1);
  const dailyMean = mean(dailyReturns) ?? 0;
  const dailyDeviation = sampleStandardDeviation(dailyReturns) ?? 0;
  const volatility = dailyDeviation * Math.sqrt(YEAR_DAYS);
  const annualized = annualizedReturn(equity, indices.length);
  const drawdown = maximumDrawdown(equityCurve);
  const grossEpisodeFactor = episodeReturns.reduce(
    (factor, episodeReturn) => factor * ((episodeReturn + 1) / (1 - sideCostRatio) ** 2),
    1,
  );
  const breakEvenRatio = episodeReturns.length === 0 || grossEpisodeFactor <= 1
    ? 0
    : 1 - grossEpisodeFactor ** (-1 / (2 * episodeReturns.length));

  return {
    days: indices.length,
    exposureDays,
    exposureFraction: exposureDays / indices.length,
    completedEpisodes: episodeReturns.length,
    delayedEntries,
    observedGapDays: indices.filter((index) => candles[index].observedHourlyBars !== 24).length,
    compoundedReturn: equity - 1,
    annualizedReturn: annualized,
    annualizedVolatility: volatility,
    sharpe: dailyDeviation === 0 ? null : dailyMean / dailyDeviation * Math.sqrt(YEAR_DAYS),
    maximumDrawdown: drawdown,
    calmar: drawdown === 0 ? null : annualized / drawdown,
    meanEpisodeReturn: mean(episodeReturns),
    episodeReturnTStatistic: tStatistic(episodeReturns),
    episodeWinRate: episodeReturns.length === 0
      ? null
      : episodeReturns.filter((value) => value > 0).length / episodeReturns.length,
    episodeProfitFactor: profitFactor(episodeReturns),
    breakEvenSideCostPct: breakEvenRatio * 100,
    equity: equityCurve,
    episodeReturns,
  };
}

function evaluateReadings(
  candles: readonly ObservedDailyCandle[],
  exposure: readonly boolean[],
  window: EvaluationWindow,
): CostReadingSet {
  return Object.fromEntries(
    (Object.entries(COST_RATIOS) as Array<[CostReading, number]>).map(([label, ratio]) => [
      label,
      stabilizeMetrics(simulateExtremaWindow(candles, exposure, window, ratio)),
    ]),
  ) as unknown as CostReadingSet;
}

function evaluateConfiguration(
  candles: readonly ObservedDailyCandle[],
  fullWindow: EvaluationWindow,
  holdoutWindow: EvaluationWindow,
  folds: readonly EvaluationWindow[],
  lookback: BitcoinMaxMinLookback,
  component: BitcoinMaxMinComponent,
): ConfigurationResult {
  const exposure = buildExtremaExposure(candles, lookback, component);
  return {
    lookback,
    component,
    full: evaluateReadings(candles, exposure, fullWindow),
    holdout: evaluateReadings(candles, exposure, holdoutWindow),
    folds: folds.map((fold) => ({
      label: fold.label,
      from: iso(fold.startTs),
      toExclusive: iso(fold.endExclusiveTs),
      readings: evaluateReadings(candles, exposure, fold),
    })),
  };
}

function paperCloseToCloseCandles(
  candles: readonly ObservedDailyCandle[],
): ObservedDailyCandle[] {
  return candles.map((candle, index) => ({
    ...candle,
    open: index === 0 ? candle.open : candles[index - 1].close,
  }));
}

function validateSeries(input: FrozenBitcoinMaxMinInput): SeriesQa {
  const { data } = input;
  const symbol = data.symbol;
  const errors: string[] = [];
  const sourceIdentityPassed = data.schemaVersion === 1
    && data.source === 'cryptodatadownload-gemini-h1'
    && data.venue === 'Gemini'
    && data.sourceLicense === 'CC-BY-NC-SA-4.0'
    && data.timeframe === 'D1-UTC-from-observed-H1';
  if (!sourceIdentityPassed) errors.push('source identity or schema does not match the frozen protocol');
  const inputHashPassed = input.sourceSha256 === BITCOIN_MAX_MIN_EXPECTED_INPUT_SHA256[symbol];
  if (!inputHashPassed) errors.push('canonical input SHA-256 does not match');
  const subsetHashPassed = data.sourceSubsetSha256 === BITCOIN_MAX_MIN_EXPECTED_SUBSET_SHA256[symbol];
  if (!subsetHashPassed) errors.push('observed-H1 subset SHA-256 does not match');
  if (data.candles.length !== EXPECTED_INPUT_BARS[symbol]) errors.push('daily bar count does not match');

  let utcDailyAligned = true;
  let strictlyIncreasing = true;
  let validOhlcv = true;
  for (let index = 0; index < data.candles.length; index += 1) {
    const candle = data.candles[index];
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp % DAY_MS !== 0) {
      utcDailyAligned = false;
    }
    if (index > 0 && candle.timestamp - data.candles[index - 1].timestamp !== DAY_MS) {
      strictlyIncreasing = false;
    }
    if (
      ![candle.open, candle.high, candle.low, candle.close].every(
        (value) => Number.isFinite(value) && value > 0,
      )
      || candle.high < Math.max(candle.open, candle.close)
      || candle.low > Math.min(candle.open, candle.close)
      || candle.high < candle.low
      || !Number.isFinite(candle.volume)
      || candle.volume < 0
      || ![23, 24].includes(candle.observedHourlyBars)
      || (candle.observedHourlyBars === 24 && candle.missingHourUtc !== null)
      || (candle.observedHourlyBars === 23
        && (!Number.isSafeInteger(candle.missingHourUtc) || candle.missingHourUtc! < 0 || candle.missingHourUtc! > 23))
    ) {
      validOhlcv = false;
    }
  }
  if (!utcDailyAligned) errors.push('one or more timestamps are not UTC-day aligned');
  if (!strictlyIncreasing) errors.push('daily timestamps are not contiguous and strictly increasing');
  if (!validOhlcv) errors.push('one or more observed daily candles are invalid');

  const firstTs = data.candles[0]?.timestamp;
  const finalTs = data.candles.at(-1)?.timestamp;
  if (firstTs !== EXPECTED_INPUT_START[symbol]) errors.push('input start does not match');
  if (finalTs !== BITCOIN_MAX_MIN_END_EXCLUSIVE_TS - DAY_MS) errors.push('input end does not match');
  const incompleteDays = data.candles
    .filter((candle) => candle.observedHourlyBars !== 24)
    .map((candle) => ({
      date: iso(candle.timestamp).slice(0, 10),
      missingHourUtc: candle.missingHourUtc!,
    }));
  const expectedGapInventoryPassed = JSON.stringify(incompleteDays) === JSON.stringify(EXPECTED_GAPS);
  if (!expectedGapInventoryPassed) errors.push('missing-hour inventory does not match');

  const fullExposure = buildExtremaExposure(data.candles, 10, 'composite');
  const checkpoints = [0.25, 0.5, 0.75, 0.9].map((fraction) => (
    Math.max(20, Math.floor(data.candles.length * fraction))
  ));
  const prefixInvariancePassed = checkpoints.every((length) => (
    JSON.stringify(buildExtremaExposure(data.candles.slice(0, length), 10, 'composite'))
      === JSON.stringify(fullExposure.slice(0, length))
  ));
  if (!prefixInvariancePassed) errors.push('MAX10/MIN10 signal is not prefix invariant');

  return {
    symbol,
    sourceIdentityPassed,
    inputHashPassed,
    subsetHashPassed,
    bars: data.candles.length,
    from: firstTs === undefined ? '' : iso(firstTs),
    to: finalTs === undefined ? '' : iso(finalTs),
    utcDailyAligned,
    strictlyIncreasing,
    validOhlcv,
    completeDays: data.candles.filter((candle) => candle.observedHourlyBars === 24).length,
    incompleteDays,
    expectedGapInventoryPassed,
    prefixInvariancePassed,
    passed: errors.length === 0,
    errors,
  };
}

function gate(
  id: string,
  value: number | null,
  requirement: string,
  passed: boolean,
): GateCheck {
  return { id, value: finiteRound(value), requirement, passed };
}

function buildAssetGates(
  label: 'btc' | 'eth',
  metrics: CandidateGateMetrics,
): GateCheck[] {
  const positiveFolds = metrics.folds.filter((fold) => fold.compoundedReturn > 0).length;
  return [
    gate(`${label}-full-net-positive`, metrics.full.compoundedReturn, '> 0', metrics.full.compoundedReturn > 0),
    gate(`${label}-mean-episode-positive`, metrics.full.meanEpisodeReturn, '> 0', (metrics.full.meanEpisodeReturn ?? -Infinity) > 0),
    gate(`${label}-episode-t-stat`, metrics.full.episodeReturnTStatistic, '>= 1.96', (metrics.full.episodeReturnTStatistic ?? -Infinity) >= 1.96),
    gate(`${label}-full-episodes`, metrics.full.completedEpisodes, '>= 50', metrics.full.completedEpisodes >= 50),
    gate(`${label}-positive-folds`, positiveFolds, '>= 3 of 4', positiveFolds >= 3),
    gate(`${label}-holdout-episodes`, metrics.holdout.completedEpisodes, '>= 20', metrics.holdout.completedEpisodes >= 20),
    gate(`${label}-holdout-net-positive`, metrics.holdout.compoundedReturn, '> 0', metrics.holdout.compoundedReturn > 0),
    gate(`${label}-holdout-mean-positive`, metrics.holdout.meanEpisodeReturn, '> 0', (metrics.holdout.meanEpisodeReturn ?? -Infinity) > 0),
    gate(
      `${label}-drawdown-below-spot`,
      metrics.full.maximumDrawdown - metrics.benchmarkFull.maximumDrawdown,
      '< 0 versus costed spot',
      metrics.full.maximumDrawdown < metrics.benchmarkFull.maximumDrawdown,
    ),
    gate(
      `${label}-calmar-above-spot`,
      metrics.full.calmar === null || metrics.benchmarkFull.calmar === null
        ? null
        : metrics.full.calmar - metrics.benchmarkFull.calmar,
      '> 0 versus costed spot',
      metrics.full.calmar !== null
        && metrics.benchmarkFull.calmar !== null
        && metrics.full.calmar > metrics.benchmarkFull.calmar,
    ),
  ];
}

export function decideBitcoinMaxMin(
  qaPassed: boolean,
  btc: CandidateGateMetrics | null,
  eth: CandidateGateMetrics | null,
): BitcoinMaxMinDecision {
  if (!qaPassed || !btc || !eth) {
    return {
      verdict: 'INCONCLUSIVE',
      btcReplicationPassed: false,
      crossAssetConfirmationPassed: false,
      performanceGatesEvaluated: false,
      eligibleForProspectiveReview: false,
      activationApproved: false,
      publicationApproved: false,
      btcGates: [],
      ethGates: [],
    };
  }
  const btcGates = buildAssetGates('btc', btc);
  const ethGates = buildAssetGates('eth', eth);
  const btcReplicationPassed = btcGates.every((item) => item.passed);
  const crossAssetConfirmationPassed = ethGates.every((item) => item.passed);
  return {
    verdict: btcReplicationPassed ? 'PASS' : 'FAIL',
    btcReplicationPassed,
    crossAssetConfirmationPassed,
    performanceGatesEvaluated: true,
    eligibleForProspectiveReview: btcReplicationPassed && crossAssetConfirmationPassed,
    activationApproved: false,
    publicationApproved: false,
    btcGates,
    ethGates,
  };
}

function intradayCostScreen(): BitcoinMaxMinArtifact['spec']['intradayCostScreen'] {
  const annualGross = 0.33;
  const roundTrips = 365.25;
  const breakEvenRatio = 1 - (1 + annualGross) ** (-1 / (2 * roundTrips));
  return {
    publishedGrossAnnualizedReturn: 0.33,
    expectedRoundTripsPerYear: 365.25,
    breakEvenCostPctPerSide: round(breakEvenRatio * 100),
    feeOnlyImpliedAnnualizedNet: round((1 + annualGross) * (1 - 0.0005) ** (2 * roundTrips) - 1),
    headlineImpliedAnnualizedNet: round((1 + annualGross) * (1 - 0.0025) ** (2 * roundTrips) - 1),
    disposition: 'no-go-without-local-return-test',
  };
}

export function assembleBitcoinMaxMinReplication(
  inputs: readonly FrozenBitcoinMaxMinInput[],
): BitcoinMaxMinArtifact {
  const bySymbol = new Map(inputs.map((input) => [input.data.symbol, input]));
  if (inputs.length !== BITCOIN_MAX_MIN_SYMBOLS.length || bySymbol.size !== inputs.length) {
    throw new Error('TC-258 requires exactly one BTCUSD and one ETHUSD source input');
  }
  const ordered = BITCOIN_MAX_MIN_SYMBOLS.map((symbol) => {
    const input = bySymbol.get(symbol);
    if (!input) throw new Error(`TC-258 source input is missing ${symbol}`);
    return input;
  });
  const qaSeries = Object.fromEntries(ordered.map((input) => [
    input.data.symbol,
    validateSeries(input),
  ])) as Record<BitcoinMaxMinSymbol, SeriesQa>;
  const qaPassed = BITCOIN_MAX_MIN_SYMBOLS.every((symbol) => qaSeries[symbol].passed);
  const configurations = BITCOIN_MAX_MIN_COMPONENTS.flatMap((component) => (
    BITCOIN_MAX_MIN_LOOKBACKS.map((lookback) => configurationId(component, lookback))
  ));
  const windows = Object.fromEntries(BITCOIN_MAX_MIN_SYMBOLS.map((symbol) => {
    const full: EvaluationWindow = {
      label: `${symbol}-full`,
      startTs: BITCOIN_MAX_MIN_EVALUATION_START_TS[symbol],
      endExclusiveTs: BITCOIN_MAX_MIN_END_EXCLUSIVE_TS,
    };
    const holdout: EvaluationWindow = {
      label: `${symbol}-holdout`,
      startTs: BITCOIN_MAX_MIN_HOLDOUT_TS,
      endExclusiveTs: BITCOIN_MAX_MIN_END_EXCLUSIVE_TS,
    };
    const folds = chronologicalFolds(full.startTs, full.endExclusiveTs);
    return [symbol, {
      full: { from: iso(full.startTs), toExclusive: iso(full.endExclusiveTs) },
      holdout: { from: iso(holdout.startTs), toExclusive: iso(holdout.endExclusiveTs) },
      folds: folds.map((fold) => ({
        label: fold.label,
        from: iso(fold.startTs),
        toExclusive: iso(fold.endExclusiveTs),
      })),
    }];
  })) as BitcoinMaxMinArtifact['windows'];
  const sources = Object.fromEntries(ordered.map((input) => [input.data.symbol, {
    source: input.data.source,
    venue: input.data.venue,
    license: input.data.sourceLicense,
    sourceSha256: input.sourceSha256,
    sourceSubsetSha256: input.data.sourceSubsetSha256,
    bars: input.data.candles.length,
    from: iso(input.data.candles[0].timestamp),
    to: iso(input.data.candles.at(-1)!.timestamp),
  }])) as BitcoinMaxMinArtifact['sources'];

  let results: BitcoinMaxMinArtifact['results'] = null;
  let decision = decideBitcoinMaxMin(false, null, null);
  if (qaPassed) {
    const evaluated = Object.fromEntries(ordered.map((input) => {
      const symbol = input.data.symbol;
      const full: EvaluationWindow = {
        label: `${symbol}-full`,
        startTs: BITCOIN_MAX_MIN_EVALUATION_START_TS[symbol],
        endExclusiveTs: BITCOIN_MAX_MIN_END_EXCLUSIVE_TS,
      };
      const holdout: EvaluationWindow = {
        label: `${symbol}-holdout`,
        startTs: BITCOIN_MAX_MIN_HOLDOUT_TS,
        endExclusiveTs: BITCOIN_MAX_MIN_END_EXCLUSIVE_TS,
      };
      const folds = chronologicalFolds(full.startTs, full.endExclusiveTs);
      const configResults = Object.fromEntries(BITCOIN_MAX_MIN_COMPONENTS.flatMap((component) => (
        BITCOIN_MAX_MIN_LOOKBACKS.map((lookback) => {
          const id = configurationId(component, lookback);
          return [id, evaluateConfiguration(
            input.data.candles,
            full,
            holdout,
            folds,
            lookback,
            component,
          )];
        })
      ))) as Record<BitcoinMaxMinConfiguration, ConfigurationResult>;
      const alwaysExposed = input.data.candles.map(() => true);
      const headlineExposure = buildExtremaExposure(input.data.candles, 10, 'composite');
      const paperWindow = symbol === 'BTCUSD'
        ? stabilizeMetrics(simulateExtremaWindow(
          paperCloseToCloseCandles(input.data.candles),
          headlineExposure,
          {
            label: 'BTCUSD-paper-window-gross-control',
            startTs: BITCOIN_MAX_MIN_EVALUATION_START_TS.BTCUSD,
            endExclusiveTs: BITCOIN_MAX_MIN_HOLDOUT_TS,
          },
          0,
        ))
        : null;
      return [symbol, {
        configurations: configResults,
        benchmarks: {
          full: evaluateReadings(input.data.candles, alwaysExposed, full),
          holdout: evaluateReadings(input.data.candles, alwaysExposed, holdout),
        },
        paperWindowGrossControl: paperWindow,
      }];
    })) as NonNullable<BitcoinMaxMinArtifact['results']>['symbols'];
    results = { symbols: evaluated };

    function candidate(symbol: BitcoinMaxMinSymbol): CandidateGateMetrics {
      const record = evaluated[symbol];
      const headline = record.configurations['composite-10'];
      return {
        full: headline.full.headline,
        holdout: headline.holdout.headline,
        folds: headline.folds.map((fold) => fold.readings.headline),
        benchmarkFull: record.benchmarks.full.headline,
      };
    }
    decision = decideBitcoinMaxMin(true, candidate('BTCUSD'), candidate('ETHUSD'));
  }

  return {
    meta: {
      schemaVersion: 1,
      task: 'TC-258',
      studyDate: '2026-08-29',
      catalogCommit: 'd9c98521c76662d5eae03ab97a4fc721d010dde3',
      sourceAudit: 'docs/research/2026-08-29-bitcoin-seasonality-max-min-source-audit.md',
      sourceAuditSha256: '834008ed2e8107d8f613c15096edaf9f225d8c43487efa123fb78f4056cafd82',
      preregistration: 'docs/plans/2026-08-29-bitcoin-max-min-replication.md',
      preregistrationSha256: '52b16a106559213c3fd42d42b25fd552dbab19bc250a61922ce7fb7fcc0f8e8a',
      primaryPaperSha256: 'a8e7f1e4bb134a2ff3dea458872583463de2b69e8b895202a7d5b57ca99596a1',
    },
    spec: {
      headlineConfiguration: 'composite-10',
      configurations,
      lookbacks: [...BITCOIN_MAX_MIN_LOOKBACKS],
      components: [...BITCOIN_MAX_MIN_COMPONENTS],
      symbols: [...BITCOIN_MAX_MIN_SYMBOLS],
      originalMarket: 'BTCUSD',
      externalFalsificationMarket: 'ETHUSD',
      fills: 'signal on prior UTC last-observed close; enter next UTC first-observed open; hold adjacent event days; exit last-observed close',
      costsPctPerSide: {
        gross: 0,
        'fee-only': 0.1,
        headline: 0.25,
        stress: 0.4,
      },
      folds: 4,
      holdoutFrom: iso(BITCOIN_MAX_MIN_HOLDOUT_TS),
      endExclusive: iso(BITCOIN_MAX_MIN_END_EXCLUSIVE_TS),
      noParameterSearch: true,
      researchOnly: true,
      intradayCostScreen: intradayCostScreen(),
    },
    sources,
    qa: { series: qaSeries, passed: qaPassed },
    windows,
    results,
    decision,
  };
}

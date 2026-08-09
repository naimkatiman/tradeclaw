export type StrategyStudyStatus = 'paper-pass' | 'rejected' | 'inconclusive';

export type StrategyMetricFormat =
  | 'signed-ratio-percent'
  | 'ratio-percent'
  | 'signed-percent-points'
  | 'percent-points'
  | 'decimal'
  | 'integer'
  | 'text';

export interface StrategyStudyMetric {
  label: string;
  value: number | string;
  format: StrategyMetricFormat;
  digits?: number;
  suffix?: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

export interface StrategyStudyRecord {
  id: string;
  name: string;
  shortName: string;
  status: StrategyStudyStatus;
  statusLabel: string;
  evidence: string;
  headline: StrategyStudyMetric;
  metrics: readonly StrategyStudyMetric[];
  universe: string;
  window: string;
  rule: string;
  costs: string;
  decision: string;
  caveat: string;
  artifactFile: string;
}

export interface ExperimentShelfEntry {
  file: string;
  runDate: string;
  label: string;
  disposition: 'featured-source' | 'shelved';
  reason: string;
}

export const EXPERIMENT_ARTIFACT_BASE =
  'https://github.com/naimkatiman/tradeclaw/blob/main/docs/research/experiments';

export const DEFAULT_STRATEGY_STUDY_ID = 'd1-slow-gate';

export const STRATEGY_STUDY_SELECTION_POLICY =
  'Default selection uses evidence tier first, then validation date and stable id. Return is never a sorting or promotion field.';

export const FEATURED_STRATEGY_STUDIES: readonly StrategyStudyRecord[] = [
  {
    id: 'd1-slow-gate',
    name: 'D1 Slow Gate 50/50',
    shortName: 'D1 Slow Gate',
    status: 'paper-pass',
    statusLabel: 'Paper-pass / tracked prospectively',
    evidence: 'Pre-registered walk-forward',
    headline: {
      label: 'Modeled total return',
      value: 6.36828512,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'positive',
    },
    metrics: [
      { label: 'Identically costed hold', value: 2.39124529, format: 'signed-ratio-percent', digits: 2 },
      { label: 'Modeled CAGR', value: 0.25222516, format: 'signed-ratio-percent', digits: 2 },
      { label: 'Modeled max drawdown', value: -0.56166088, format: 'signed-ratio-percent', digits: 2, tone: 'negative' },
      { label: 'Calmar / fold gate', value: '0.449 / 3 of 4', format: 'text' },
    ],
    universe: 'BTCUSD + ETHUSD / D1 / fixed 50-50 independent sleeves',
    window: '2017-09-01 to 2026-07-16 / 3,241 bars per symbol',
    rule: 'Close above EMA200, long/flat; ATR14 x 2.5 stop with a 4.0% floor',
    costs: '0.05% fee + 0.15% slippage per side + fixed funding assumption',
    decision:
      'PASS under the frozen rule: integrity QA, positive net return, Calmar at least hold in 3 of 4 folds, and frequency ceilings all cleared.',
    caveat:
      'This green figure is a historical OHLCV simulation with modeled fills and funding. It is not live performance or a broker return. The BTC/ETH-only universe carries survivor-selection risk; prospective tracking began without backfilling historical rows.',
    artifactFile:
      'd1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json',
  },
  {
    id: 'classic-h1',
    name: 'Classic Momentum H1',
    shortName: 'Classic H1',
    status: 'rejected',
    statusLabel: 'Rejected',
    evidence: 'Registered costed comparison',
    headline: {
      label: 'Costed total return',
      value: -0.1112,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'negative',
    },
    metrics: [
      { label: 'Trades', value: 375, format: 'integer' },
      { label: 'Win rate', value: 0.3307, format: 'ratio-percent', digits: 2 },
      { label: 'Profit factor', value: 0.809, format: 'decimal', digits: 3 },
      { label: 'Modeled max drawdown', value: -0.1417, format: 'signed-ratio-percent', digits: 2, tone: 'negative' },
    ],
    universe: 'BTCUSD / H1 / 17,497 bars',
    window: '2024-06-10 to 2026-06-09 / four folds',
    rule: 'Classic momentum entry; ATR14 x 2.5 stop and 2R target',
    costs: 'Production crypto-perpetual fee, slippage, and funding assumptions',
    decision: 'REJECTED: the registered production-cost comparison was net-negative.',
    caveat: 'One BTC historical window; modeled OHLCV fills, not an execution ledger.',
    artifactFile:
      'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
  },
  {
    id: 'regime-aware-h1',
    name: 'Regime-aware H1',
    shortName: 'Regime-aware',
    status: 'inconclusive',
    statusLabel: 'Inconclusive / thin',
    evidence: 'Registered costed comparison',
    headline: {
      label: 'Costed total return',
      value: 0.0063,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'neutral',
    },
    metrics: [
      { label: 'Trades', value: 6, format: 'integer' },
      { label: 'Win rate', value: 0.5, format: 'ratio-percent', digits: 1 },
      { label: 'Profit factor', value: 2.028, format: 'decimal', digits: 3 },
      { label: 'Average modeled cost', value: 0.441, format: 'percent-points', digits: 3 },
    ],
    universe: 'BTCUSD / H1 / 17,497 bars',
    window: '2024-06-10 to 2026-06-09 / four folds',
    rule: 'Regime-aware entry; ATR14 x 2.5 stop and 2R target',
    costs: 'Production crypto-perpetual fee, slippage, and funding assumptions',
    decision:
      'INCONCLUSIVE: the positive full-window cell contains only six trades and cannot support promotion.',
    caveat: 'A positive number is not painted green when the sample is too thin to establish an edge.',
    artifactFile:
      'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
  },
  {
    id: 'vwap-ema-bb-h1',
    name: 'VWAP + EMA + Bollinger H1',
    shortName: 'VWAP + EMA + BB',
    status: 'rejected',
    statusLabel: 'Rejected / thin',
    evidence: 'Registered costed comparison',
    headline: {
      label: 'Costed total return',
      value: -0.0081,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'negative',
    },
    metrics: [
      { label: 'Trades', value: 6, format: 'integer' },
      { label: 'Win rate', value: 0.1667, format: 'ratio-percent', digits: 2 },
      { label: 'Profit factor', value: 0.345, format: 'decimal', digits: 3 },
      { label: 'Modeled max drawdown', value: -0.0081, format: 'signed-ratio-percent', digits: 2, tone: 'negative' },
    ],
    universe: 'BTCUSD / H1 / 17,497 bars',
    window: '2024-06-10 to 2026-06-09 / four folds',
    rule: 'VWAP, EMA, and Bollinger mean-reversion entry; ATR14 x 2.5 stop and 2R target',
    costs: 'Production crypto-perpetual fee, slippage, and funding assumptions',
    decision: 'REJECTED: negative after modeled costs, with only six full-window trades.',
    caveat: 'Thin sample and one BTC historical window; not evidence of live execution performance.',
    artifactFile:
      'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
  },
  {
    id: 'daily-momentum',
    name: 'Daily Momentum / 10 Majors',
    shortName: 'Daily Momentum',
    status: 'rejected',
    statusLabel: 'Marginal / rejected',
    evidence: 'Registered four-fold validation',
    headline: {
      label: 'Mean return excluding two flukes',
      value: -0.052474,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'negative',
    },
    metrics: [
      { label: 'Raw mean return', value: 0.249158, format: 'signed-ratio-percent', digits: 2, tone: 'neutral' },
      { label: 'Positive and adequate symbols', value: '4 of 10', format: 'text' },
      { label: 'Fold stability', value: 0.375, format: 'ratio-percent', digits: 1 },
      { label: 'Thin fold cells', value: '32 of 40', format: 'text' },
    ],
    universe: 'BTC, ETH, SOL, BNB, XRP, ADA, DOGE, DOT, LINK, AVAX / D1',
    window: 'Approximately 2020-06 to 2026-06 / four folds',
    rule: '28-day time-series momentum, signal-flip exit',
    costs: 'Production crypto-perpetual fee, slippage, and funding assumptions',
    decision:
      'MARGINAL-REJECTED: only 4 of 10 symbols cleared breadth and fold stability was 37.5%; SOL and AVAX drove the positive raw mean.',
    caveat: 'The raw +24.92% mean is retained beside the bias check; it is not used as the headline.',
    artifactFile:
      'daily-momentum-validation-BTCUSD_ETHUSD_SOLUSD_BNBUSD_XRPUSD_ADAUSD_DOGEUSD_DOTUSD_LINKUSD_AVAXUSD-D1-f4.json',
  },
  {
    id: 'funding-carry',
    name: 'Funding-rate Carry',
    shortName: 'Funding Carry',
    status: 'rejected',
    statusLabel: 'Positive / failed gate',
    evidence: 'Registered four-fold validation',
    headline: {
      label: 'Full-window annualized return',
      value: 0.0584356573,
      format: 'signed-ratio-percent',
      digits: 2,
      suffix: '/yr',
      tone: 'neutral',
    },
    metrics: [
      { label: 'Full-window return', value: 0.39501437, format: 'signed-ratio-percent', digits: 2, tone: 'neutral' },
      { label: 'Recent 24-month annualized', value: 0.0235013825, format: 'signed-ratio-percent', digits: 2, suffix: '/yr', tone: 'neutral' },
      { label: 'Modeled max drawdown', value: -0.0072643929, format: 'signed-ratio-percent', digits: 2, tone: 'negative' },
      { label: 'Positive folds', value: '4 of 4', format: 'text' },
    ],
    universe: 'BTC always-on delta-neutral reference; 10-major variants also tested',
    window: '2019-09 to 2026-06 / four folds',
    rule: 'Short perpetual, hold spot, unlevered two-leg capital model',
    costs: '0.70% modeled two-leg round trip',
    decision:
      'FAILED MAGNITUDE GATE: 5.84% annualized was below 8%, and recent 2.35% was below 5%.',
    caveat: 'Profitable in the historical model, but positive is not equivalent to passing the predeclared bar.',
    artifactFile: 'carry-validation-10majors-f4.json',
  },
  {
    id: 'cross-sectional-momentum',
    name: 'Cross-sectional Momentum',
    shortName: 'Cross-section',
    status: 'rejected',
    statusLabel: 'Rejected / survivor-sensitive',
    evidence: 'Registered four-fold validation',
    headline: {
      label: 'Bias-mitigated subwindow return',
      value: -0.4699112906,
      format: 'signed-ratio-percent',
      digits: 2,
      tone: 'negative',
    },
    metrics: [
      { label: 'Full-window return', value: 13.2548123746, format: 'signed-ratio-percent', digits: 2, tone: 'neutral' },
      { label: 'Subwindow basket return', value: -0.502903544, format: 'signed-ratio-percent', digits: 2, tone: 'negative' },
      { label: 'Full-window excess folds', value: '2 of 4', format: 'text' },
      { label: 'Subwindow excess folds', value: '1 of 4', format: 'text' },
    ],
    universe: 'Current 30-major universe / D1 / listing-date-aware inputs',
    window: 'Full: 2020-06 to 2026-06; bias check: 2024-06 onward',
    rule: '14-day rank, weekly rebalance, long-only top five',
    costs: '0.20% per side on actual turnover, also charged to the benchmark',
    decision:
      'REJECTED: fold stability failed, and the current-survivor full window did not survive the bias-mitigated subwindow.',
    caveat: 'The +1,325.48% full-window result remains visible, but is not the headline because it is survivor-sensitive.',
    artifactFile: 'xsection-validation-30majors-D1-lb14-rb7-top5-f4.json',
  },
] as const;

export const EXPERIMENT_SHELF: readonly ExperimentShelfEntry[] = [
  {
    file: 'd1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json',
    runDate: '2026-08-08',
    label: 'D1 slow-gate walk-forward',
    disposition: 'featured-source',
    reason: 'Canonical source for the featured paper-pass; historical model only.',
  },
  {
    file: 'regime-expectancy-live-record-crypto-D1-2026-08-05.json',
    runDate: '2026-08-05',
    label: 'Regime expectancy on the observed signal record',
    disposition: 'shelved',
    reason: 'Hypothesis test on the aggregate observed stream, not a standalone strategy equity record; both directional hypotheses were refuted.',
  },
  {
    file: 'slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json',
    runDate: '2026-07-17',
    label: 'Slow-gate sandbox predecessor',
    disposition: 'shelved',
    reason: 'Predecessor sandbox with different spot-cost and sizing assumptions; superseded for the tracked lane by the frozen build artifact.',
  },
  {
    file: 'xsection-validation-30majors-D1-lb14-rb7-top5-f4.json',
    runDate: '2026-06-13',
    label: 'Cross-sectional momentum validation',
    disposition: 'featured-source',
    reason: 'Canonical source for the featured cross-sectional momentum card; failed its registered stability gate.',
  },
  {
    file: 'carry-validation-10majors-f4.json',
    runDate: '2026-06-13',
    label: 'Funding-rate carry validation',
    disposition: 'featured-source',
    reason: 'Canonical source for the featured carry card; positive history but below both registered magnitude gates.',
  },
  {
    file: 'daily-momentum-validation-BTCUSD_ETHUSD_SOLUSD_BNBUSD_XRPUSD_ADAUSD_DOGEUSD_DOTUSD_LINKUSD_AVAXUSD-D1-f4.json',
    runDate: '2026-06-12',
    label: 'Daily momentum / ten-major validation',
    disposition: 'featured-source',
    reason: 'Canonical source for the featured daily-momentum card; marginal result rejected on breadth and fold stability.',
  },
  {
    file: 'daily-momentum-validation-BTCUSD-D1-f4.json',
    runDate: '2026-06-12',
    label: 'Daily momentum / BTC-only predecessor',
    disposition: 'shelved',
    reason: 'Superseded single-symbol predecessor; the ten-major validation is the canonical breadth test.',
  },
  {
    file: 'regime-routed-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-01-2026-06-01-f4.json',
    runDate: '2026-06-11',
    label: 'Regime-routed walk-forward',
    disposition: 'shelved',
    reason: 'Separate routing validation; the only adequately sampled routed cell was negative on all three symbols.',
  },
  {
    file: 'regime-hmm-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-12-2026-06-11.json',
    runDate: '2026-06-11',
    label: 'Structural HMM diagnostic',
    disposition: 'shelved',
    reason: 'Model diagnostic with no standalone trading return; states separated volatility rather than directional drift.',
  },
  {
    file: 'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
    runDate: '2026-06-10',
    label: 'H1 five-preset production-cost comparison',
    disposition: 'featured-source',
    reason: 'Canonical source for three featured H1 cards. Window-capped HMM Top-3 and Full Risk variants remain in the artifact but are not production-comparable.',
  },
  {
    file: 'BTCUSD-H1-2024-06-10-2026-06-09-legacy-zero-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
    runDate: '2026-06-10',
    label: 'H1 five-preset zero-cost reference',
    disposition: 'shelved',
    reason: 'Legacy zero-cost reference; excluded from featured comparisons because it does not use the production cost model.',
  },
] as const;

export function strategyArtifactUrl(file: string): string {
  return `${EXPERIMENT_ARTIFACT_BASE}/${file}`;
}

export function getStrategyStudy(id: string | null | undefined): StrategyStudyRecord {
  return (
    FEATURED_STRATEGY_STUDIES.find((study) => study.id === id) ??
    FEATURED_STRATEGY_STUDIES.find((study) => study.id === DEFAULT_STRATEGY_STUDY_ID) ??
    FEATURED_STRATEGY_STUDIES[0]
  );
}

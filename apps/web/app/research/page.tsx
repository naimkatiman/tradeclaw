import type { Metadata } from 'next';
import { Navbar } from '../components/navbar';
import { EditorialHeroArt } from '../../components/editorial-hero-art';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Research: What We Tested and Learned | TradeClaw',
  description:
    'TradeClaw research record: fixed study specifications, modeled cost assumptions, benchmarked backtest results, caveats, and committed artifacts.',
  openGraph: {
    title: 'Research: What We Tested and Learned | TradeClaw',
    description:
      'Eight strategy studies, evaluated under published modeled costs and reported with machine-readable artifacts and explicit claim boundaries.',
    url: 'https://tradeclaw.win/research',
    siteName: 'TradeClaw',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw open research record' }],
  },
  alternates: { canonical: 'https://tradeclaw.win/research' },
};

const GH = 'https://github.com/naimkatiman/tradeclaw/blob/main';
const REGISTRY_URL = `${GH}/docs/research/experiments/REGISTRY.md`;
const VERDICT_TIMING = `${GH}/docs/research/2026-06-12-phase4.5-verdict-single-asset-timing.md`;
const VERDICT_CARRY = `${GH}/docs/research/2026-06-13-phase5-verdict-carry-xsection.md`;
const SLOW_GATE_PLAN = `${GH}/docs/plans/2026-07-18-slow-regime-gate-sandbox.md`;
const REGIME_STUDY_PLAN = `${GH}/docs/plans/2026-08-05-regime-expectancy-study.md`;
const D1_SLOW_GATE_BUILD_SPEC = `${GH}/docs/plans/2026-08-08-d1-slow-gate-build-spec.md`;
const D1_SLOW_GATE_PLAN = `${GH}/docs/plans/2026-08-08-d1-slow-gate-walk-forward.md`;
const experiment = (file: string) => `${GH}/docs/research/experiments/${file}`;

type Tone = 'down' | 'neutral';

interface SpecLine {
  label: string;
  value: string;
}

interface ResultRow {
  label: string;
  value: string;
  tone?: Tone;
}

interface ResultBlock {
  caption: string;
  rows: ResultRow[];
}

interface ArtifactLink {
  label: string;
  href: string;
}

interface KillEntry {
  ref: string;
  family: string;
  stamp: string;
  stampTone?: Tone;
  hypothesis: string;
  spec: SpecLine[];
  results: ResultBlock[];
  reading: string;
  artifacts: ArtifactLink[];
}

const ENTRIES: KillEntry[] = [
  {
    ref: 'Phase 2 · registered 2026-06-10',
    family: 'Single-asset hourly timing',
    stamp: 'Killed',
    hypothesis:
      'A technical entry on hourly candles (momentum, mean-reversion, or a regime-aware blend) can pick BTC turning points often enough to pay for itself after fees and slippage.',
    spec: [
      { label: 'Universe', value: 'BTCUSD, H1' },
      { label: 'Window', value: '2024-06-10 to 2026-06-09 (17,497 bars)' },
      { label: 'Entries', value: 'classic, regime-aware, hmm-top3, vwap-ema-bb, full-risk' },
      { label: 'Geometry', value: 'live ATR14 x2.5, TP 2R' },
      { label: 'Costs', value: 'crypto perp, ~0.4% round trip' },
    ],
    results: [
      {
        caption: 'Live geometry, crypto costs charged',
        rows: [
          { label: 'classic momentum', value: '−11.1% · 33% wr', tone: 'down' },
          { label: 'regime-aware', value: '+0.6% · 50% wr', tone: 'neutral' },
          { label: 'hmm-top3 (window-capped)', value: '−0.2% · 33% wr', tone: 'down' },
          { label: 'vwap-ema-bb mean-reversion', value: '−0.8% · 17% wr', tone: 'down' },
          { label: 'full-risk (window-capped)', value: '−0.3% · 33% wr', tone: 'down' },
        ],
      },
      {
        caption: 'Same entries, cost stripped (legacy 2:1 geometry, zero cost)',
        rows: [
          { label: 'regime-aware', value: '+1.3% · 62% wr', tone: 'neutral' },
          { label: 'hmm-top3', value: '+0.4% · 67% wr', tone: 'neutral' },
          { label: 'full-risk', value: '+0.3% · 67% wr', tone: 'neutral' },
          { label: 'classic momentum', value: '−4.3% · 32% wr', tone: 'down' },
          { label: 'vwap-ema-bb', value: '−0.3% · 17% wr', tone: 'down' },
        ],
      },
    ],
    reading:
      'Under the tested risk geometry and crypto-perp cost assumptions, the five headline entries are net-negative. With zero modeled cost, three turn gross-positive in this sample. The assumed roughly 0.4% round trip is larger than the observed edge. One positive modeled-cost cell in the 108-cell edge map, classic momentum with wide 4R targets on H1, reached 0.03 to 0.05% per trade but was too thin to support deployment. Final verdict: this registered test found no deployable single-asset OHLCV timing edge.',
    artifacts: [
      {
        label: 'Costed run JSON (crypto perp)',
        href: experiment('BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json'),
      },
      {
        label: 'Zero-cost reference JSON',
        href: experiment('BTCUSD-H1-2024-06-10-2026-06-09-legacy-zero-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json'),
      },
      { label: 'Verdict: single-asset timing', href: VERDICT_TIMING },
    ],
  },
  {
    ref: 'Phase 4 · registered 2026-06-11',
    family: 'HMM regime routing',
    stamp: 'Failed gates',
    hypothesis:
      'If a hidden-Markov model labels the market as trend, volatile, or range in real time, routing each entry only into the regime that suits it recovers an edge the blended signal buries.',
    spec: [
      { label: 'Universe', value: 'BTCUSD, ETHUSD, SOLUSD, H1' },
      { label: 'Window', value: '2024-06-01 to 2026-06-01, walk-forward 4 folds' },
      { label: 'Model', value: '3-state HMM (trend / volatile / range), trailing-64 Viterbi' },
      { label: 'Routing', value: '{classic, vwap-ema-bb} x {trend, volatile, range}' },
      { label: 'Costs', value: 'crypto perp; E = mean pnl% after costs' },
    ],
    results: [
      {
        caption: 'Only non-thin routed cell, the trend route (classic, n ≥ 142)',
        rows: [
          { label: 'BTCUSD trend route (n142)', value: '−0.452%', tone: 'down' },
          { label: 'ETHUSD trend route (n152)', value: '−0.672%', tone: 'down' },
          { label: 'SOLUSD trend route (n203)', value: '−0.190%', tone: 'down' },
        ],
      },
      {
        caption: 'Regime model diagnostic (why there is nothing to route toward)',
        rows: [
          { label: 'directional trend premium', value: 'none', tone: 'neutral' },
          { label: '|24-bar fwd return| separation', value: '0.0017 to 0.0157', tone: 'neutral' },
          { label: 'regime flips per week (mean)', value: '8.3', tone: 'neutral' },
        ],
      },
    ],
    reading:
      'The regime model is honest about itself: its states separate volatility, not direction, so there is no trend premium to route toward. On paper the gate fails. The one routed cell with an adequate sample, classic momentum in the trend regime, is negative on all three symbols. Every cell that prints positive is thin, under 30 trades, and the positives disagree across symbols. Not a trustworthy edge.',
    artifacts: [
      {
        label: 'Routed walk-forward JSON',
        href: experiment('regime-routed-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-01-2026-06-01-f4.json'),
      },
      {
        label: 'Regime model diagnostic JSON',
        href: experiment('regime-hmm-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-12-2026-06-11.json'),
      },
      { label: 'Verdict: single-asset timing', href: VERDICT_TIMING },
    ],
  },
  {
    ref: 'Phase 4.5 · registered 2026-06-12',
    family: 'Daily time-series momentum',
    stamp: 'Marginal-rejected',
    hypothesis:
      'Test whether a slow 28-day daily-trend rule survives the published cost assumptions across ten majors.',
    spec: [
      { label: 'Universe', value: '10 majors (BTC ETH SOL BNB XRP ADA DOGE DOT LINK AVAX), D1' },
      { label: 'History', value: '~2,090 to 2,190 daily bars each (2020 to 2026)' },
      { label: 'Signal', value: '28-day TS momentum; 4 folds; no parameters tuned' },
      { label: 'Costs', value: 'crypto perp' },
      { label: 'Bar to clear', value: 'mean and expectancy > 0, ≥ 6/10 symbols adequate, fold stability > 50%' },
    ],
    results: [
      {
        caption: 'Three configs against the deployable bar',
        rows: [
          { label: 'signal-flip mean', value: '+24.92%', tone: 'neutral' },
          { label: 'signal-flip ex-flukes (SOL +189%, AVAX +102%)', value: '−5.25%', tone: 'down' },
          { label: 'signal-flip breadth · fold stability', value: '4/10 · 38%', tone: 'neutral' },
          { label: 'geometry-2R mean', value: '−12.54% · 0/10', tone: 'down' },
          { label: 'geometry-4R mean', value: '−14.01% · 0/10', tone: 'down' },
        ],
      },
    ],
    reading:
      'The signal-flip config reads +24.92% on average, but two launch-era single-asset flukes carry it. Strip SOL and AVAX and the typical major loses 5.25%. Four of ten symbols are positive, below the six-of-ten bar, and fold stability is 38% with most fold cells too thin to trust. The geometry-exit variants are flatly negative. No configuration clears the deployable bar.',
    artifacts: [
      {
        label: 'Daily-momentum validation JSON',
        href: experiment('daily-momentum-validation-BTCUSD_ETHUSD_SOLUSD_BNBUSD_XRPUSD_ADAUSD_DOGEUSD_DOTUSD_LINKUSD_AVAXUSD-D1-f4.json'),
      },
      { label: 'Verdict: single-asset timing', href: VERDICT_TIMING },
    ],
  },
  {
    ref: 'Phase 5 Track A · registered 2026-06-13',
    family: 'Funding-rate carry',
    stamp: 'Failed gates',
    hypothesis:
      'Stop timing price. Harvest the structural funding premium: short the perp, hold the spot, collect the funding, stay delta-neutral. This is the strongest raw crypto edge on record.',
    spec: [
      { label: 'Universe', value: '10 majors; 7,403 BTC funding events back to 2019-09' },
      { label: 'Accounting', value: 'delta-neutral, notional 1 on capital 2, unlevered' },
      { label: 'Costs', value: 'two-leg, 0.70% per full round trip; 4 folds' },
      { label: 'Gate', value: '> 8%/yr full-window and > 5%/yr recent-24mo and max DD < 10% and ≥ 3/4 folds +' },
    ],
    results: [
      {
        caption: 'Three variants, no tuning',
        rows: [
          { label: 'A1 always-on BTC, full-window', value: '+5.84%/yr (+39.50% over 6.75y)', tone: 'neutral' },
          { label: 'A1 recent 24mo · max DD · folds', value: '+2.35%/yr · 0.73% · 4/4', tone: 'neutral' },
          { label: 'A2 threshold-gated (per symbol)', value: '0/10 pass', tone: 'down' },
          { label: 'A3 top-3 rotation, weekly', value: '−0.07%/yr · recent −6.11%/yr', tone: 'down' },
        ],
      },
    ],
    reading:
      'In this backtest, always-on BTC returns +39.50% over 6.75 unlevered years, with 0.73% modeled max drawdown and all four folds positive. It fails the registered magnitude gate: full-window yield is 5.84% per year versus an 8% threshold, and the recent 24 months produce 2.35% per year. The observed premium compresses over the registered window. Under the same assumptions, adding a timing overlay (A2) or rotation (A3) worsens the result.',
    artifacts: [
      { label: 'Carry validation JSON', href: experiment('carry-validation-10majors-f4.json') },
      { label: 'Verdict: carry and cross-section', href: VERDICT_CARRY },
    ],
  },
  {
    ref: 'Phase 5 Track B · registered 2026-06-13',
    family: 'Cross-sectional momentum',
    stamp: 'Failed gates',
    hypothesis:
      'Rank the 30-major universe by trailing return each week and hold the top five. Rotation should beat passively holding the same basket, or it is only churn.',
    spec: [
      { label: 'Universe', value: '30 majors, D1 (2,190 grid days), listing-date-aware' },
      { label: 'Signal', value: '14-day lookback, weekly rebalance, top-5' },
      { label: 'Costs', value: '0.2%/side on actual turnover, charged to the benchmark too' },
      { label: 'Gate', value: 'beat equal-weight basket on return and Sharpe, ≥ 3/4 folds of positive excess' },
    ],
    results: [
      {
        caption: 'Full window',
        rows: [
          { label: 'B1 long-only top-5', value: '+1325.48% vs basket +758.96% · 2/4', tone: 'neutral' },
          { label: 'B2 long-short', value: '−12.64% vs basket +758.96% · 2/4', tone: 'down' },
        ],
      },
      {
        caption: 'Bias-mitigated subwindow (2024-06 onward)',
        rows: [
          { label: 'B1 long-only top-5', value: '−46.99% vs basket −50.29% · 1/4', tone: 'down' },
          { label: 'B2 long-short (gate PASS, set aside)', value: '−12.15% vs basket −50.29% · 4/4', tone: 'down' },
        ],
      },
    ],
    reading:
      'The full-window +1325% modeled result exceeds the basket at +759%, but the excess is concentrated in one fold, the 2020 to 2021 launch run measured over today’s surviving 30. Fold stability fails, two of four. In the bias-mitigated subwindow the long-only simulation returns −46.99% against a basket at −50.29%, with one of four folds positive. The long-short subwindow PASS is reported as the frozen gate computed it, then set aside because its modeled result loses 12.15%; cash is the more relevant benchmark for a market-neutral book.',
    artifacts: [
      { label: 'Cross-section validation JSON', href: experiment('xsection-validation-30majors-D1-lb14-rb7-top5-f4.json') },
      { label: 'Verdict: carry and cross-section', href: VERDICT_CARRY },
    ],
  },
  {
    ref: 'Slow-gate sandbox · parameters fixed for the 2026-07-18 run',
    family: 'Daily long/flat risk overlay',
    stamp: 'Mixed · sandbox',
    stampTone: 'neutral',
    hypothesis:
      'A daily close-above-EMA200 long/flat gate on BTC and ETH, with size scaled by the existing HMM structural-regime classifier, can improve drawdown-adjusted return after modeled costs. Buy-and-hold remained the raw-return benchmark; absolute-return outperformance was explicitly not pre-claimed.',
    spec: [
      { label: 'Universe', value: 'BTCUSD and ETHUSD; 50/50 independent sleeves; D1' },
      { label: 'Window', value: '2017-09-01 to 2026-07-16 (8.88 years); 4 folds' },
      { label: 'Variants', value: 'buy-hold, EMA200, EMA200 + HMM sizing, EMA200 + inverse-vol' },
      { label: 'Costs', value: 'spot: 0.10% fee + 0.15% slippage per side' },
      { label: 'Status', value: 'Sandbox simulation only; no live activation' },
    ],
    results: [
      {
        caption: 'Full-window 50/50 BTC/ETH portfolio, modeled spot costs',
        rows: [
          { label: 'buy-and-hold', value: 'CAGR +28.1% · max DD 86.5% · Calmar 0.32 · Sharpe 0.71' },
          { label: 'EMA200 gate', value: 'CAGR +29.4% · max DD 58.8% · Calmar 0.50 · Sharpe 0.80' },
          {
            label: 'EMA200 + HMM sizing',
            value: 'CAGR +10.8% · max DD 50.2% · Calmar 0.21 · Sharpe 0.48',
            tone: 'down',
          },
          { label: 'EMA200 + vol targeting', value: 'CAGR +22.8% · max DD 37.4% · Calmar 0.61 · Sharpe 0.87' },
        ],
      },
      {
        caption: 'Why the claims stay narrow',
        rows: [
          { label: 'BTC vol targeting vs hold CAGR', value: '+21.9% vs +33.7%', tone: 'down' },
          { label: 'ETH vol targeting vs hold CAGR', value: '+23.6% vs +19.3%' },
          { label: 'Vol-target Calmar > hold, per-symbol folds', value: 'BTC 3/4 · ETH 3/4' },
          { label: 'HMM sizing, 50/50 Calmar', value: '0.21 vs hold 0.32', tone: 'down' },
        ],
      },
    ],
    reading:
      'The 50/50 vol-targeted portfolio did not beat buy-and-hold on CAGR: 22.8% versus 28.1%. Vol targeting improved modeled drawdown-adjusted results over the full window: Calmar 0.61 versus 0.32, Sharpe 0.87 versus 0.71, and max drawdown 37.4% versus 86.5%. The study did not establish uniform raw-return outperformance across both assets: the BTC vol-targeted sleeve lagged hold, while the ETH sleeve exceeded it, and the plain EMA200 gate had isolated raw-CAGR wins. HMM sizing underperformed the hold benchmark on drawdown-adjusted metrics: 50/50 Calmar was 0.21 versus 0.32 for hold, and its frequent exposure changes accumulated the highest modeled cost. These are sandbox-only OHLCV outcomes with modeled spot costs, not live results, not broker fills, and not a trading recommendation.',
    artifacts: [
      {
        label: 'Slow-gate sandbox JSON',
        href: experiment('slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json'),
      },
      { label: 'Fixed-parameter sandbox plan', href: SLOW_GATE_PLAN },
    ],
  },
  {
    ref: 'Live record · registered 2026-08-05',
    family: 'Regime filtering and directional inversion',
    stamp: 'Refuted · live record',
    stampTone: 'down',
    hypothesis:
      'Two hypotheses were written down before any query ran, both restating this project’s founder’s own brief, which the registered spec quotes: do not follow the mass, and trade the trending chart rather than the sideways one. First, that signals entered in trending regimes carry materially better net expectancy than signals entered in sideways regimes, so filtering to trending charts would turn the published record positive. Second, that the crowd loses, so inverting every signal would be profitable. The detector thresholds, the reconciliation tolerances and the decision rule were fixed in the same commit as the hypotheses, before the data was read. Publishing this entry was not pre-registered: the spec listed site publication as out of scope, to be decided once results existed.',
    spec: [
      {
        label: 'Population',
        value: '3,157 counted resolved 24h sized trades from the published record, 2026-06-10 to 2026-08-04',
      },
      {
        label: 'Regime inputs',
        value: 'Daily EMA200 side plus 20-bar slope; ADX(14) at cuts 20 and 25; Kaufman efficiency ratio(20) at cut 0.30',
      },
      { label: 'Costs', value: 'Per-asset modeled round-trip fee and slippage recorded at signal emission' },
      {
        label: 'Gate',
        value: 'Reconciliation against the published dashboard had to pass before any split could be read',
      },
      { label: 'Scope', value: 'Regime buckets are crypto only: 1,162 of 3,157 trades were classifiable' },
      { label: 'Integrity', value: 'Reconciliation PASS · lookahead PASS · 0 stale-bar classifications' },
    ],
    results: [
      {
        caption: 'Regime at entry, ADX(14) cut at 20, crypto only',
        rows: [
          {
            label: 'Trend-aligned (n=306)',
            value: 'gross +0.0979R · cost 0.9710R · net −0.8732R',
            tone: 'down',
          },
          {
            label: 'Counter-trend (n=463)',
            value: 'gross +0.0965R · cost 0.7901R · net −0.6936R',
            tone: 'down',
          },
          { label: 'Sideways (n=393)', value: 'gross +0.0325R · cost 0.8214R · net −0.7889R', tone: 'down' },
        ],
      },
      {
        caption: 'Inverting every signal, whole counted stream',
        rows: [
          { label: 'As published (n=3,157)', value: 'win rate 37.4% · net −0.5019R', tone: 'down' },
          { label: 'Every signal flipped (n=3,157)', value: 'win rate 62.6% · net −0.5207R', tone: 'down' },
        ],
      },
      {
        caption: 'Gross return per trade required to break even, as stop width widens',
        rows: [
          { label: 'Stop width as published', value: '0.5113R', tone: 'down' },
          { label: '3× wider', value: '0.1704R' },
          { label: '5× wider', value: '0.1023R' },
          { label: '10× wider', value: '0.0511R' },
        ],
      },
    ],
    reading:
      'No regime bucket was net-positive under any detector. Trend alignment did not even improve gross expectancy over counter-trend, +0.0979R against +0.0965R at the ADX 20 cut, and under the efficiency-ratio cut the trend-aligned bucket was gross-negative at −0.0871R, on 102 trades, below this study’s 300-trade bar for a conclusive cell. Inverting every signal produced a 62.6% win rate and a worse net result, −0.5207R against −0.5019R, because flipping the direction flips the returns and keeps the cost. What the study leaves standing is the cost geometry: modeled cost per trade is round-trip cost divided by stop width, so the published stream’s gross edge of +0.0094R sits roughly 54 times below its 0.5113R cost wall, and that wall shrinks only as stop width and holding period grow. That is an analytic rescale of the cost term alone: win and loss distributions at wider stops were not simulated and are not knowable from this dataset, so the wider-stop figures are a lower bound on what a trade must clear, not a projected result. Horizon, not filtering, is the lever the data leaves open. The regime results cover crypto only, 1,162 of 3,157 trades; 1,995 trades across 20 non-crypto pairs have no daily candle coverage in this repository, so their entry context cannot be independently re-derived here, and their outcomes remain counted, resolved trades. These are observed-OHLCV outcomes under modeled cost assumptions, not broker fills, and not a trading recommendation. No strategy was activated or deactivated by this study.',
    artifacts: [
      {
        label: 'Regime expectancy JSON',
        href: experiment('regime-expectancy-live-record-crypto-D1-2026-08-05.json'),
      },
      { label: 'Pre-registered spec and results', href: REGIME_STUDY_PLAN },
    ],
  },
  {
    ref: 'D1 slow-gate build · pre-registered 2026-08-08',
    family: 'Daily slow-gate walk-forward',
    stamp: 'Passed build gate · live tracked lane',
    stampTone: 'neutral',
    hypothesis:
      'The inherited close-above-EMA200 long/flat rule, paired with a deliberately wide fixed stop, can remain net-positive after modeled production crypto-perpetual costs and match or beat buy-and-hold Calmar in at least three of four continuous-state folds without breaching the registered frequency ceiling.',
    spec: [
      { label: 'Universe', value: 'BTCUSD and ETHUSD, D1; fixed 50/50 independent sleeves' },
      { label: 'Window', value: '2017-09-01 to 2026-07-16; 3,241 bars each; 4 continuous-state folds' },
      { label: 'Gate', value: 'close > EMA200, long/flat; no slope rule and no tuned parameters' },
      { label: 'Stop', value: 'ATR14 × 2.5, floored at 4.0%; gap-aware; no take profit' },
      { label: 'Costs', value: '0.05% fee + 0.15% slippage per side + 0.01% funding per 8h' },
      { label: 'Decision', value: 'positive full-window net return; Calmar ≥ hold in ≥ 3/4 folds; QA and frequency gates pass' },
      { label: 'Status', value: 'Live tracked lane approved 2026-08-09; broker execution remains disabled' },
    ],
    results: [
      {
        caption: 'Full-window fixed 50/50 portfolio, modeled crypto-perpetual costs',
        rows: [
          { label: 'D1 slow gate', value: '+636.83% · CAGR 25.22% · max DD 56.17% · Calmar 0.449' },
          { label: 'buy-and-hold', value: '+239.12% · CAGR 14.74% · max DD 87.78% · Calmar 0.168' },
        ],
      },
      {
        caption: 'Registered build and integrity gates',
        rows: [
          { label: 'Calmar ≥ hold, continuous-state folds', value: '3/4' },
          { label: 'Transition reconciliation', value: 'BTC 86/86 · ETH 64/64' },
          { label: 'Max rolling 365d changes', value: 'BTC 26 · ETH 17 (ceiling 30)' },
          { label: 'Max modeled cost / initial risk', value: 'BTC 0.0783R · ETH 0.0558R' },
          { label: 'Integrity', value: 'reconciliation PASS · lookahead PASS · cadence PASS' },
        ],
      },
    ],
    reading:
      'On the exact frozen historical sample and modeled production crypto-perpetual costs, the pre-registered rule passed its build gate. The fixed 50/50 result beat buy-and-hold on both net return and full-window Calmar, while the registered Calmar fold rule passed exactly three of four folds, not all four. The result is an OHLCV simulation with modeled fills and fixed funding, and the BTC/ETH-only universe carries survivor-selection risk. It is not live performance, not broker fills, and not a trading recommendation. The owner separately approved promotion to a live tracked signal lane on 2026-08-09. That approval does not enable broker order execution, does not backfill historical live rows, and does not bypass the existing fail-closed broadcast evidence gate.',
    artifacts: [
      {
        label: 'D1 slow-gate walk-forward JSON',
        href: experiment('d1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json'),
      },
      { label: 'Pre-registered walk-forward plan', href: D1_SLOW_GATE_PLAN },
      { label: 'Approved build specification', href: D1_SLOW_GATE_BUILD_SPEC },
    ],
  },
];

function toneClass(tone: Tone | undefined): string {
  return tone === 'down' ? 'text-[var(--color-down)]' : 'text-[var(--foreground)]';
}

function slug(value: string): string {
  return value.replace(/\s+/g, '-').toLowerCase();
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]"
    >
      {children}
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="opacity-60">
        <path d="M3.5 3.5h5v5M8.5 3.5L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function KillLedgerEntry({ entry }: { entry: KillEntry }) {
  const headingId = `fam-${slug(entry.family)}`;
  return (
    <section className="reveal py-12 first:pt-0" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-mono text-[11px] text-[var(--text-secondary)]">{entry.ref}</p>
          <h2 id={headingId} className="font-display mt-1 text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">
            {entry.family}
          </h2>
        </div>
        <span className={`font-display text-sm font-bold uppercase tracking-wide ${toneClass(entry.stampTone ?? 'down')}`}>
          {entry.stamp}
        </span>
      </div>

      <div className="mt-7 grid gap-x-12 gap-y-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="max-w-prose">
          <p className="text-[15px] leading-relaxed text-[var(--foreground)]">{entry.hypothesis}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">{entry.reading}</p>
        </div>

        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px] leading-relaxed">
            {entry.spec.map((line) => (
              <div key={line.label} className="contents">
                <dt className="text-[var(--text-secondary)]">{line.label}</dt>
                <dd className="text-[var(--foreground)]">{line.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-4">
            {entry.results.map((block) => (
              <div key={block.caption}>
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">{block.caption}</p>
                <dl className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {block.rows.map((row) => (
                    <div key={row.label} className="flex flex-col items-start gap-1 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <dt className="text-[13px] text-[var(--text-secondary)]">{row.label}</dt>
                      <dd className={`min-w-0 max-w-full break-words font-mono text-[13px] tabular-nums sm:shrink-0 sm:text-right ${toneClass(row.tone)}`}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            {entry.artifacts.map((art) => (
              <ExternalLink key={art.href} href={art.href}>
                {art.label}
              </ExternalLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ResearchPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28">
        <div className="mx-auto max-w-5xl px-4">
          {/* Intro */}
          <header className="grid items-center gap-8 pb-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Recorded results, including failures
              </p>
              <h1 className="font-display mt-4 text-[clamp(2.25rem,5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                What we tested
                <br />
                and learned
              </h1>
              <p className="mt-6 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Each entry records its study specification, modeled cost assumptions, benchmark, and, where
                one was defined, its deployment gate. The first five studies did not clear their deployment
                gates. A sixth, slow daily sandbox produced a narrower result: one vol-targeted 50/50 portfolio
                improved modeled drawdown-adjusted metrics without establishing uniform raw-return outperformance
                across both assets. It did not activate a live strategy. A seventh is the first study run
                against the published record rather than a backtest: it registered two of this project’s own
                directional hypotheses, then refuted both. An eighth pre-registered the exact D1 slow-gate build
                before evaluating it; that rule passed its frozen historical build gate and remains simulated-only.
              </p>
              <p className="mt-4 max-w-prose text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Each entry links its committed machine-readable artifact and the final verdict memo. The
                registered experiment ledger is the{' '}
                <ExternalLink href={REGISTRY_URL}>append-only experiment registry</ExternalLink>. The live
                modeled-cost signal result is on the{' '}
                <a href="/track-record" className="underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]">
                  track record
                </a>
                , and the per-trade cost dataset is served raw at{' '}
                <a href="/api/research/cost-field" className="font-mono underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]">
                  /api/research/cost-field
                </a>
                .
              </p>
            </div>
            <EditorialHeroArt
              src="/brand/editorial/tradeclaw-research-gate-v1.webp"
              testId="research-hero-art"
            />
          </header>

          {/* Kill ledger */}
          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {ENTRIES.map((entry) => (
              <KillLedgerEntry key={entry.family} entry={entry} />
            ))}
          </div>

          {/* Close: what survived */}
          <section className="reveal border-t border-[var(--border)] py-14" aria-labelledby="what-survived">
            <h2 id="what-survived" className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">
              What survived
            </h2>
            <p className="mt-6 max-w-prose text-[15px] leading-relaxed text-[var(--foreground)]">
              A narrow modeled result did. The 50/50 vol-targeted portfolio did not beat buy-and-hold on
              CAGR: 22.8% versus 28.1%. It did improve modeled Calmar from 0.32 to 0.61 and Sharpe from
              0.71 to 0.87, while modeled max drawdown fell from 86.5% to 37.4%. HMM sizing failed: its
              full-window portfolio Calmar was 0.21, below buy-and-hold at 0.32.
            </p>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--foreground)]">
              The live-record study added a second survivor, a mechanism rather than a strategy. Modeled cost
              per trade is round-trip cost divided by stop width, so the gross return needed to break even
              falls from 0.5113R at the published stop width to 0.1023R at five times wider. That rescales
              the cost term only; it does not simulate what wins and losses look like at wider stops, and it
              is not a claim that a wider stop is profitable. Regime filtering and signal inversion did not
              survive: no regime bucket was net-positive, and flipping every signal produced a 62.6% win rate
              that still lost more, −0.5207R against −0.5019R.
            </p>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--foreground)]">
              The pre-registered D1 build validation added a third narrow result. Its fixed 50/50 BTC/ETH
              slow-gate portfolio returned a modeled +636.83% against +239.12% for identically costed
              buy-and-hold, with Calmar 0.449 against 0.168. It cleared the registered continuous-state fold
              rule exactly 3/4, while transition reconciliation, lookahead, cadence, cost-risk, and frequency
              gates all passed.
            </p>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
              That changes the research record and permits a fail-closed simulated lane, not deployment. The
              slow-gate results are historical OHLCV simulations with modeled costs: they are not live
              performance, not broker fills, and not a trading recommendation. Activation remains separately
              gated and unapproved. No live strategy selection or allocation changed.
            </p>
            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[15px]" aria-label="Related pages">
              <a href="/methodology" className="font-medium text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]">
                How we measure
              </a>
              <a href="/why-long-term" className="font-medium text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]">
                Why long-term
              </a>
              <a href="/open-data" className="font-medium text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]">
                Open data
              </a>
            </nav>
          </section>
        </div>
      </main>
    </>
  );
}

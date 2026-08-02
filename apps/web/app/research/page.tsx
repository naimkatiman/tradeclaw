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
      'Six strategy studies, evaluated under published modeled costs and reported with machine-readable artifacts and explicit claim boundaries.',
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
                    <div key={row.label} className="flex items-baseline justify-between gap-4 py-1.5">
                      <dt className="text-[13px] text-[var(--text-secondary)]">{row.label}</dt>
                      <dd className={`shrink-0 font-mono text-[13px] tabular-nums ${toneClass(row.tone)}`}>{row.value}</dd>
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
                across both assets. It did not activate a live strategy.
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
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
              That changes the research record, not the deployment gate. The slow-gate study is a sandbox-only
              OHLCV simulation with modeled spot costs: it is not live performance, not broker fills, and not
              a trading recommendation. It does not change live strategy selection or allocation.
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

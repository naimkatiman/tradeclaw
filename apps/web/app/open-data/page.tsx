import type { Metadata } from 'next';
import { Navbar } from '../components/navbar';
import { EditorialHeroArt } from '../../components/editorial-hero-art';

/**
 * /open-data — the developer front door.
 *
 * The public signal-study numbers are fetched from these endpoints, and the
 * research verdicts on /research are backed by committed JSON in
 * docs/research/experiments/. This page documents both so a developer,
 * researcher, or skeptic can call the data directly, reproduce it, or fork it.
 *
 * Server component, zero client JS. Design language matches ProofHero:
 * display headline, mono for all code, ledger rows over card grids. See
 * PRODUCT.md ("give the data away") and DESIGN.md.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Open Data | TradeClaw',
  description:
    'Free, machine-readable signal-study data: OHLCV-resolved outcomes, modeled per-trade costs, a sequential equity simulation, and committed research backtests.',
  openGraph: {
    title: 'Open Data | TradeClaw',
    description:
      'Public signal-study JSON APIs, committed research artifacts, and copy-paste recipes — MIT licensed, no API key required, with public fair-use limits.',
    url: 'https://tradeclaw.win/open-data',
    siteName: 'TradeClaw',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw open data' }],
  },
  alternates: { canonical: 'https://tradeclaw.win/open-data' },
};

const BASE = 'https://tradeclaw.win';
const REPO_BLOB = 'https://github.com/naimkatiman/tradeclaw/blob/main/docs/research/experiments';
const REPO_ROOT_BLOB = 'https://github.com/naimkatiman/tradeclaw/blob/main';
const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';

interface Param {
  name: string;
  values?: string;
  note: string;
}

interface Endpoint {
  method: string;
  path: string;
  desc: string;
  params: Param[];
  shape: string;
  curl: string;
  /** Second copyable example, e.g. the CSV variant of the same route. */
  altCurl?: { label: string; command: string };
  /** A page on this site that renders this endpoint, linked for context. */
  rendered?: { href: string; label: string };
  headline?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/research/cost-field',
    headline: true,
    desc: 'One entry per counted 24h outcome with a valid stop: gross R from its OHLCV-resolved outcome, the stored modeled round-trip cost in R, and asset class. Net modeled R is grossR[i] minus costR[i]. costR uses fee/slippage assumptions, not broker fills. The response reports its source-read limit and potential window truncation.',
    params: [
      { name: 'scope', values: 'pro | broadcast', note: 'eligible engine stream (default) or gate-approved rows recorded since 2026-06-10' },
      { name: 'period', note: 'optional window filter, same grammar as the history route' },
      { name: 'include', values: 'provenance', note: 'include per-row outcome, risk, modeled-cost source, and broadcast-decision fields' },
    ],
    shape: '{ classes: ["crypto","metals","fx_or_fallback"], count, resolvedTotal, ids[], t[], grossR[], costR[], cls[], methodology, window, provenance?[] }',
    curl: `curl ${BASE}/api/research/cost-field`,
  },
  {
    method: 'GET',
    path: '/api/signals/equity',
    desc: 'Hypothetical sequential equity simulation plus a summary block. It orders eligible sized signals by timestamp, risks 1% of current equity on every signal, caps extreme R outcomes, and deducts modeled per-asset fee/slippage assumptions. It does not model broker fills, overlapping exposure, margin, leverage, latency, funding, or subscriber selection; it is not an actual portfolio return.',
    params: [
      { name: 'summaryOnly', values: '1 | true', note: 'drop the point array, return summary and rolling win rates only' },
      { name: 'scope', values: 'pro | broadcast', note: 'eligible engine stream (default) or gate-approved rows recorded since 2026-06-10' },
      { name: 'band', values: 'premium | standard | all', note: 'filter by confidence band' },
      { name: 'category', note: 'asset-category filter (e.g. crypto, fx)' },
      { name: 'period', note: 'optional window filter' },
      { name: 'smooth', values: 'median2x | median3x', note: 'opt-in R-cap on the curve; off by default' },
    ],
    shape: '{ points[], summary: { totalReturn, maxDrawdown, winRate, sizedTrades, expectancyR, netExpectancyR, avgCostR, roundTripCostPct, breakEvenWinRate, sharpeRatio, hardRCap, ... }, rollingWinRates: { "7d","30d","90d" }, band, scope, category, smooth }',
    curl: `curl '${BASE}/api/signals/equity?summaryOnly=1&scope=pro'`,
  },
  {
    method: 'GET',
    path: '/api/signals/history',
    desc: 'Recorded signal history, paginated, with OHLCV-resolved outcome fields and the same counted-row definition used by the other signal-study surfaces. Add format=csv to stream the currently stored rows matching the filters. This is a signal ledger, not an order or broker-fill ledger.',
    params: [
      { name: 'format', values: 'json | csv', note: 'JSON page (default) or a downloadable CSV of currently stored rows matching the filters' },
      { name: 'pair', note: 'single symbol, e.g. BTCUSD' },
      { name: 'direction', values: 'BUY | SELL', note: 'filter by trade side' },
      { name: 'outcome', values: 'win | loss | pending', note: 'filter by resolved outcome' },
      { name: 'limit', values: 'max 200', note: 'page size, default 50' },
      { name: 'offset', note: 'pagination offset' },
      { name: 'scope / category / period / sort', note: 'record scope, asset category, time window, ordering (sort=resolved-first)' },
    ],
    shape: '{ records[], total, offset, limit, scope, category, earliestTimestamp, latestTimestamp, stats: { totalSignals, resolved, wins, losses, winRate, avgConfidence, streak, bestSignal, ... } }',
    curl: `curl '${BASE}/api/signals/history?limit=50&outcome=win'`,
    altCurl: {
      label: 'CSV export (16 columns, opens in any spreadsheet)',
      command: `curl '${BASE}/api/signals/history?format=csv' -o tradeclaw-history.csv`,
    },
  },
  {
    method: 'GET',
    path: '/api/calibration',
    desc: 'The reliability data behind the /calibration page. Signals are bucketed into five confidence bands and each band reports its observed OHLCV-resolved win rate. Includes Brier score and expected calibration error over the counted resolved population. Cached 5 minutes (revalidate 300).',
    params: [
      { name: '(none)', note: 'no query params; measures counted resolved rows in the current archive' },
    ],
    shape: '{ buckets: [5 confidence bands], overallAccuracy, totalSignals, brier, ece, calibration, windowStart, windowEnd, insufficientData, minStableSignals, updatedAt }',
    curl: `curl ${BASE}/api/calibration`,
    rendered: { href: '/calibration', label: '/calibration' },
  },
  {
    method: 'GET',
    path: '/feed.json',
    desc: 'The 50 most recent signals as a subscribable feed. Also served as RSS 2.0 at /feed.xml and Atom 1.0 at /atom.xml for any reader.',
    params: [
      { name: '(none)', note: 'point a JSON Feed, RSS, or Atom reader at the URL' },
    ],
    shape: 'JSON Feed 1.1: { version, title, feed_url, items: [ { id, url, title, content_html, summary, date_published, tags } ] }',
    curl: `curl ${BASE}/feed.json`,
  },
];

interface Artifact {
  file: string;
  size: string;
  desc: string;
  labels?: string[];
}

const ARTIFACTS: Artifact[] = [
  {
    file: 'BTCUSD-H1-2024-06-10-2026-06-09-live-crypto-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
    size: '9.5 KB',
    desc: 'BTCUSD H1, five entry strategies scored under the stated crypto fee/slippage assumptions. Best run (regime-aware) 0.6% at 50% win rate; classic loses 11.1%.',
  },
  {
    file: 'BTCUSD-H1-2024-06-10-2026-06-09-legacy-zero-classic_regime-aware_hmm-top3_vwap-ema-bb_full-risk-f4.json',
    size: '9.4 KB',
    desc: 'Same BTCUSD H1 window with zero costs and legacy fixed 2:1 sizing. The cost-free counterfactual to the live-crypto run above.',
  },
  {
    file: 'carry-validation-10majors-f4.json',
    size: '300 KB',
    desc: 'Carry strategy across 10 majors with two-leg costs. All three variants (always-on, threshold, top-3 rotation) fail the deployment gate.',
  },
  {
    file: 'daily-momentum-validation-BTCUSD_ETHUSD_SOLUSD_BNBUSD_XRPUSD_ADAUSD_DOGEUSD_DOTUSD_LINKUSD_AVAXUSD-D1-f4.json',
    size: '141 KB',
    desc: 'Daily time-series momentum across 10 crypto majors, D1. No config survives ~0.4% crypto costs robustly; the two positive symbols are flukes.',
  },
  {
    file: 'daily-momentum-validation-BTCUSD-D1-f4.json',
    size: '20 KB',
    desc: 'Daily momentum isolated to BTCUSD, D1. Single-symbol slice of the majors validation for a focused read.',
  },
  {
    file: 'regime-hmm-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-12-2026-06-11.json',
    size: '13 KB',
    desc: 'Three-state structural regime HMM (trend, volatile, range) on BTC/ETH/SOL H1, walk-forward. States price magnitude, not drift; no directional premium.',
  },
  {
    file: 'regime-routed-walkforward-BTCUSD_ETHUSD_SOLUSD-H1-2024-06-01-2026-06-01-f4.json',
    size: '52 KB',
    desc: 'Per-regime routed entries on BTC/ETH/SOL H1 walk-forward. The only non-thin routed cell is negative on all three symbols; the gate fails on paper.',
  },
  {
    file: 'slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json',
    size: '26 KB',
    desc: 'Fixed-parameter BTC/ETH daily long/flat sandbox study under modeled spot costs. The 50/50 vol-targeted portfolio trailed buy-and-hold CAGR (22.75% vs 28.09%) but improved modeled Calmar (0.61 vs 0.32) and max drawdown (37.42% vs 86.49%). EMA200 had isolated raw-CAGR wins, so the study did not establish uniform raw-return outperformance across both assets; HMM sizing underperformed buy-and-hold on drawdown-adjusted metrics. This is not live performance, does not represent broker fills, and is not a recommendation.',
    labels: ['sandbox only', 'non-live', 'modeled backtest', 'no broker fills', 'informational only'],
  },
  {
    file: 'xsection-validation-30majors-D1-lb14-rb7-top5-f4.json',
    size: '9.3 KB',
    desc: 'Cross-sectional momentum, 30 majors D1, top-5. Long-only and long-short both fail against the basket benchmark over the full window.',
  },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
      {children}
    </p>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display text-[clamp(1.35rem,3vw,2rem)] font-bold uppercase leading-[1] tracking-tight"
    >
      {children}
    </h2>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--glass-bg)]">
      <pre className="p-4 font-mono text-[13px] leading-relaxed text-[var(--foreground)]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function EndpointRow({ ep }: { ep: Endpoint }) {
  return (
    <article className="py-7">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {ep.method}
        </span>
        <code className="font-mono text-sm font-semibold text-[var(--foreground)] break-all">
          {ep.path}
        </code>
        {ep.headline && (
          <span className="rounded-[var(--radius-pill)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            new
          </span>
        )}
      </div>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
        {ep.desc}
      </p>

      <dl className="mt-4 space-y-1.5">
        {ep.params.map((p) => (
          <div key={p.name} className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-relaxed">
            <dt className="font-mono text-[var(--foreground)]">
              {p.name}
              {p.values ? (
                <span className="text-[var(--text-secondary)]"> = {p.values}</span>
              ) : null}
            </dt>
            <dd className="text-[var(--text-secondary)]">{p.note}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
        Response shape
      </p>
      <div className="mt-1.5 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--glass-bg)]">
        <pre className="p-3 font-mono text-[12px] leading-relaxed text-[var(--text-secondary)]">
          <code>{ep.shape}</code>
        </pre>
      </div>

      <div className="mt-3">
        <CodeBlock>{ep.curl}</CodeBlock>
      </div>

      {ep.altCurl && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
            {ep.altCurl.label}
          </p>
          <CodeBlock>{ep.altCurl.command}</CodeBlock>
        </div>
      )}

      {ep.rendered && (
        <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
          Rendered on{' '}
          <a
            href={ep.rendered.href}
            className="font-mono text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]"
          >
            {ep.rendered.label}
          </a>
          .
        </p>
      )}
    </article>
  );
}

const RECIPE_CURL = `# Count net-positive trades in the cost field (net R = grossR - costR)
curl -s ${BASE}/api/research/cost-field \\
  | jq '[.grossR as $g | .costR as $c
         | range(0; .count)
         | select($g[.] - $c[.] > 0)] | length'`;

const RECIPE_JS = `// Load the cost-adjusted equity summary and print the net edge per trade
const res = await fetch(
  '${BASE}/api/signals/equity?summaryOnly=1&scope=pro'
);
const { summary } = await res.json();

console.log('net expectancy  R/trade:', summary.netExpectancyR);
console.log('gross expectancy R/trade:', summary.expectancyR);
console.log('avg round-trip cost R:', summary.avgCostR);`;

const RECIPE_PY = `# Load the cost field into a DataFrame and compute mean net R
import requests, pandas as pd

d = requests.get('${BASE}/api/research/cost-field').json()
df = pd.DataFrame({
    't': d['t'],
    'grossR': d['grossR'],
    'costR': d['costR'],
    'cls': d['cls'],
})
df['netR'] = df['grossR'] - df['costR']
df['asset'] = df['cls'].map(dict(enumerate(d['classes'])))

print('mean net R/trade:', df['netR'].mean())
print(df.groupby('asset')['netR'].mean())`;

export default function OpenDataPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-5xl px-4">
          {/* Intro */}
          <header className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <Kicker>Public evidence archive</Kicker>
              <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
                Every number here
                <br />
                is an endpoint
                <br />
                you can call.
              </h1>
              <p className="mt-6 max-w-prose text-base leading-relaxed text-[var(--text-secondary)]">
                TradeClaw publishes the signal-study data: recorded signal rows,
                OHLCV-resolved outcomes, modeled per-trade costs, and the sequential
                equity simulation used by the public research charts. Backtest
                artifacts are committed to the repo as JSON. These datasets are
                public and untiered; call them, cache them, fork them, and audit the
                assumptions.
              </p>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                The full reference lives at{' '}
                <a
                  href="/api-docs"
                  className="font-mono text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]"
                >
                  /api-docs
                </a>
                . Everything below runs against{' '}
                <code className="font-mono text-[var(--foreground)]">https://tradeclaw.win</code>.
              </p>
            </div>
            <EditorialHeroArt
              src="/brand/editorial/tradeclaw-open-data-aperture-v1.webp"
              testId="open-data-hero-art"
            />
          </header>

          {/* Endpoints */}
          <section className="reveal mt-16">
            <SectionHeading id="endpoints">Live endpoints</SectionHeading>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
              Read-only GET routes. Responses carry public cache headers
              (s-maxage of 60 seconds on the signal and cost-field routes) so a
              reverse proxy or your own cache can absorb repeat calls.
            </p>
            <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {ENDPOINTS.map((ep) => (
                <EndpointRow key={ep.path} ep={ep} />
              ))}
            </div>
          </section>

          {/* Committed artifacts */}
          <section className="reveal mt-16">
            <SectionHeading id="artifacts">Committed research artifacts</SectionHeading>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
              The 2026 signal archive is committed to{' '}
              <code className="font-mono text-[var(--foreground)]">data/</code> at the
              repo root, and every verdict on{' '}
              <a href="/research" className="underline decoration-[var(--border)] underline-offset-4 hover:text-[var(--foreground)]">
                /research
              </a>{' '}
              is backed by a deterministic backtest JSON in{' '}
              <code className="font-mono text-[var(--foreground)]">docs/research/experiments/</code>.
              Each experiment file holds its registered spec and results, so a given
              candle store state reproduces the same numbers byte for byte.
            </p>

            <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <a
                href={`${REPO_ROOT_BLOB}/data/signal-log.json`}
                data-evidence-event="artifact_downloaded"
                data-evidence-target="data/signal-log.json"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 py-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <code className="min-w-0 break-all font-mono text-sm font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 group-hover:decoration-[var(--foreground)]">
                    data/signal-log.json
                  </code>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    timestamped log
                  </span>
                </div>
                <p className="max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                  The historical git-committed signal log, frozen 2026-05-02 when
                  in-repo logging was retired. Each record carries entry, tp1, sl,
                  confidence, strategy, and 4h/24h outcomes, and for that window
                  git history is the look-ahead proof: each commit timestamps a
                  signal before its outcome was known. Newer runs are recorded in
                  the signal_run_log database table with a SHA-256 audit trail.
                </p>
              </a>

              <a
                href={`${REPO_ROOT_BLOB}/data/SIGNAL-LOG.md`}
                data-evidence-event="artifact_downloaded"
                data-evidence-target="data/SIGNAL-LOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 py-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <code className="min-w-0 break-all font-mono text-sm font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 group-hover:decoration-[var(--foreground)]">
                    data/SIGNAL-LOG.md
                  </code>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    human-readable
                  </span>
                </div>
                <p className="max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                  The same historical log in a readable table, covering the same
                  frozen window. Verify provenance yourself with{' '}
                  <code className="font-mono text-[var(--foreground)]">git log --oneline data/signal-log.json</code>.
                </p>
              </a>

              <a
                href={`${REPO_BLOB}/REGISTRY.md`}
                data-evidence-event="artifact_downloaded"
                data-evidence-target="docs/research/experiments/REGISTRY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 py-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <code className="font-mono text-sm font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 group-hover:decoration-[var(--foreground)]">
                    REGISTRY.md
                  </code>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    run ledger
                  </span>
                </div>
                <p className="max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                  Append-only ledger of every backtest. One line per run with its
                  spec and headline result. Read it before re-testing a hypothesis;
                  if the spec ran before, the answer is here.
                </p>
              </a>

              {ARTIFACTS.map((a) => (
                <a
                  key={a.file}
                  href={`${REPO_BLOB}/${a.file}`}
                  data-evidence-event="artifact_downloaded"
                  data-evidence-target={a.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 py-5"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <code className="min-w-0 break-all font-mono text-[13px] font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 group-hover:decoration-[var(--foreground)]">
                      {a.file}
                    </code>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                      {a.size}
                    </span>
                    {a.labels?.map((label) => (
                      <span
                        key={label}
                        className="rounded-[var(--radius-pill)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                    {a.desc}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Use it */}
          <section className="reveal mt-16">
            <SectionHeading id="use-it">Use it</SectionHeading>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
              Three recipes against the live routes. Each references only fields
              that actually appear in the responses above.
            </p>

            <div className="mt-6 space-y-8">
              <div>
                <p className="mb-2 font-mono text-[12px] uppercase tracking-wider text-[var(--text-secondary)]">
                  1. Shell: count net-positive trades
                </p>
                <CodeBlock>{RECIPE_CURL}</CodeBlock>
              </div>

              <div>
                <p className="mb-2 font-mono text-[12px] uppercase tracking-wider text-[var(--text-secondary)]">
                  2. JavaScript: read the net edge per trade
                </p>
                <CodeBlock>{RECIPE_JS}</CodeBlock>
              </div>

              <div>
                <p className="mb-2 font-mono text-[12px] uppercase tracking-wider text-[var(--text-secondary)]">
                  3. Python: mean net R by asset class
                </p>
                <CodeBlock>{RECIPE_PY}</CodeBlock>
              </div>
            </div>
          </section>

          {/* License and disclosure */}
          <section className="reveal mt-16">
            <SectionHeading id="license">License and terms</SectionHeading>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
              The code is MIT licensed. Use, modify, and redistribute it freely,
              including the API routes and the research pipeline. The datasets
              carry the same spirit: take them, cite them, build on them. Source
              is at{' '}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]"
              >
                github.com/naimkatiman/tradeclaw
              </a>
              .
            </p>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
              No API key is required. Public routes use fair-use rate limits to
              protect shared availability. Cache responses on your side rather
              than polling in a tight loop; the s-maxage headers make that cheap.
            </p>

            <div className="mt-6 rounded-[var(--radius-card)] border border-amber-500/30 bg-amber-500/[0.06] px-4 py-4">
              <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-100">
                Informational only, not advice.
              </p>
              <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-amber-700 dark:text-amber-200/90">
                This data combines recorded signal rows, OHLCV-resolved outcomes,
                and modeled fee/slippage assumptions. It contains no broker-fill or
                customer-account ledger. Under the published assumptions, the
                counted signal study has negative net expectancy; that is not a
                claim about realized subscriber losses. Treat every number as a
                research result to audit, not a recommendation to trade.
              </p>
            </div>
          </section>

          {/* Read next */}
          <section className="reveal mt-16">
            <SectionHeading id="read-next">Read next</SectionHeading>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/methodology"
                data-evidence-event="methodology_viewed"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--foreground)]"
              >
                Methodology
              </a>
              <a
                href="/research"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--foreground)]"
              >
                What we tested and killed
              </a>
              <a
                href="/track-record"
                data-evidence-event="record_inspected"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--foreground)]"
              >
                Signal study
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

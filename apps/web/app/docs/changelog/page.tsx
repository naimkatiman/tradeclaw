import type { Metadata } from 'next';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'TradeClaw release history — every version, every feature, from v0.1.0 to today.',
};

interface ChangeEntry {
  type: 'feat' | 'fix' | 'perf' | 'refactor';
  text: string;
}

interface Release {
  version: string;
  date: string;
  label: string;
  summary: string;
  changes: ChangeEntry[];
}

const RELEASES: Release[] = [
  {
    version: 'v0.4.0',
    date: 'March 2026',
    label: 'latest',
    summary: 'PWA support, plugin system, public proof tracker, real-time SSE price feed, and this documentation site.',
    changes: [
      { type: 'feat', text: 'Progressive Web App — installable, offline caching via Service Worker, push notification support' },
      { type: 'feat', text: 'Documentation site at /docs — 10+ pages covering signals, API, webhooks, plugins, and more' },
      { type: 'feat', text: 'Market screener — filter all pairs by RSI range, MACD signal, EMA trend, and minimum confidence' },
      { type: 'feat', text: 'Price alerts with browser notifications — set threshold, direction, and optional note' },
      { type: 'feat', text: 'Plugin system — custom JS indicator modules with sandboxed V8 execution' },
      { type: 'feat', text: 'Signal accuracy tracker with public proof — win/loss records per symbol and timeframe' },
      { type: 'feat', text: 'Real-time SSE price feed at /api/prices/stream — pushes price events and new signals' },
      { type: 'feat', text: 'Signal explainer — AI-generated reasoning for each signal at /api/explain' },
    ],
  },
  {
    version: 'v0.3.0',
    date: 'March 2026',
    label: 'stable',
    summary: 'Embeddable widget, community leaderboard, Telegram bot, backtest visualization, and production-grade integrations.',
    changes: [
      { type: 'feat', text: 'Embeddable signal widget — iframe and script tag embeds with dark/light themes' },
      { type: 'feat', text: 'Community leaderboard — public signal accuracy rankings by symbol and timeframe' },
      { type: 'feat', text: 'Telegram bot — @BotFather setup, subscriber filtering, formatted signal broadcasts' },
      { type: 'feat', text: 'Backtest visualization — equity curve, drawdown chart, and per-trade breakdown' },
      { type: 'feat', text: 'Visual strategy builder — drag-and-drop indicator composition with backtest runner' },
      { type: 'feat', text: 'Webhooks — HMAC-SHA256 signed delivery, Discord/Slack auto-formatting, retry logic' },
      { type: 'feat', text: 'Paper trading — simulated portfolio with $10k starting balance, P&L stats, Sharpe ratio' },
      { type: 'feat', text: 'Multi-timeframe analysis — M15/H1/H4/D1 consensus view per symbol' },
      { type: 'feat', text: 'API reference docs — all endpoints documented with parameters and response shapes' },
      { type: 'feat', text: 'Mobile-responsive dashboard — optimized layout for phones and tablets' },
    ],
  },
  {
    version: 'v0.2.0',
    date: 'March 2026',
    label: 'stable',
    summary: 'Real signal engine powered by five technical indicators, public demo deployment, and SEO landing page.',
    changes: [
      { type: 'feat', text: 'Real TA engine — RSI (Wilder\'s), MACD (12/26/9), EMA (20/50/200), Bollinger Bands, Stochastic' },
      { type: 'feat', text: 'Confluence scoring — weighted indicator votes produce a 0–100 confidence score' },
      { type: 'feat', text: 'ATR-based TP/SL calculator — three take profit levels at 1:1, 1:2, 1:3 risk/reward' },
      { type: 'feat', text: 'Public demo deployment — one-click deploy to Railway and Vercel' },
      { type: 'feat', text: 'SEO landing page — Open Graph meta, sitemap, structured data' },
      { type: 'feat', text: 'Signal sharing — unique shareable URLs per signal with live status' },
      { type: 'perf', text: 'In-memory price cache — reduces external API calls by ~80%' },
    ],
  },
  {
    version: 'v0.1.0',
    date: 'March 2026',
    label: 'initial',
    summary: 'Project scaffold, infrastructure, role system, and Alpha Screener brand documentation.',
    changes: [
      { type: 'feat', text: 'Next.js 14 monorepo scaffold with TypeScript strict mode and Tailwind CSS v4' },
      { type: 'feat', text: 'README with feature list, deploy buttons, and screenshot placeholders' },
      { type: 'feat', text: 'Role system — Free, Pro, and Enterprise tiers with Stripe checkout integration' },
      { type: 'feat', text: 'Landing page — hero section, feature grid, pricing cards, and FAQ' },
      { type: 'feat', text: 'CI/CD pipeline — GitHub Actions build check on every PR' },
      { type: 'feat', text: 'Docker Compose deployment — single-command production setup' },
      { type: 'feat', text: 'Alpha Screener brand documentation — hosted version positioning and feature parity notes' },
      { type: 'feat', text: 'STATE.yaml project tracker — task list and milestone tracking' },
    ],
  },
];

const TYPE_LABELS: Record<ChangeEntry['type'], { label: string; color: string }> = {
  feat: { label: 'feat', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  fix: { label: 'fix', color: 'bg-red-500/15 text-red-400 border-red-500/25' },
  perf: { label: 'perf', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  refactor: { label: 'refactor', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
};

const VERSION_BADGE: Record<string, string> = {
  latest: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  stable: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  initial: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

export default function ChangelogPage() {
  const { prev, next } = getPrevNext('/docs/changelog');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Project</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Changelog</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          A complete history of every TradeClaw release. All versions follow
          semantic versioning. Breaking changes are always called out explicitly.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-4 bottom-4 w-px bg-white/6 hidden sm:block" />

        <div className="space-y-12">
          {RELEASES.map((release) => (
            <section key={release.version} className="relative sm:pl-12">
              {/* Timeline dot */}
              <div className="hidden sm:flex absolute left-0 top-1.5 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>

              {/* Version header */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold font-mono text-white">{release.version}</h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${VERSION_BADGE[release.label]}`}>
                  {release.label}
                </span>
                <span className="text-sm text-zinc-500">{release.date}</span>
              </div>

              {/* Summary */}
              <p className="text-zinc-400 mb-5 leading-relaxed">{release.summary}</p>

              {/* Change list */}
              <div className="space-y-2">
                {release.changes.map((change, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${TYPE_LABELS[change.type].color}`}>
                      {TYPE_LABELS[change.type].label}
                    </span>
                    <p className="text-sm text-zinc-400 leading-relaxed">{change.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-12 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
        <p className="text-sm font-medium text-zinc-300 mb-1">Upcoming</p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Signal notifications via email, multi-instance support with shared signal store,
          and an official hosted version at Alpha Screener. Follow the{' '}
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">STATE.yaml</code>{' '}
          file in the repository root for the live task backlog.
        </p>
      </div>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/changelog/page.tsx" />
    </article>
  );
}

import Link from 'next/link';
import { PageNav } from './components/page-nav';
import { getPrevNext, NAV_SECTIONS } from './nav-config';

export function DocsClient() {
  const { prev, next } = getPrevNext('/docs');

  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Open Source · Self-Hostable
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
          TradeClaw Documentation
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw is an open-source, self-hostable trading signal platform with real technical
          analysis, paper trading, Telegram alerts, and a plugin system for custom indicators.
          Deploy in 5 minutes with Docker.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {[
          { label: 'Supported Pairs', value: '13' },
          { label: 'TA Indicators', value: '7+' },
          { label: 'API Endpoints', value: '42' },
          { label: 'Deploy Time', value: '5 min' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
            <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* What is TradeClaw */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4">What is TradeClaw?</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          TradeClaw generates trading signals by running multi-indicator technical analysis across
          13 instruments — Gold, Silver, Oil, BTC, ETH, EUR/USD, GBP/USD, USD/JPY, and more — on
          5 timeframes (M5, M15, H1, H4, D1). Every signal includes a confluence score (0–100)
          calculated from RSI, MACD, EMA cross, Bollinger Bands, and Stochastic position.
        </p>
        <p className="text-zinc-400 leading-relaxed">
          The entire TA engine is pure TypeScript — no external indicator libraries, no black boxes.
          You can read every formula, fork it, and extend it with the plugin system.
        </p>
      </section>

      {/* Architecture overview */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4">Architecture</h2>
        <div className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden">
          <div className="p-5 space-y-3">
            {[
              {
                layer: 'Next.js App (apps/web)',
                desc: 'All routes, API endpoints, dashboard UI, and React components.',
                color: 'bg-emerald-500',
              },
              {
                layer: 'TA Engine (apps/web/app/lib/ta-engine.ts)',
                desc: 'Pure-math RSI, MACD, EMA, Bollinger Bands, Stochastic. Zero dependencies.',
                color: 'bg-blue-500',
              },
              {
                layer: 'Plugin System (apps/web/lib/plugin-system.ts)',
                desc: 'Sandboxed JS execution for custom indicators (VWAP, ATR, OBV, Ichimoku).',
                color: 'bg-purple-500',
              },
              {
                layer: 'Signal Scanner (Dockerfile.scanner)',
                desc: 'Background worker that polls prices, runs TA, and emits signals on a configurable interval.',
                color: 'bg-amber-500',
              },
              {
                layer: 'TimescaleDB + Redis',
                desc: 'PostgreSQL with time-series extensions for signal history; Redis for rate limiting.',
                color: 'bg-zinc-500',
              },
            ].map(item => (
              <div key={item.layer} className="flex gap-3">
                <div className={`w-1 rounded-full shrink-0 ${item.color} opacity-60`} />
                <div>
                  <p className="text-sm font-mono text-zinc-200">{item.layer}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All doc sections */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-5">Documentation</h2>
        <div className="space-y-8">
          {NAV_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">
                {section.title}
              </h3>
              <div className="grid gap-2">
                {section.items.filter(i => i.href !== '/docs').map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/20 p-4 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <svg
                      className="text-zinc-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all"
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
          <p className="text-sm text-zinc-300 mb-4">
            The fastest way to run TradeClaw is Docker Compose. From the repo root:
          </p>
          <div className="rounded-lg bg-[#050505] border border-white/8 p-4 font-mono text-sm text-zinc-300">
            <p className="text-zinc-500 text-xs mb-2"># 1. Clone the repository</p>
            <p>git clone https://github.com/naimkatiman/tradeclaw</p>
            <p>cd tradeclaw</p>
            <p className="mt-3 text-zinc-500 text-xs"># 2. Configure environment</p>
            <p>cp apps/web/.env.example apps/web/.env.local</p>
            <p className="mt-3 text-zinc-500 text-xs"># 3. Start all services</p>
            <p>docker compose up -d</p>
            <p className="mt-3 text-zinc-500 text-xs"># App runs at localhost:3000</p>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            See the{' '}
            <Link href="/docs/installation" className="text-emerald-400 hover:underline">
              Installation guide
            </Link>{' '}
            for Railway, Vercel, and bare-metal deployment options.
          </p>
        </div>
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/page.tsx" />
    </article>
  );
}

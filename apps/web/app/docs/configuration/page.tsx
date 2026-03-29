import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Configuration',
  description: 'All environment variables, Stripe setup, Telegram bot config, and database options.',
};


export default function ConfigurationPage() {
  const { prev, next } = getPrevNext('/docs/configuration');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Getting Started</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Configuration</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw is configured entirely through environment variables.
          Copy <code className="text-emerald-400 text-base">.env.example</code> to <code className="text-emerald-400 text-base">.env.local</code> and
          fill in the values relevant to your deployment.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Full .env.example</h2>
        <CodeBlock
          language="bash"
          filename="apps/web/.env.example"
          code={`# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
NEXT_PUBLIC_BASE_URL=https://tradeclaw.win

# ---------------------------------------------------------------------------
# Stripe (optional — needed for billing/subscriptions)
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ANNUAL_PRICE_ID=price_...

NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID=price_...

# ---------------------------------------------------------------------------
# Telegram (optional — needed for bot alerts)
# ---------------------------------------------------------------------------
TELEGRAM_BOT_TOKEN=...
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=tradeclawbot

TELEGRAM_FREE_CHANNEL_ID=-100...
TELEGRAM_PRO_GROUP_ID=-100...
TELEGRAM_ELITE_GROUP_ID=-100...

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL=postgresql://user:password@host:5432/tradeclaw

# ---------------------------------------------------------------------------
# Redis (optional — for Elite tier rate limiting)
# ---------------------------------------------------------------------------
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...`}
        />
      </section>

      {/* App section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">App</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Example</th>
              </tr>
            </thead>
            <tbody className="px-4 divide-y divide-white/4">
              <tr className="border-b border-white/4">
                <td className="px-4 py-3 align-top">
                  <code className="text-xs text-emerald-300 font-mono">NEXT_PUBLIC_BASE_URL</code>
                  <span className="ml-2 text-[10px] text-red-400 font-medium uppercase tracking-wide">required</span>
                </td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">Your public app URL. Used for SSE endpoints, OG images, and webhook callbacks.</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">https://tradeclaw.win</code></td>
              </tr>
              <tr className="border-b border-white/4 last:border-0">
                <td className="px-4 py-3 align-top"><code className="text-xs text-emerald-300 font-mono">APP_PORT</code></td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">Docker host port binding. Defaults to 3000.</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">3000</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Database */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Database</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/4">
                <td className="px-4 py-3 align-top">
                  <code className="text-xs text-emerald-300 font-mono">DATABASE_URL</code>
                  <span className="ml-2 text-[10px] text-red-400 font-medium uppercase tracking-wide">required</span>
                </td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">PostgreSQL connection string. Docker Compose injects this automatically.</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">postgresql://user:pass@host:5432/db</code></td>
              </tr>
              <tr className="border-b border-white/4">
                <td className="px-4 py-3 align-top"><code className="text-xs text-emerald-300 font-mono">DB_NAME</code></td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">Database name (Docker Compose only). Defaults to tradeclaw.</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">tradeclaw</code></td>
              </tr>
              <tr className="border-b border-white/4">
                <td className="px-4 py-3 align-top"><code className="text-xs text-emerald-300 font-mono">DB_USER</code></td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">Database username (Docker Compose only).</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">tradeclaw</code></td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top"><code className="text-xs text-emerald-300 font-mono">DB_PASSWORD</code></td>
                <td className="px-4 py-3 align-top text-sm text-zinc-400">Database password. Change from default in production.</td>
                <td className="px-4 py-3 align-top"><code className="text-xs text-zinc-500 font-mono">changeme</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Redis */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Redis</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Redis is optional. It is used for API rate limiting on the Elite tier. If not configured,
          rate limiting falls back to in-memory (not suitable for multi-instance deployments).
        </p>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/4">
                <td className="px-4 py-3"><code className="text-xs text-emerald-300 font-mono">UPSTASH_REDIS_REST_URL</code></td>
                <td className="px-4 py-3 text-sm text-zinc-400">Upstash Redis REST endpoint. Use local Redis URL for self-hosted.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="text-xs text-emerald-300 font-mono">UPSTASH_REDIS_REST_TOKEN</code></td>
                <td className="px-4 py-3 text-sm text-zinc-400">Auth token for Upstash. Not needed for local Redis.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Telegram */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Telegram</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Create a bot via <a href="https://t.me/BotFather" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">@BotFather</a> on Telegram to get your token.
          See the <a href="/docs/telegram" className="text-emerald-400 hover:underline">Telegram guide</a> for step-by-step setup.
        </p>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'TELEGRAM_BOT_TOKEN', desc: 'Bot API token from @BotFather. Format: 123456789:ABC...' },
                { name: 'NEXT_PUBLIC_TELEGRAM_BOT_USERNAME', desc: 'Your bot\'s @username (without @). Used for deep-link generation.' },
                { name: 'TELEGRAM_FREE_CHANNEL_ID', desc: 'Channel ID for free-tier signal broadcasts. Use a negative number for channels/groups.' },
                { name: 'TELEGRAM_PRO_GROUP_ID', desc: 'Group ID for Pro subscribers.' },
                { name: 'TELEGRAM_ELITE_GROUP_ID', desc: 'Group ID for Elite subscribers.' },
              ].map(row => (
                <tr key={row.name} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 align-top whitespace-nowrap"><code className="text-xs text-emerald-300 font-mono">{row.name}</code></td>
                  <td className="px-4 py-3 align-top text-sm text-zinc-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stripe */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-4">Stripe</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Stripe is entirely optional. Remove all Stripe variables to disable the billing UI.
          The app runs fully without Stripe — all features are available without a subscription
          in the default open-source configuration.
        </p>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'STRIPE_SECRET_KEY', desc: 'Server-side API key. Never expose to the browser.' },
                { name: 'STRIPE_PUBLISHABLE_KEY', desc: 'Client-safe publishable key.' },
                { name: 'STRIPE_WEBHOOK_SECRET', desc: 'Webhook signing secret for verifying Stripe events.' },
                { name: 'STRIPE_PRO_MONTHLY_PRICE_ID', desc: 'Price ID for the Pro monthly plan.' },
                { name: 'STRIPE_PRO_ANNUAL_PRICE_ID', desc: 'Price ID for the Pro annual plan.' },
                { name: 'STRIPE_ELITE_MONTHLY_PRICE_ID', desc: 'Price ID for the Elite monthly plan.' },
                { name: 'STRIPE_ELITE_ANNUAL_PRICE_ID', desc: 'Price ID for the Elite annual plan.' },
              ].map(row => (
                <tr key={row.name} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 align-top whitespace-nowrap"><code className="text-xs text-emerald-300 font-mono">{row.name}</code></td>
                  <td className="px-4 py-3 align-top text-sm text-zinc-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scanner */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Scanner Service</h2>
        <p className="text-sm text-zinc-500 mb-4">
          These variables control the background signal scanner process.
        </p>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Default</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/4">
                <td className="px-4 py-3"><code className="text-xs text-emerald-300 font-mono">SCAN_INTERVAL</code></td>
                <td className="px-4 py-3 text-sm text-zinc-500">60</td>
                <td className="px-4 py-3 text-sm text-zinc-400">Seconds between full scans across all instruments and timeframes.</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><code className="text-xs text-emerald-300 font-mono">SCAN_INSTRUMENTS</code></td>
                <td className="px-4 py-3 text-sm text-zinc-500">all</td>
                <td className="px-4 py-3 text-sm text-zinc-400">Comma-separated list of symbols, or &quot;all&quot; to scan every instrument.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/configuration/page.tsx" />
    </article>
  );
}

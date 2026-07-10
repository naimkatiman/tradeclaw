import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Freshness — TradeClaw",
  description:
    "Exact cadence for every data surface on TradeClaw: quotes, candles, signals, news, sentiment. No marketing fluff — just the polling intervals.",
  openGraph: {
    title: "Data Freshness — TradeClaw",
    description:
      "Exact cadence for every data surface on TradeClaw. Quotes, candles, signals, news. The truth behind 'real-time'.",
    images: [{ url: "/api/og?title=Data+Freshness", width: 1200, height: 630 }],
  },
};

interface FreshnessRow {
  surface: string;
  cadence: string;
  source: string;
  notes?: string;
}

const PRICES_AND_QUOTES: FreshnessRow[] = [
  {
    surface: "Crypto prices on /dashboard live feed (SSE)",
    cadence: "~2 seconds",
    source: "Binance public ticker (direct)",
    notes: "Server-Sent Events stream — closest thing to real-time on the site.",
  },
  {
    surface: "Forex / metals / indices / stocks on /dashboard SSE",
    cadence: "~15 seconds (poll) on top of ≤60s hub data",
    source: "market-data-hub → Twelve Data",
    notes: "Underlying quote refresh is once per minute, so wire freshness is up to ~60s.",
  },
  {
    surface: "Crypto, forex, metals, stocks on every other page",
    cadence: "Up to 60 seconds",
    source: "market-data-hub → Twelve Data",
    notes: "Hub fetches all quotes once a minute and serves them from Redis.",
  },
  {
    surface: "Forex exchange rates",
    cadence: "Up to 2 minutes",
    source: "market-data-hub → Twelve Data",
  },
  {
    surface: "OHLCV candles (M5 / M15 / H1 / H4 / D1)",
    cadence: "Up to 5 minutes",
    source: "market-data-hub → Twelve Data",
    notes: "Candles refresh on a 5-minute hub cron. Indicators recompute when new candles arrive.",
  },
];

const SIGNALS_AND_DERIVED: FreshnessRow[] = [
  {
    surface: "Trading signals (signal_history)",
    cadence: "Every 5 minutes",
    source: "TA engine inside Next.js (RSI, MACD, EMA, Bollinger, Stochastic, ADX)",
    notes:
      "Cron writes new signals every 5 min with a 2-hour symbol+direction dedup window. Same engine runs as a request side-effect on high-traffic pages.",
  },
  {
    surface: "Signal outcomes (4h / 24h hit / miss / open)",
    cadence: "Every 5 minutes",
    source: "Cron job pulls H1 candles and resolves outcomes",
    notes: "Open signals are force-closed at 2× the window if not yet hit/miss.",
  },
  {
    surface: "/track-record stats (win rate, equity curve, R-distribution)",
    cadence: "Recomputed on each request from latest signal_history",
    source: "Postgres aggregation",
    notes: "As fresh as the underlying signal_history rows — bound by the 5-min cron.",
  },
  {
    surface: "/consensus",
    cadence: "Auto-refreshes every 60 seconds (client poll)",
    source: "TA engine via /api/consensus",
  },
  {
    surface: "/news (CoinGecko trending)",
    cadence: "Auto-refreshes every 5 minutes",
    source: "CoinGecko trending endpoint",
  },
  {
    surface: "/sentiment",
    cadence: "Auto-refreshes every 5 minutes",
    source: "Multi-source sentiment aggregation",
  },
  {
    surface: "/today (Signal of the Day)",
    cadence: "Updates every 5 minutes",
    source: "Highest-confidence row from signal_history",
  },
  {
    surface: "Signal badges (SVG)",
    cadence: "Refresh every 5 minutes (CDN cache)",
    source: "TA engine via /api/badges",
  },
  {
    surface: "Telegram / Slack / Discord alerts",
    cadence: "Fire on the 5-minute cron tick when a fresh signal qualifies",
    source: "Cron + bot dispatcher",
    notes: "Alerts are real-time for everyone — there are no tiers and no delays.",
  },
];

const STATIC_DATA: FreshnessRow[] = [
  {
    surface: "Backtests (/backtest, strategy-breakdown)",
    cadence: "On-demand, computed against historical OHLCV",
    source: "packages/strategies (pure TS, not part of live signal path)",
    notes: "Backtest math is independent from live signal generation.",
  },
  {
    surface: "Glossary, docs, blog, pricing, security, this page",
    cadence: "Static — updates on deploy",
    source: "Repository content",
  },
];

function FreshnessTable({ title, rows }: { title: string; rows: FreshnessRow[] }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-card)]/60 text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Surface</th>
              <th className="px-4 py-3 font-semibold">Cadence</th>
              <th className="px-4 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.surface} className="align-top">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                  {row.surface}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.cadence}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  <span className="block">{row.source}</span>
                  {row.notes && (
                    <span className="mt-1 block text-xs italic text-[var(--text-secondary)]/80">
                      {row.notes}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DataFreshnessPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-3 text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)]">
          Transparency
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Data freshness
        </h1>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          TradeClaw markets itself as a live trading platform. To be honest about
          what &quot;live&quot; means here: nothing on this site is true streaming
          real-time in the sub-second tick sense. Every surface is on a polling
          cadence. This page is the exact map.
        </p>
      </header>

      <section className="mb-12 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-[var(--foreground)]">
        <p className="font-semibold">How the data flows</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--text-secondary)]">
          <li>
            Twelve Data is the upstream provider for forex, metals, indices, stocks,
            and historical candles. Binance is the upstream for crypto ticks.
          </li>
          <li>
            A separate Railway service (<code className="rounded bg-[var(--bg-card)] px-1 py-0.5 text-xs">market-data-hub</code>) fetches Twelve Data on cron and caches the
            results in Redis. TradeClaw reads the cache, not Twelve Data directly.
          </li>
          <li>
            Trading signals are computed inside the Next.js process by our TA engine
            (RSI, MACD, EMA, Bollinger, Stochastic, ADX) and written to Postgres on a
            5-minute cron.
          </li>
        </ol>
      </section>

      <FreshnessTable title="Prices & quotes" rows={PRICES_AND_QUOTES} />
      <FreshnessTable title="Signals & derived data" rows={SIGNALS_AND_DERIVED} />
      <FreshnessTable title="Static & on-demand" rows={STATIC_DATA} />

      <section className="mb-12 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/40 p-6 text-sm">
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
          What &quot;real-time&quot; means on TradeClaw
        </h2>
        <ul className="space-y-2 text-[var(--text-secondary)]">
          <li>
            <span className="font-semibold text-[var(--foreground)]">Closest to real-time:</span>{" "}
            crypto ticks on the dashboard SSE feed (~2 second latency from Binance).
          </li>
          <li>
            <span className="font-semibold text-[var(--foreground)]">Near-real-time:</span>{" "}
            forex / metals / stock quotes on the dashboard SSE feed (up to ~60 seconds).
          </li>
          <li>
            <span className="font-semibold text-[var(--foreground)]">Polled, not streamed:</span>{" "}
            every other surface on the site, on cadences of 60 seconds to 5 minutes.
          </li>
          <li>
            <span className="font-semibold text-[var(--foreground)]">Not real-time:</span>{" "}
            trading signals (5-min cron with 2-hour dedup window), outcome resolution
            (4h / 24h windows by definition), and any historical or aggregate stat.
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
          Why we publish this
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          A signal platform that is loose with the word &quot;real-time&quot; is
          asking traders to trust it for entries that matter. We would rather
          you know exactly how stale the number you are looking at can be, so
          you can decide whether the cadence fits your trading style. Scalpers
          on M5 should size their expectations against the ~5-minute signal
          cron. Swing traders on H1 / H4 are well within the cadence envelope.
        </p>
      </section>

      <footer className="border-t border-[var(--border)] pt-6 text-xs text-[var(--text-secondary)]">
        <p>
          Last reviewed 2026-05-10. If anything on this page looks wrong against what
          the site actually shows, open an issue at{" "}
          <a
            href="https://github.com/naimkatiman/tradeclaw/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--foreground)]"
          >
            github.com/naimkatiman/tradeclaw/issues
          </a>
          .
        </p>
        <p className="mt-2">
          Related:{" "}
          <Link href="/security" className="underline hover:text-[var(--foreground)]">
            Security
          </Link>{" "}
          ·{" "}
          <Link href="/how-it-works" className="underline hover:text-[var(--foreground)]">
            How it works
          </Link>{" "}
          ·{" "}
          <Link href="/proof" className="underline hover:text-[var(--foreground)]">
            Proof
          </Link>
        </p>
      </footer>
    </main>
  );
}

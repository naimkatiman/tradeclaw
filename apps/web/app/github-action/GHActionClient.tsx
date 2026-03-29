'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  Terminal,
  Zap,
  Shield,
  BarChart3,
  Clock,
  GitBranch,
  AlertTriangle,
  Play,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ── YAML snippets ── */

const ALERT_YAML = `name: BTC Sell Alert
on:
  schedule:
    - cron: '0 */4 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: BTCUSD
          direction: SELL
          min_confidence: 80

      - name: Send Slack alert
        if: steps.signal.outputs.signal_found == 'true'
        run: |
          curl -X POST "\$SLACK_WEBHOOK" -d "{
            \\"text\\": \\"BTC SELL @ \${{ steps.signal.outputs.signal_confidence }}%\\"
          }"`;

const CI_GATE_YAML = `name: Deploy Gate
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: BTCUSD
          direction: BUY
          min_confidence: 70

      - name: Deploy if bullish
        if: steps.signal.outputs.signal_found == 'true'
        run: npm run deploy`;

const PAPER_TRADE_YAML = `name: Paper Trade
on:
  schedule:
    - cron: '0 * * * *'

jobs:
  trade:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: ETHUSD
          timeframe: H4
          min_confidence: 75

      - name: Execute paper trade
        if: steps.signal.outputs.signal_found == 'true'
        run: |
          echo "Paper \${{ steps.signal.outputs.signal_direction }} ETH"
          echo "\${{ steps.signal.outputs.signal_json }}" >> trades.log`;

const DAILY_REPORT_YAML = `name: Daily Signal Report
on:
  schedule:
    - cron: '0 8 * * *'

jobs:
  report:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        pair: [BTCUSD, ETHUSD, XAUUSD]
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: \${{ matrix.pair }}
          timeframe: D1

      - name: Write summary
        run: |
          echo "### \${{ matrix.pair }}" >> \$GITHUB_STEP_SUMMARY
          echo "- Direction: \${{ steps.signal.outputs.signal_direction }}" >> \$GITHUB_STEP_SUMMARY
          echo "- Confidence: \${{ steps.signal.outputs.signal_confidence }}%" >> \$GITHUB_STEP_SUMMARY`;

const INSTALL_SNIPPET = `- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1`;

/* ── Code block component ── */

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl border border-[var(--border)] bg-black/40 overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm text-emerald-300 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        )}
      </button>
    </div>
  );
}

/* ── Data ── */

const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Add the action to your workflow',
    desc: 'Reference the action with your pair, timeframe, and confidence threshold.',
  },
  {
    step: '2',
    title: 'Action fetches live signals',
    desc: 'Uses curl + python3 (pre-installed on runners) to query the TradeClaw API. Zero dependencies.',
  },
  {
    step: '3',
    title: 'Use outputs in subsequent steps',
    desc: 'signal_found, signal_direction, signal_confidence, and signal_json are available as step outputs.',
  },
];

const EXAMPLE_CARDS = [
  {
    icon: AlertTriangle,
    title: 'Alert on BTC Sell Signal',
    desc: 'Run every 4 hours and post to Slack when a high-confidence SELL fires.',
    yaml: ALERT_YAML,
    filename: 'alert.yml',
  },
  {
    icon: Shield,
    title: 'CI Gate on Direction',
    desc: 'Only deploy when the market is bullish with 70%+ confidence.',
    yaml: CI_GATE_YAML,
    filename: 'deploy-gate.yml',
  },
  {
    icon: Play,
    title: 'Paper Trade Trigger',
    desc: 'Hourly signal check that logs paper trades to a file.',
    yaml: PAPER_TRADE_YAML,
    filename: 'paper-trade.yml',
  },
  {
    icon: BarChart3,
    title: 'Daily Signal Report',
    desc: 'Matrix strategy scanning 3 pairs and writing a job summary.',
    yaml: DAILY_REPORT_YAML,
    filename: 'daily-report.yml',
  },
];

const INPUTS = [
  { name: 'pair', default: 'BTCUSD', desc: 'Trading pair (BTCUSD, ETHUSD, XAUUSD, ...)' },
  { name: 'timeframe', default: 'H1', desc: 'Signal timeframe (H1, H4, D1)' },
  { name: 'direction', default: 'ALL', desc: 'Filter by direction (BUY, SELL, ALL)' },
  { name: 'min_confidence', default: '70', desc: 'Minimum confidence threshold (0-100)' },
  { name: 'base_url', default: 'https://tradeclaw.win', desc: 'TradeClaw instance URL' },
];

const OUTPUTS = [
  { name: 'signal_found', desc: 'Whether a matching signal was found (true/false)' },
  { name: 'signal_direction', desc: 'Signal direction (BUY or SELL)' },
  { name: 'signal_confidence', desc: 'Signal confidence percentage (0-100)' },
  { name: 'signal_json', desc: 'Full signal JSON payload' },
];

/* ── Main component ── */

export function GHActionClient() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
            <GithubIcon className="w-3.5 h-3.5" />
            GitHub Action
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            TradeClaw <span className="text-emerald-400">GitHub Action</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Fetch live AI trading signals in your CI/CD pipeline. Gate deployments on market conditions,
            run scheduled signal checks, and get rich summaries in every Actions run.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://github.com/marketplace/actions/tradeclaw-signal-check"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              Get on Marketplace
            </a>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div
                key={s.step}
                className="relative p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50"
              >
                <span className="text-3xl font-bold text-emerald-400/20 absolute top-3 right-4">
                  {s.step}
                </span>
                <h3 className="font-semibold text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Installation</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Add to any workflow file in <code className="text-emerald-400">.github/workflows/</code>:
          </p>
          <CodeBlock code={INSTALL_SNIPPET} title=".github/workflows/signal.yml" />
        </div>
      </section>

      {/* Example workflow cards */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Example Workflows</h2>
          <div className="space-y-8">
            {EXAMPLE_CARDS.map((card) => (
              <div key={card.title}>
                <div className="flex items-center gap-2 mb-3">
                  <card.icon className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">{card.title}</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">{card.desc}</p>
                <CodeBlock code={card.yaml} title={card.filename} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inputs & Outputs */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Inputs</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
                  <th className="text-left p-3 font-medium">Input</th>
                  <th className="text-left p-3 font-medium">Default</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {INPUTS.map((inp) => (
                  <tr key={inp.name} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-mono text-emerald-400 text-xs">{inp.name}</td>
                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">{inp.default}</td>
                    <td className="p-3 text-xs text-[var(--text-secondary)]">{inp.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-8">Outputs</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
                  <th className="text-left p-3 font-medium">Output</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {OUTPUTS.map((out) => (
                  <tr key={out.name} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-mono text-emerald-400 text-xs">{out.name}</td>
                    <td className="p-3 text-xs text-[var(--text-secondary)]">{out.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Zero Dependencies', desc: 'Composite action using curl + python3 — no node_modules' },
              { icon: Shield, title: 'Deploy Gates', desc: 'Block deploys on SELL signals or low confidence' },
              { icon: BarChart3, title: 'Rich Summaries', desc: 'Signal report in your Actions run UI via GITHUB_STEP_SUMMARY' },
              { icon: Clock, title: 'Scheduled Scans', desc: 'Cron-based multi-pair signal monitoring' },
              { icon: Terminal, title: 'Self-Hosted', desc: 'Point base_url to your own TradeClaw instance' },
              { icon: GitBranch, title: 'Matrix Support', desc: 'Scan multiple pairs in parallel with matrix strategy' },
            ].map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50"
              >
                <f.icon className="w-5 h-5 text-emerald-400 mb-3" />
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to add signals to your pipeline?</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Install from GitHub Marketplace in seconds. No API key required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://github.com/marketplace/actions/tradeclaw-signal-check"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              Install from Marketplace
            </a>
            <Link
              href="/star"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border)] font-medium hover:bg-white/5 transition-colors"
            >
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

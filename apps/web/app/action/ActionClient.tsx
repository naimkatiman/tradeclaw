'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Terminal, Zap, Shield, BarChart3, Clock, GitBranch, ExternalLink } from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const BASIC_USAGE = `- name: Get BTC signal
  uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1

- name: Use the signal
  run: echo "Signal: \${{ steps.signal.outputs.signal }}"`;

const DEPLOY_GATE = `jobs:
  signal-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        with:
          pair: BTCUSD
          min_confidence: 70
          fail_on_signal: SELL

      - name: Deploy if safe
        if: success()
        run: npm run deploy`;

const MATRIX_EXAMPLE = `strategy:
  matrix:
    pair: [BTCUSD, ETHUSD, XAUUSD]
steps:
  - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
    id: signal
    with:
      pair: \${{ matrix.pair }}
      timeframe: H4`;

const SELF_HOSTED = `- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with:
    pair: BTCUSD
    base_url: http://localhost:3000`;

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
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
      </button>
    </div>
  );
}

const FEATURES = [
  { icon: Zap, title: 'Live Signals', desc: 'Fetch real-time BUY/SELL signals with confidence scores' },
  { icon: Shield, title: 'Deploy Gates', desc: 'Block deploys on SELL signals or low confidence' },
  { icon: BarChart3, title: 'Step Summary', desc: 'Rich signal report in your Actions run UI' },
  { icon: Clock, title: 'Scheduled Scans', desc: 'Cron-based multi-pair signal monitoring' },
  { icon: Terminal, title: 'Self-hosted', desc: 'Point to your own TradeClaw instance' },
  { icon: GitBranch, title: 'Matrix Support', desc: 'Scan multiple pairs in parallel with matrix strategy' },
];

const INPUTS = [
  { name: 'pair', type: 'string', default: 'BTCUSD', desc: 'Trading pair (BTCUSD, ETHUSD, XAUUSD, etc.)' },
  { name: 'timeframe', type: 'string', default: 'H1', desc: 'Signal timeframe (M5, M15, H1, H4, D1)' },
  { name: 'base_url', type: 'string', default: 'https://tradeclaw.win', desc: 'TradeClaw instance URL' },
  { name: 'fail_on_signal', type: 'string', default: 'none', desc: 'Fail step if signal matches (e.g. SELL)' },
  { name: 'signal_direction', type: 'string', default: '(any)', desc: 'Only pass if signal matches direction' },
  { name: 'min_confidence', type: 'number', default: '0', desc: 'Minimum confidence threshold (0-100)' },
];

const OUTPUTS = [
  { name: 'signal', desc: 'BUY, SELL, or NEUTRAL' },
  { name: 'confidence', desc: 'Signal confidence (0-100)' },
  { name: 'pair', desc: 'Queried trading pair' },
  { name: 'timeframe', desc: 'Queried timeframe' },
  { name: 'rsi', desc: 'Current RSI value' },
  { name: 'direction', desc: 'Alias for signal' },
];

export function ActionClient() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
            <GithubIcon className="w-3.5 h-3.5" />
            GitHub Marketplace
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
              href="https://github.com/marketplace/actions/tradeclaw-signal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              Get on Marketplace
            </a>
            <Link
              href="https://github.com/naimkatiman/tradeclaw/tree/main/packages/tradeclaw-action"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-white/5 transition-colors"
            >
              View Source
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
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

      {/* Quick Start */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Quick Start</h2>
          <CodeBlock code={BASIC_USAGE} title=".github/workflows/signal.yml" />
        </div>
      </section>

      {/* Examples */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Examples</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">Deploy Gate</h3>
              <CodeBlock code={DEPLOY_GATE} title="Block deploys on SELL or low confidence" />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">Multi-Pair Matrix</h3>
              <CodeBlock code={MATRIX_EXAMPLE} title="Scan multiple pairs in parallel" />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">Self-Hosted Instance</h3>
              <CodeBlock code={SELF_HOSTED} title="Point to your own TradeClaw" />
            </div>
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

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to add signals to your pipeline?</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Install from GitHub Marketplace in seconds. No API key required.
          </p>
          <a
            href="https://github.com/marketplace/actions/tradeclaw-signal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
            Install from Marketplace
          </a>
        </div>
      </section>
    </div>
  );
}

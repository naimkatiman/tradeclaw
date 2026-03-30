'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  ExternalLink,
  Star,
  Cpu,
  Server,
  Package,
  Terminal,
  ArrowRight,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 hover:text-white transition-all"
      aria-label={label ?? 'Copy'}
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl bg-zinc-900 border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs text-zinc-500 font-mono">{language}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm text-emerald-400 font-mono overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

const PULL_CMD = 'docker pull tradeclaw/tradeclaw';
const RUN_CMD = 'docker run -p 3000:3000 tradeclaw/tradeclaw';
const COMPOSE_CMD = `# docker-compose.yml
services:
  tradeclaw:
    image: tradeclaw/tradeclaw
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped`;

const QUICK_STARTS = [
  { label: 'Pull image', cmd: PULL_CMD, icon: <Package size={16} /> },
  { label: 'Run container', cmd: RUN_CMD, icon: <Terminal size={16} /> },
  { label: 'Docker Compose', cmd: COMPOSE_CMD, icon: <Server size={16} /> },
];

const BENEFITS = [
  {
    icon: <Zap size={20} className="text-emerald-400" />,
    title: 'Zero config',
    desc: 'One command to run the full TradeClaw stack. No Node.js, no npm install, just Docker.',
  },
  {
    icon: <Shield size={20} className="text-emerald-400" />,
    title: 'Production-ready',
    desc: 'Alpine-based image with multi-stage build. Minimal attack surface, small footprint.',
  },
  {
    icon: <RefreshCw size={20} className="text-emerald-400" />,
    title: 'Always up to date',
    desc: ':latest tag tracks main. Pin to a date tag (e.g. :2026-03-30) for reproducible deploys.',
  },
];

const IMAGE_DETAILS = [
  { label: 'Base image', value: 'node:20-alpine' },
  { label: 'Exposed port', value: '3000' },
  { label: 'Build type', value: 'Multi-stage (builder + production)' },
  { label: 'Platforms', value: 'linux/amd64, linux/arm64' },
  { label: 'Registry', value: 'hub.docker.com/r/tradeclaw/tradeclaw' },
  { label: 'Source', value: 'github.com/naimkatiman/tradeclaw' },
];

export function HubClient() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <Package size={13} />
            Official Docker Image
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Self-host TradeClaw{' '}
            <span className="text-emerald-400">in seconds</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
            One command to run the full AI trading signal platform. Multi-platform — works on
            Intel, AMD, and Apple Silicon.
          </p>

          {/* Hero pull command */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl px-5 py-3 font-mono text-sm text-emerald-400 shadow-lg">
              <span className="text-zinc-600 select-none">$</span>
              {PULL_CMD}
            </div>
            <CopyButton text={PULL_CMD} label="Copy" />
          </div>

          {/* Platform badges */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: 'linux/amd64', icon: <Cpu size={13} /> },
              { label: 'linux/arm64', icon: <Cpu size={13} /> },
              { label: 'Apple Silicon ✓', icon: null },
            ].map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
              >
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Docker Hub link */}
      <section className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Package size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold">Docker Hub</div>
            <div className="text-xs text-zinc-400">hub.docker.com/r/tradeclaw/tradeclaw</div>
          </div>
        </div>
        <a
          href="https://hub.docker.com/r/tradeclaw/tradeclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium transition-colors"
        >
          View on Docker Hub
          <ExternalLink size={14} />
        </a>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        {/* Quick Start */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Terminal size={18} className="text-emerald-400" />
            Quick Start
          </h2>
          <div className="space-y-4">
            {QUICK_STARTS.map((qs) => (
              <div key={qs.label} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-emerald-400">{qs.icon}</span>
                  {qs.label}
                </div>
                <CodeBlock code={qs.cmd} language={qs.label === 'Docker Compose' ? 'yaml' : 'bash'} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            After starting, open{' '}
            <a href="http://localhost:3000" className="text-emerald-400 hover:underline">
              localhost:3000
            </a>{' '}
            — live signals are available immediately, no account needed.
          </p>
        </section>

        {/* Image Details */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Server size={18} className="text-emerald-400" />
            Image Details
          </h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {IMAGE_DETAILS.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-5 py-3 text-sm ${
                  i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                } border-b border-white/5 last:border-0`}
              >
                <span className="text-zinc-400">{row.label}</span>
                <span className="font-mono text-white/80">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Why Docker */}
        <section>
          <h2 className="text-xl font-bold mb-6">Why Docker?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors"
              >
                <div className="mb-3">{b.icon}</div>
                <div className="font-semibold mb-1">{b.title}</div>
                <div className="text-sm text-zinc-400 leading-relaxed">{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tag strategy */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <RefreshCw size={18} className="text-emerald-400" />
            Tag Strategy
          </h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {[
              {
                tag: ':latest',
                desc: 'Always tracks the main branch. Great for staying current.',
                color: 'text-emerald-400',
              },
              {
                tag: ':2026-03-30',
                desc: 'Date-pinned release. Use in production for reproducible deploys.',
                color: 'text-blue-400',
              },
            ].map((t, i) => (
              <div
                key={t.tag}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 text-sm ${
                  i % 2 === 0 ? 'bg-white/[0.02]' : ''
                } border-b border-white/5 last:border-0`}
              >
                <code className={`font-mono font-bold ${t.color}`}>{t.tag}</code>
                <span className="text-zinc-400">{t.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Publish your own */}
        <section className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
          <h2 className="text-lg font-bold mb-2">Building your own image</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Fork TradeClaw and publish your custom build to Docker Hub with the included publish
            script:
          </p>
          <CodeBlock code="bash scripts/dockerhub-publish.sh" language="bash" />
          <p className="text-xs text-zinc-500 mt-3">
            Supports <code className="text-zinc-300">--dry-run</code> for local testing without
            pushing. Run{' '}
            <code className="text-zinc-300">bash scripts/dockerhub-publish.sh --help</code> for
            options.
          </p>
        </section>

        {/* GitHub CTA */}
        <section className="text-center py-4">
          <div className="inline-flex flex-col items-center gap-4">
            <p className="text-zinc-400 text-sm">
              TradeClaw is fully open-source. If it saves you time, consider starring the repo.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
              >
                <Star size={15} />
                Star on GitHub
              </a>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors"
              >
                Read the docs
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

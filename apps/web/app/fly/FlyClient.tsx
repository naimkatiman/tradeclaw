'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Rocket, Terminal, DollarSign, Server, ExternalLink, Star, ArrowRight, Shield } from 'lucide-react';

const FLY_TOML = `app = "tradeclaw"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile.fly"

[env]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"
  HOSTNAME = "0.0.0.0"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/health"
  timeout = "5s"

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1`;

const STEPS = [
  {
    step: '1',
    title: 'Install flyctl',
    command: 'curl -L https://fly.io/install.sh | sh',
    desc: 'One-liner install for macOS/Linux. Windows: powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"',
  },
  {
    step: '2',
    title: 'Login & clone',
    command: 'fly auth login && git clone https://github.com/naimkatiman/tradeclaw && cd tradeclaw',
    desc: 'Authenticate with Fly.io and grab the TradeClaw repo.',
  },
  {
    step: '3',
    title: 'Deploy',
    command: 'fly launch --config fly.toml && fly deploy',
    desc: 'Launch your app. Fly picks your region, builds the image, and deploys. Done.',
  },
];

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function FlyClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 md:pb-12">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 px-4 py-1.5 text-xs font-medium text-[#A78BFA] mb-6">
            <Rocket className="w-3.5 h-3.5" />
            Deploy Option #3
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Deploy TradeClaw on{' '}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] bg-clip-text text-transparent">
              Fly.io
            </span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Scale-to-zero machines, global edge networking, automatic HTTPS.
            Self-host your AI trading signals for ~$0–5/mo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/FLYIO.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white hover:bg-[#6D28D9] transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Deploy to Fly.io
            </a>
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
            >
              Docker Hub
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">3-Step Quick Start</h2>
        <div className="space-y-4">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">{s.desc}</p>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-black/40 border border-[var(--border)] px-3 py-2">
                    <code className="text-xs text-emerald-400 overflow-x-auto whitespace-nowrap flex-1">
                      {s.command}
                    </code>
                    <CopyButton text={s.command} className="text-[var(--text-secondary)] hover:text-white shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cost Comparison */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-2">
          <DollarSign className="w-6 h-6 text-[#A78BFA]" />
          Cost Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free tier */}
          <div className="rounded-2xl border-2 border-[#7C3AED]/50 bg-[#7C3AED]/5 p-6 relative">
            <div className="absolute -top-3 left-4 rounded-full bg-[#7C3AED] px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Free Tier
            </div>
            <div className="text-3xl font-bold mb-1">$0<span className="text-sm font-normal text-[var(--text-secondary)]">/mo</span></div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Perfect for personal use</p>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />3 shared-cpu machines</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />256 MB RAM</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />100 GB outbound transfer</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Auto HTTPS + custom domain</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Scale-to-zero (pay nothing idle)</li>
            </ul>
          </div>

          {/* Paid */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="text-3xl font-bold mb-1">~$2–5<span className="text-sm font-normal text-[var(--text-secondary)]">/mo</span></div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Always-on + more memory</p>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Always-on machine (no cold start)</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />512 MB+ RAM</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Persistent volumes</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Multi-region deployment</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" />Priority support</li>
            </ul>
          </div>
        </div>
      </section>

      {/* fly.toml Preview */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#A78BFA]" />
            fly.toml
          </h2>
          <CopyButton text={FLY_TOML} className="text-[var(--text-secondary)] hover:text-white px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[#7C3AED]" />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-black/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[10px] text-[var(--text-secondary)] ml-2 font-mono">fly.toml</span>
          </div>
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
            <code className="text-[#A78BFA]">{FLY_TOML}</code>
          </pre>
        </div>
      </section>

      {/* Fly.io Features */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Why Fly.io?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Server, title: 'Scale to Zero', desc: 'Machines hibernate when idle. Pay nothing until a request arrives. ~2s cold start.' },
            { icon: Shield, title: 'Auto HTTPS', desc: 'Free TLS certificates. Custom domains. Global Anycast network. Zero config.' },
            { icon: Rocket, title: 'Global Edge', desc: 'Deploy to 30+ regions worldwide. Run close to your users with one command.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-center">
              <f.icon className="w-6 h-6 text-[#A78BFA] mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Other Deploy Options */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-lg font-bold mb-4 text-center text-[var(--text-secondary)]">Other Deploy Options</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Railway
          </a>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Docker Hub
          </Link>
          <Link
            href="/replit"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Replit
          </Link>
        </div>
      </section>

      {/* GitHub Star CTA */}
      <section className="max-w-3xl mx-auto px-4 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <Star className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Star TradeClaw on GitHub</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Help more traders discover free, open-source signal tools.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-colors"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}

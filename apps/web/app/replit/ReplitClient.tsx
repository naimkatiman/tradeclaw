'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Terminal,
  Zap,
  GitFork,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  Star,
  Server,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

const STEPS = [
  {
    num: 1,
    icon: GitFork,
    title: 'Fork on Replit',
    description: 'Click the button below to import the TradeClaw GitHub repo into your Replit account. No local install needed.',
    code: 'https://replit.com/github/naimkatiman/tradeclaw',
    isLink: true,
  },
  {
    num: 2,
    icon: Settings,
    title: 'Set env vars (optional)',
    description: 'Open the Secrets panel and add NEXT_PUBLIC_APP_URL. TradeClaw runs in demo mode without any secrets.',
    code: 'NEXT_PUBLIC_APP_URL=https://<slug>.<user>.repl.co',
    isLink: false,
  },
  {
    num: 3,
    icon: Play,
    title: 'Hit Run',
    description: 'Replit installs dependencies and starts the dev server. Your instance is live at the URL in the webview.',
    code: 'npm install && npm run dev',
    isLink: false,
  },
];

const WORKS = [
  { feature: 'Live signal dashboard', ok: true },
  { feature: 'Signal screener & filters', ok: true },
  { feature: 'Backtest engine', ok: true },
  { feature: 'Strategy builder', ok: true },
  { feature: 'Paper trading simulator', ok: true },
  { feature: 'Public API endpoints', ok: true },
  { feature: 'Demo mode (auto-enabled)', ok: true },
  { feature: 'Signal sharing & OG cards', ok: true },
];

const LIMITS = [
  { feature: 'Persistent file storage', ok: false, note: 'Data resets on restart. Use Export to back up.' },
  { feature: 'Always-on (free tier)', ok: false, note: 'Free Replit sleeps after ~5 min idle. Upgrade for always-on.' },
  { feature: 'Stable Telegram webhook', ok: false, note: 'Requires stable public URL — unreliable on free tier.' },
  { feature: 'Custom domain', ok: false, note: 'Use self-hosted Docker for your own domain.' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 p-1 rounded text-zinc-400 hover:text-emerald-400 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function ReplitClient() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F26207]/10 via-transparent to-emerald-900/10 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Replit logo wordmark badge */}
          <div className="inline-flex items-center gap-2 bg-[#F26207]/20 border border-[#F26207]/40 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#F26207] text-sm font-mono font-semibold">replit</span>
            <span className="text-zinc-400 text-xs">20M users</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Run TradeClaw on{' '}
            <span className="text-[#F26207]">Replit</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Zero install. Fork the repo, hit run, and your live trading signal dashboard is online in minutes — straight from your browser.
          </p>

          {/* Replit fork button */}
          <a
            href="https://replit.com/github/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#F26207] hover:bg-[#e05a06] text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-[#F26207]/20"
          >
            <GitFork size={20} />
            Fork on Replit
            <ExternalLink size={16} />
          </a>

          <div className="mt-4">
            <Link
              href="/hub"
              className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
            >
              Prefer Docker self-hosting? →
            </Link>
          </div>
        </div>
      </section>

      {/* 3-step guide */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-10 text-center">Get running in 3 steps</h2>
        <div className="grid gap-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 flex gap-5"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F26207]/20 border border-[#F26207]/30 flex items-center justify-center">
                  <Icon size={18} className="text-[#F26207]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-500 font-mono">STEP {step.num}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-zinc-400 text-sm mb-3">{step.description}</p>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between font-mono text-sm">
                    <span className="text-emerald-400 truncate">{step.code}</span>
                    {step.isLink ? (
                      <a
                        href={step.code}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 p-1 rounded text-zinc-400 hover:text-[#F26207] transition-colors flex-shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <CopyButton text={step.code} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What works / limits */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* What works */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle size={18} className="text-emerald-400" />
              <h3 className="font-semibold text-white">What works on Replit</h3>
            </div>
            <ul className="space-y-2.5">
              {WORKS.map(({ feature }) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Limits */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <XCircle size={18} className="text-rose-400" />
              <h3 className="font-semibold text-white">Free tier limitations</h3>
            </div>
            <ul className="space-y-3">
              {LIMITS.map(({ feature, note }) => (
                <li key={feature} className="text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <XCircle size={14} className="text-rose-500 flex-shrink-0" />
                    {feature}
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5 ml-5">{note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Production CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-700/50 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Server size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">Ready for production?</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Replit is perfect for demos and development. For persistent data, custom domains, and always-on availability, deploy with Docker on any $4/mo VPS.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/hub"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Terminal size={14} />
                  Docker self-hosting
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/benchmark"
                  className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Cost comparison
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Star CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-10">
          <Zap size={32} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Like what you see?</h2>
          <p className="text-zinc-400 mb-6">
            TradeClaw is 100% open source. A GitHub star helps more developers discover it.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"
          >
            <Star size={16} className="text-yellow-400" />
            Star on GitHub
          </a>
        </div>
      </section>
    </div>
  );
}

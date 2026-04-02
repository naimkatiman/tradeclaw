'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Database, Shield, Zap, Server, ExternalLink, Star, ArrowRight, Table, Terminal, Lock } from 'lucide-react';

const STEPS = [
  {
    step: '1',
    title: 'Create a Supabase project',
    command: 'https://supabase.com/dashboard/new',
    desc: 'Sign up free at supabase.com. Create a new project — copy your Project URL and anon/service keys.',
    isLink: true,
  },
  {
    step: '2',
    title: 'Run the schema',
    command: 'psql $SUPABASE_URL -f supabase/schema.sql',
    desc: 'Or paste schema.sql into the Supabase SQL Editor. Creates all 20+ tables with indexes.',
  },
  {
    step: '3',
    title: 'Migrate your data',
    command: 'SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=ey... node supabase/migrate.js',
    desc: 'Reads your existing data/*.json files and upserts everything into Supabase. Safe to run multiple times.',
  },
];

const SCHEMA_PREVIEW = `-- Core tables (20+ total)
CREATE TABLE signal_history (
  id TEXT PRIMARY KEY,
  pair TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('BUY','SELL')),
  confidence NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  timestamp BIGINT NOT NULL,
  outcomes JSONB DEFAULT '{}'
);

CREATE TABLE paper_trades (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price NUMERIC, exit_price NUMERIC,
  pnl NUMERIC, pnl_percent NUMERIC,
  opened_at TIMESTAMPTZ, closed_at TIMESTAMPTZ
);

CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, url TEXT NOT NULL,
  pairs JSONB DEFAULT '"all"',
  min_confidence INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true
);

-- + api_keys, users, email_subscribers,
--   telegram_subscribers, sms_subscribers,
--   plugins, price_alerts, votes, pledges,
--   push_subscriptions, slack_integrations,
--   app_users, subscriptions, and more...`;

const MIGRATE_PREVIEW = `#!/usr/bin/env node
// Reads data/*.json → upserts into Supabase

node supabase/migrate.js              # migrate all
node supabase/migrate.js --dry-run    # preview only
node supabase/migrate.js --seed       # seed data info`;

const ENV_VARS = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'Your Supabase project URL', example: 'https://abc123.supabase.co' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Public anon key (safe for browser)', example: 'eyJhbGciOiJIUzI1NiIs...' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Service role key (server-side only)', example: 'eyJhbGciOiJIUzI1NiIs...' },
];

const BENEFITS = [
  {
    icon: Database,
    title: 'Persistent Data',
    desc: 'No more data loss on restart. Your signals, trades, and subscribers survive deploys and container rebuilds.',
  },
  {
    icon: Shield,
    title: 'Real Multi-User',
    desc: 'Row Level Security, proper auth, concurrent writes. Scale from solo to team without data corruption.',
  },
  {
    icon: Zap,
    title: 'Handle 1M+ Rows',
    desc: 'JSON files slow down at 10K records. Postgres handles millions with proper indexes and query planning.',
  },
  {
    icon: Table,
    title: 'Dashboard UI',
    desc: 'Supabase Studio gives you a full admin panel — browse tables, run queries, manage RLS policies, view logs.',
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

export function SupabaseClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 md:pb-12">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3ECF8E]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#3ECF8E]/15 border border-[#3ECF8E]/30 px-4 py-1.5 text-xs font-medium text-[#3ECF8E] mb-6">
            <Database className="w-3.5 h-3.5" />
            Database Upgrade
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Scale TradeClaw with{' '}
            <span className="bg-gradient-to-r from-[#3ECF8E] to-[#2da86e] bg-clip-text text-transparent">
              Supabase
            </span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Migrate from JSON files to managed Postgres in 5 minutes.
            Persistent data, real multi-user support, and a built-in dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/SUPABASE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#3ECF8E] px-6 py-3 text-sm font-semibold text-black hover:bg-[#35b87e] transition-colors"
            >
              <Database className="w-4 h-4" />
              Setup Guide
            </a>
            <Link
              href="/fly"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
            >
              Fly.io Deploy
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3ECF8E]/20 border border-[#3ECF8E]/40 flex items-center justify-center text-sm font-bold text-[#3ECF8E]">
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

      {/* Benefits */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Why Supabase?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <b.icon className="w-6 h-6 text-[#3ECF8E] mb-3" />
              <h3 className="text-sm font-semibold mb-1">{b.title}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Schema Preview */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#3ECF8E]" />
            Schema Preview
          </h2>
          <CopyButton text={SCHEMA_PREVIEW} className="text-[var(--text-secondary)] hover:text-white px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[#3ECF8E]" />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-black/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[10px] text-[var(--text-secondary)] ml-2 font-mono">schema.sql</span>
          </div>
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
            <code className="text-[#3ECF8E]">{SCHEMA_PREVIEW}</code>
          </pre>
        </div>
      </section>

      {/* Migration Script Preview */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-[#3ECF8E]" />
            Migration Script
          </h2>
          <CopyButton text="node supabase/migrate.js" className="text-[var(--text-secondary)] hover:text-white px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[#3ECF8E]" />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-black/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[10px] text-[var(--text-secondary)] ml-2 font-mono">migrate.js</span>
          </div>
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
            <code className="text-[#3ECF8E]">{MIGRATE_PREVIEW}</code>
          </pre>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-2">
          <Lock className="w-6 h-6 text-[#3ECF8E]" />
          Environment Variables
        </h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-black/20">
                  <th className="text-left px-4 py-3 font-semibold">Variable</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody>
                {ENV_VARS.map((v) => (
                  <tr key={v.name} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-4 py-3 font-mono text-[#3ECF8E] whitespace-nowrap">{v.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{v.desc}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] font-mono whitespace-nowrap">{v.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Deploy Options */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <h2 className="text-lg font-bold mb-4 text-center text-[var(--text-secondary)]">Deploy with Supabase</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Railway + Supabase
          </a>
          <a
            href="https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Vercel + Supabase
          </a>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white hover:border-[var(--foreground)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Docker Hub
          </Link>
        </div>
      </section>

      {/* Documentation Link */}
      <section className="max-w-3xl mx-auto px-4 mb-16">
        <div className="rounded-2xl border border-[#3ECF8E]/30 bg-[#3ECF8E]/5 p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Full Documentation</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Complete guide covering schema reference, RLS policies, troubleshooting, and FAQ.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/SUPABASE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#3ECF8E]/50 px-5 py-2 text-sm font-medium text-[#3ECF8E] hover:bg-[#3ECF8E]/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Read docs/SUPABASE.md
          </a>
        </div>
      </section>

      {/* GitHub Star CTA */}
      <section className="max-w-3xl mx-auto px-4 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <Star className="w-8 h-8 text-amber-400 mx-auto mb-3" />
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

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Server,
  DollarSign,
  TrendingDown,
  Star,
  Share2,
  CheckCircle2,
  XCircle,
  Minus,
  Calculator,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface SaaS {
  id: string;
  name: string;
  monthlyUSD: number;
  color: string;
  features: string[];
  missing: string[];
}

const SAAS_OPTIONS: SaaS[] = [
  {
    id: 'tradingview',
    name: 'TradingView Pro',
    monthlyUSD: 59.95,
    color: '#2962FF',
    features: ['Advanced charts', 'Pine Script alerts', 'Multi-layout'],
    missing: ['Open source', 'Self-hostable', 'Full API access', 'Custom indicators (code)', 'No data vendor lock-in'],
  },
  {
    id: '3commas',
    name: '3Commas Advanced',
    monthlyUSD: 99,
    color: '#1AC8A2',
    features: ['Bot trading', 'DCA bots', 'Grid bots'],
    missing: ['Open source', 'Self-hostable', 'Signal engine transparency', 'Custom TA engine', 'Developer API'],
  },
  {
    id: 'cryptohopper',
    name: 'Cryptohopper Hero',
    monthlyUSD: 99,
    color: '#F6A623',
    features: ['Automated trading', 'Copy trading', 'Exchange connect'],
    missing: ['Open source', 'Self-hostable', 'Full audit trail', 'Plugin system', 'Backtest transparency'],
  },
  {
    id: 'coinigy',
    name: 'Coinigy Pro',
    monthlyUSD: 29.99,
    color: '#FF6B35',
    features: ['Portfolio tracking', '45+ exchanges', 'Price alerts'],
    missing: ['Open source', 'Self-hostable', 'AI signal generation', 'Strategy builder', 'Webhook marketplace'],
  },
  {
    id: 'tradeclaw-cloud',
    name: 'Alpha Screener (SaaS)',
    monthlyUSD: 0,
    color: '#10B981',
    features: ['Managed hosting', 'No setup needed', 'Auto-updates'],
    missing: [],
  },
];

const VPS_OPTIONS = [
  { name: 'Hetzner CX11', monthlyUSD: 4.15, ram: '2 GB', storage: '20 GB SSD', note: 'Budget pick' },
  { name: 'DigitalOcean Basic', monthlyUSD: 6, ram: '1 GB', storage: '25 GB SSD', note: 'Easy setup' },
  { name: 'Fly.io Free Tier', monthlyUSD: 0, ram: '256 MB', storage: '1 GB', note: 'Hobby / demo' },
  { name: 'Railway Starter', monthlyUSD: 5, ram: '512 MB', storage: '1 GB', note: 'Zero config' },
];

const TC_FEATURES = [
  'Real-time AI signals (RSI/MACD/EMA/BB)',
  'Multi-timeframe analysis (H1/H4/D1)',
  'Backtesting engine + paper trading',
  'Telegram + Discord + Webhook alerts',
  'Plugin system (custom indicators)',
  'Strategy builder + marketplace',
  'Public API + SDK + CLI',
  'MCP server for AI assistants',
  'Docker one-command deploy',
  'Full source code access',
];

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1200 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    let raf: number;
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return (
    <span>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export default function BenchmarkClient() {
  const [selectedSaaS, setSelectedSaaS] = useState<string>('tradingview');
  const [vpsChoice, setVpsChoice] = useState(0);
  const [years, setYears] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const saas = SAAS_OPTIONS.find((s) => s.id === selectedSaaS) ?? SAAS_OPTIONS[0];
  const vps = VPS_OPTIONS[vpsChoice];

  const saasAnnual = saas.monthlyUSD * 12 * years;
  const vpsAnnual = vps.monthlyUSD * 12 * years;
  const savings = saasAnnual - vpsAnnual;
  const savingsPct = saasAnnual > 0 ? Math.round((savings / saasAnnual) * 100) : 100;

  const handleShare = () => {
    const tweet = encodeURIComponent(
      `💸 I save $${Math.round(savings).toLocaleString()}/year by self-hosting TradeClaw on a $${vps.monthlyUSD}/mo VPS instead of ${saas.name} ($${saas.monthlyUSD}/mo)\n\n` +
      `Free, open-source, same features → https://github.com/naimkatiman/tradeclaw\n\n` +
      `#selfhosted #algotrading #opensource`
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
  };

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
          <Server className="w-3 h-3" />
          Self-hosting cost analysis
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          TradeClaw on <span className="text-emerald-400">$4/mo</span> vs{' '}
          <span className="text-rose-400">$200/mo</span> SaaS
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
          The same AI trading signals, backtesting, and webhook alerts — self-hosted for the price of a coffee.
          No subscriptions. No lock-in. Full source code.
        </p>
      </div>

      {/* Savings calculator */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-[var(--border)] mb-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h2 className="text-lg font-semibold">Savings Calculator</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* SaaS picker */}
          <div>
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest">
              Compare against
            </label>
            <div className="flex flex-col gap-1.5">
              {SAAS_OPTIONS.filter((s) => s.id !== 'tradeclaw-cloud').map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSaaS(s.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                    selectedSaaS === s.id
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs font-mono">${s.monthlyUSD}/mo</span>
                </button>
              ))}
            </div>
          </div>

          {/* VPS picker */}
          <div>
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest">
              Your VPS
            </label>
            <div className="flex flex-col gap-1.5">
              {VPS_OPTIONS.map((v, i) => (
                <button
                  key={v.name}
                  onClick={() => setVpsChoice(i)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                    vpsChoice === i
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5'
                  }`}
                >
                  <div className="text-left">
                    <div>{v.name}</div>
                    <div className="text-[10px] opacity-60">{v.ram} · {v.storage}</div>
                  </div>
                  <span className="text-xs font-mono">
                    {v.monthlyUSD === 0 ? 'Free' : `$${v.monthlyUSD}/mo`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration + result */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest">
                Time period
              </label>
              <div className="flex gap-2 mb-6">
                {[1, 2, 3, 5].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      years === y
                        ? 'bg-white/10 border border-white/20 text-white'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent text-center">
              <div className="text-xs text-[var(--text-secondary)] mb-1">You save</div>
              <div className="text-4xl font-black text-emerald-400 mb-1">
                <AnimatedCounter target={Math.max(0, Math.round(savings))} prefix="$" />
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                over {years} year{years > 1 ? 's' : ''} ({savingsPct}% less)
              </div>
              {savings > 0 && (
                <button
                  onClick={handleShare}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                  Share this
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cost breakdown bars */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[var(--text-secondary)]">{saas.name}</span>
              <span className="font-mono text-rose-400">${saasAnnual.toLocaleString()}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-700"
                style={{ width: `${saasAnnual > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[var(--text-secondary)]">TradeClaw + {vps.name}</span>
              <span className="font-mono text-emerald-400">${vpsAnnual.toLocaleString()}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              {saasAnnual > 0 ? (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${(vpsAnnual / saasAnnual) * 100}%` }}
                />
              ) : (
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '2%' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* SaaS features */}
        <div className="glass rounded-2xl p-6 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{saas.name}</h3>
            <span className="text-rose-400 font-bold text-sm">${saas.monthlyUSD}/mo</span>
          </div>
          <div className="space-y-2">
            {saas.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
            {saas.missing.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs opacity-50">
                <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TradeClaw features */}
        <div className="glass rounded-2xl p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">TradeClaw (self-hosted)</h3>
            <span className="text-emerald-400 font-bold text-sm">Free</span>
          </div>
          <div className="space-y-2">
            {TC_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All SaaS comparison table */}
      <div className="glass rounded-2xl p-6 border border-[var(--border)] mb-8 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          Annual cost comparison
        </h2>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Platform</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Monthly</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Annual</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2">vs TradeClaw</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {SAAS_OPTIONS.map((s) => {
              const annual = s.monthlyUSD * 12;
              const diff = annual - vpsAnnual;
              return (
                <tr key={s.id} className={s.id === 'tradeclaw-cloud' ? 'bg-emerald-500/5' : ''}>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{s.name}</span>
                    {s.id === 'tradeclaw-cloud' && (
                      <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">self-hosted</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono">
                    {s.monthlyUSD === 0 ? (
                      <span className="text-emerald-400">Free</span>
                    ) : (
                      <span className="text-rose-400">${s.monthlyUSD}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono">
                    {annual === 0 ? (
                      <span className="text-emerald-400">${vpsAnnual.toFixed(0)}</span>
                    ) : (
                      <span className="text-rose-400">${annual.toFixed(0)}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {diff > 0 ? (
                      <span className="text-rose-400 font-medium">+${Math.round(diff)}/yr</span>
                    ) : diff < 0 ? (
                      <span className="text-emerald-400 font-medium">-${Math.round(Math.abs(diff))}/yr</span>
                    ) : (
                      <span className="text-[var(--text-secondary)] flex items-center justify-end gap-1">
                        <Minus className="w-3 h-3" /> Same
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[10px] text-[var(--text-secondary)] mt-3">
          * TradeClaw self-hosted cost = {vps.name} (${vps.monthlyUSD}/mo). Prices as of 2026. SaaS prices are base plans.
        </p>
      </div>

      {/* FAQ accordion */}
      <div className="glass rounded-2xl border border-[var(--border)] mb-8 overflow-hidden">
        <h2 className="text-sm font-semibold p-5 border-b border-[var(--border)] flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Common questions
        </h2>
        {[
          {
            q: 'Does TradeClaw have the same signal quality as TradingView alerts?',
            a: 'TradeClaw generates signals from a custom TA engine (RSI/MACD/EMA/Bollinger/Stochastic) with multi-timeframe confluence scoring. TradingView requires you to write Pine Script alerts yourself — TradeClaw does it automatically with AI scoring.',
          },
          {
            q: 'What VPS do you recommend?',
            a: 'Hetzner CX11 (€3.99/mo) is the community favourite — fast SSD, EU datacenter, excellent uptime. DigitalOcean Droplet ($6/mo) is great if you prefer a friendlier UI. Railway and Fly.io have free tiers for testing.',
          },
          {
            q: 'Is there a managed cloud version?',
            a: 'Alpha Screener is the managed SaaS version if you don\'t want to self-host. The self-hosted version (this repo) is always free and open-source.',
          },
          {
            q: 'Can I migrate from TradingView to TradeClaw?',
            a: 'Yes — use the Pine Script Importer (/pine-to-tradeclaw) to convert your existing Pine Script strategy into a TradeClaw strategy JSON in one click.',
          },
        ].map((item) => (
          <div key={item.q} className="border-b border-[var(--border)] last:border-0">
            <button
              className="w-full flex items-center justify-between p-5 text-left text-sm font-medium hover:bg-white/3 transition-colors"
              onClick={() => setExpanded(expanded === item.q ? null : item.q)}
            >
              <span>{item.q}</span>
              {expanded === item.q ? (
                <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 ml-2" />
              )}
            </button>
            {expanded === item.q && (
              <div className="px-5 pb-5 text-sm text-[var(--text-secondary)]">{item.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA section */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Deploy in 60 seconds
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            One command, any VPS or cloud provider. Zero config required.
          </p>
          <code className="block bg-black/40 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 mb-4">
            docker run -p 3000:3000 tradeclaw/tradeclaw
          </code>
          <Link
            href="/docs/deployment"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Full deployment guide
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="glass rounded-2xl p-6 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Join 1,000-star mission
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Free, open-source, self-hostable. A GitHub star costs nothing and helps more developers find TradeClaw.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold transition-colors"
          >
            <Star className="w-3 h-3" />
            Star on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}

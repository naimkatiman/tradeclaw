'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface SaaS {
  id: string;
  name: string;
  monthlyUSD: number;
  color: string;
}

const SAAS_OPTIONS: SaaS[] = [
  { id: 'tradingview', name: 'TradingView Pro', monthlyUSD: 59.95, color: '#2962FF' },
  { id: '3commas', name: '3Commas Advanced', monthlyUSD: 37, color: '#1AC8A2' },
  { id: 'cryptohopper', name: 'Cryptohopper Pioneer', monthlyUSD: 107.5, color: '#F6A623' },
  { id: 'coinigy', name: 'Coinigy', monthlyUSD: 18.66, color: '#FF6B35' },
];

const VPS_OPTIONS = [
  { name: 'Hetzner CX11', monthlyUSD: 3.49, ram: '2 GB', vcpu: '1 vCPU', storage: '20 GB SSD', note: 'Best value' },
  { name: 'DigitalOcean', monthlyUSD: 4, ram: '512 MB', vcpu: '1 vCPU', storage: '10 GB SSD', note: 'Easy setup' },
  { name: 'Oracle Cloud Free Tier', monthlyUSD: 0, ram: '1 GB', vcpu: '2 OCPUs', storage: '50 GB', note: 'Always free ARM' },
  { name: 'Railway.app', monthlyUSD: 5, ram: '512 MB', vcpu: 'Shared', storage: '1 GB', note: 'Zero config' },
];

const MAX_MONTHLY = Math.max(...SAAS_OPTIONS.map((s) => s.monthlyUSD));

type Support = true | false | 'partial';

interface FeatureRow {
  feature: string;
  tc: Support;
  tv: Support;
  threeC: Support;
  ch: Support;
}

const FEATURE_ROWS: FeatureRow[] = [
  { feature: 'Live Signals', tc: true, tv: 'partial', threeC: true, ch: true },
  { feature: 'Backtesting', tc: true, tv: true, threeC: 'partial', ch: 'partial' },
  { feature: 'Custom Indicators', tc: true, tv: true, threeC: false, ch: false },
  { feature: 'API Access', tc: true, tv: 'partial', threeC: true, ch: true },
  { feature: 'No Rate Limits', tc: true, tv: false, threeC: false, ch: false },
  { feature: 'Self-hosted', tc: true, tv: false, threeC: false, ch: false },
  { feature: 'Privacy (your data stays yours)', tc: true, tv: false, threeC: false, ch: false },
  { feature: 'Monthly Cost', tc: true, tv: false, threeC: false, ch: false },
];

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const hasIO = typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';
  const [visible, setVisible] = useState(!hasIO);

  useEffect(() => {
    if (!hasIO) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, hasIO]);

  return [ref, visible];
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function AnimatedCounter({
  target,
  prefix = '',
  suffix = '',
  duration = 1200,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
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

function SupportIcon({ value }: { value: Support }) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (value === 'partial') return <Minus className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-rose-400" />;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function BenchmarkClient() {
  const [selectedSaaS, setSelectedSaaS] = useState<string>('tradingview');
  const [years, setYears] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [barsRef, barsVisible] = useInView(0.2);

  const saas = SAAS_OPTIONS.find((s) => s.id === selectedSaaS) ?? SAAS_OPTIONS[0];
  const avgSaaS = Math.round(SAAS_OPTIONS.reduce((sum, s) => sum + s.monthlyUSD, 0) / SAAS_OPTIONS.length);

  const saasAnnual = saas.monthlyUSD * 12 * years;
  const savings = saasAnnual;
  const freeVPSMonths = savings > 0 ? Math.round(savings / 4) : 0;

  const handleShare = useCallback(() => {
    const tweet = encodeURIComponent(
      `I just found out I can replace my $${saas.monthlyUSD}/mo ${saas.name} subscription with TradeClaw — free, open-source, self-hosted on a $4/mo VPS.\n\nThat saves me $${Math.round(saasAnnual)}/year.\n\nhttps://github.com/naimkatiman/tradeclaw\n\n#selfhosted #algotrading #opensource`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
  }, [saas, saasAnnual]);

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
      {/* ── Hero ── */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
          <Server className="w-3 h-3" />
          Self-hosting cost analysis
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Stop Paying <span className="text-rose-400">$200/mo</span> for Trading Tools
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto mb-8">
          TradeClaw is free, open-source, and runs on a <span className="text-emerald-400 font-semibold">$4/mo VPS</span>.
        </p>

        {/* Stat callouts */}
        <div className="flex justify-center gap-6 md:gap-10">
          <div className="glass rounded-2xl px-6 py-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent text-center">
            <div className="text-3xl font-black text-emerald-400">$0</div>
            <div className="text-xs text-[var(--text-secondary)]">TradeClaw / mo</div>
          </div>
          <div className="glass rounded-2xl px-6 py-4 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent text-center">
            <div className="text-3xl font-black text-rose-400">${avgSaaS}</div>
            <div className="text-xs text-[var(--text-secondary)]">Average SaaS / mo</div>
          </div>
        </div>
      </section>

      {/* ── Animated Cost Comparison ── */}
      <section ref={barsRef} className="glass rounded-3xl p-6 md:p-8 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          Monthly Cost Comparison
        </h2>
        <div className="space-y-4">
          {SAAS_OPTIONS.map((s, i) => (
            <div key={s.id}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--text-secondary)]">{s.name}</span>
                <span className="font-mono text-rose-400">${s.monthlyUSD}/mo</span>
              </div>
              <div className="h-4 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all ease-out"
                  style={{
                    width: barsVisible ? `${(s.monthlyUSD / MAX_MONTHLY) * 100}%` : '0%',
                    transitionDuration: '1s',
                    transitionDelay: `${i * 200}ms`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
            </div>
          ))}
          {/* TradeClaw */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-400 font-semibold">TradeClaw</span>
              <span className="font-mono text-emerald-400">$0/mo (or $4 VPS)</span>
            </div>
            <div className="h-4 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all ease-out"
                style={{
                  width: barsVisible ? '3%' : '0%',
                  transitionDuration: '1s',
                  transitionDelay: `${SAAS_OPTIONS.length * 200}ms`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Savings Calculator ── */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-[var(--border)] mb-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h2 className="text-lg font-semibold">Annual Savings Calculator</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* SaaS dropdown */}
          <div>
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest">
              Your current SaaS
            </label>
            <div className="flex flex-col gap-1.5">
              {SAAS_OPTIONS.map((s) => (
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

          {/* Duration */}
          <div>
            <label className="block text-xs text-[var(--text-secondary)] font-medium mb-2 uppercase tracking-widest">
              Time period
            </label>
            <div className="flex gap-2">
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

          {/* Result */}
          <div className="glass rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent text-center flex flex-col justify-center">
            <div className="text-xs text-[var(--text-secondary)] mb-1">You save</div>
            <div className="text-4xl font-black text-emerald-400 mb-1">
              <AnimatedCounter target={Math.max(0, Math.round(savings))} prefix="$" />
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              per {years} year{years > 1 ? 's' : ''}
            </div>
            {freeVPSMonths > 0 && (
              <div className="text-xs text-emerald-400/80 mt-2">
                That&apos;s {freeVPSMonths} months of VPS hosting
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── VPS Options Table ── */}
      <section className="glass rounded-2xl p-6 border border-[var(--border)] mb-8 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          Recommended VPS Providers
        </h2>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Provider</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Cost</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">CPU</th>
              <th className="text-right text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">RAM</th>
              <th className="text-left text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {VPS_OPTIONS.map((v) => (
              <tr key={v.name} className={v.monthlyUSD === 0 ? 'bg-emerald-500/5' : ''}>
                <td className="py-2.5 pr-4 font-medium">
                  {v.name}
                  {v.monthlyUSD === 0 && (
                    <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">free</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono">
                  {v.monthlyUSD === 0 ? (
                    <span className="text-emerald-400">$0/mo</span>
                  ) : (
                    <span>${v.monthlyUSD}/mo</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">{v.vcpu}</td>
                <td className="py-2.5 pr-4 text-right text-[var(--text-secondary)]">{v.ram}</td>
                <td className="py-2.5 text-[var(--text-secondary)]">{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="glass rounded-2xl p-6 border border-[var(--border)] mb-8 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          Feature Comparison
        </h2>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 pr-4">Feature</th>
              <th className="text-center text-[10px] uppercase tracking-widest text-emerald-400 pb-2 px-4">TradeClaw</th>
              <th className="text-center text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 px-4">TradingView</th>
              <th className="text-center text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 px-4">3Commas</th>
              <th className="text-center text-[10px] uppercase tracking-widest text-[var(--text-secondary)] pb-2 px-4">Cryptohopper</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {FEATURE_ROWS.map((row) => (
              <tr key={row.feature}>
                <td className="py-2.5 pr-4 font-medium">{row.feature}</td>
                <td className="py-2.5 px-4 text-center"><SupportIcon value={row.tc} /></td>
                <td className="py-2.5 px-4 text-center"><SupportIcon value={row.tv} /></td>
                <td className="py-2.5 px-4 text-center"><SupportIcon value={row.threeC} /></td>
                <td className="py-2.5 px-4 text-center"><SupportIcon value={row.ch} /></td>
              </tr>
            ))}
            {/* Cost row */}
            <tr className="bg-emerald-500/5">
              <td className="py-2.5 pr-4 font-semibold">Monthly Cost</td>
              <td className="py-2.5 px-4 text-center font-mono text-emerald-400 font-bold">$0</td>
              <td className="py-2.5 px-4 text-center font-mono text-rose-400">$59.95</td>
              <td className="py-2.5 px-4 text-center font-mono text-rose-400">$37</td>
              <td className="py-2.5 px-4 text-center font-mono text-rose-400">$107.50</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Share / Viral Section ── */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-yellow-500/5 mb-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            Spread the Word
          </h2>
          <div className="glass rounded-2xl p-5 border border-[var(--border)] max-w-xl mx-auto mb-6 text-left">
            <p className="text-sm text-[var(--text-secondary)] italic">
              &quot;I just replaced my ${saas.monthlyUSD}/mo {saas.name} subscription with TradeClaw — free, open-source, self-hosted on a $4/mo VPS. That saves me ${Math.round(saasAnnual)}/year.&quot;
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] hover:bg-[#1DA1F2]/30 text-sm font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </button>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-sm font-semibold transition-colors"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="glass rounded-2xl border border-[var(--border)] mb-8 overflow-hidden">
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
            a: 'Hetzner CX11 is the community favourite — fast SSD, EU datacenter, excellent uptime. Oracle Cloud Free Tier is great if you want zero cost. Railway and DigitalOcean are solid alternatives.',
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
      </section>

      {/* ── CTA ── */}
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

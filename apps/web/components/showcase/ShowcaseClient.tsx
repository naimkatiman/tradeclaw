'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Star,
  GitBranch,
  ExternalLink,
  Zap,
  BarChart2,
  Code2,
  Server,
  TrendingUp,
  Users,
  Globe,
  Copy,
  Check,
  ChevronRight,
  Box,
} from 'lucide-react';

interface Signal {
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  price?: number;
  timeframe?: string;
}

interface UseCase {
  avatar: string;
  name: string;
  role: string;
  location: string;
  description: string;
  features: string[];
  setup: string;
  gradient: string;
  accentColor: string;
}

const USE_CASES: UseCase[] = [
  {
    avatar: 'A',
    name: 'Arif M.',
    role: 'Day Trader',
    location: 'Singapore 🇸🇬',
    description:
      'Monitors BTC and ETH intraday signals on H1 timeframe. Gets instant Telegram alerts when confidence crosses 75%. Uses paper trading to validate setups before going live.',
    features: [
      'Telegram bot alerts',
      'BTC/ETH H1 signals',
      'Paper trading simulator',
      'Mobile-responsive UI',
      'Price alert triggers',
    ],
    setup: 'Deployed on Railway — $0/mo on free tier',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    accentColor: 'emerald',
  },
  {
    avatar: 'K',
    name: 'Kai L.',
    role: 'Quant Developer',
    location: 'Berlin 🇩🇪',
    description:
      'Uses the REST API and CLI to pull signals into a custom Python bot. Sends webhooks to Discord for team alerts. Built a custom VWAP plugin using the plugin system.',
    features: [
      'REST API + API keys',
      'npx tradeclaw CLI',
      'Webhook marketplace',
      'Custom JS plugins',
      'Discord integration',
    ],
    setup: 'Self-hosted on VPS — full control over data',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    accentColor: 'purple',
  },
  {
    avatar: 'S',
    name: 'Sara P.',
    role: 'Crypto Hobbyist',
    location: 'Toronto 🇨🇦',
    description:
      'Runs TradeClaw on a Raspberry Pi 4 at home. Subscribes to the RSS feed for daily signal digest. Shares signal cards on X when high-confidence setups appear.',
    features: [
      'Docker one-command deploy',
      'RSS/Atom signal feed',
      'Social signal cards',
      'Signal screener',
      'Multi-timeframe view',
    ],
    setup: 'Raspberry Pi 4 — runs 24/7 on $0 electricity',
    gradient: 'from-rose-500/20 to-orange-500/10',
    accentColor: 'rose',
  },
];

const TECH_STACK = [
  { name: 'Next.js 15', icon: '▲', desc: 'App Router' },
  { name: 'TypeScript', icon: 'TS', desc: 'Fully typed' },
  { name: 'Binance API', icon: '⬡', desc: 'Live prices' },
  { name: 'TA Engine', icon: '📈', desc: 'RSI/MACD/EMA' },
  { name: 'Docker', icon: '🐳', desc: 'One-command' },
  { name: 'MCP Server', icon: '🤖', desc: 'AI native' },
];

function MockDashboard({ accentColor }: { accentColor: string }) {
  const isEmerald = accentColor === 'emerald';
  const isPurple = accentColor === 'purple';
  const barColor = isEmerald
    ? '#10b981'
    : isPurple
      ? '#a855f7'
      : '#f43f5e';

  return (
    <div
      className="rounded-lg overflow-hidden border border-white/10 bg-black/40"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-white/30 text-xs">tradeclaw.local/dashboard</span>
      </div>
      {/* Fake dashboard content */}
      <div className="p-3 space-y-2">
        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2">
          {['12 Signals', '78% Acc', '10 Pairs'].map((s) => (
            <div key={s} className="bg-white/5 rounded px-2 py-1.5 text-center">
              <div className="text-white/80 text-xs font-bold">{s.split(' ')[0]}</div>
              <div className="text-white/30 text-[10px]">{s.split(' ').slice(1).join(' ')}</div>
            </div>
          ))}
        </div>
        {/* Signal cards */}
        {[
          { pair: 'BTCUSD', dir: 'BUY', conf: 87 },
          { pair: 'XAUUSD', dir: 'SELL', conf: 72 },
        ].map((sig) => (
          <div key={sig.pair} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sig.dir === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
              >
                {sig.dir}
              </span>
              <span className="text-white/70 text-xs">{sig.pair}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${sig.conf}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="text-white/50 text-[10px]">{sig.conf}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShowcaseClient() {
  const [stars, setStars] = useState<number | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((d) => setStars(d.stars ?? d.stargazers_count ?? null))
      .catch(() => {});

    const fetchSignals = () => {
      fetch('/api/signals?limit=6')
        .then((r) => r.json())
        .then((d) => {
          const arr = Array.isArray(d) ? d : d.signals ?? [];
          setSignals(arr.slice(0, 6));
        })
        .catch(() => {});
    };
    fetchSignals();
    const iv = setInterval(() => {
      fetchSignals();
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const copyDeployCmd = () => {
    navigator.clipboard.writeText('git clone https://github.com/naimkatiman/tradeclaw && cd tradeclaw && docker compose up').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-fade-up { animation: fadeUp 0.6s ease both; }
        .anim-fade-up-1 { animation: fadeUp 0.6s ease 0.1s both; }
        .anim-fade-up-2 { animation: fadeUp 0.6s ease 0.2s both; }
        .anim-fade-up-3 { animation: fadeUp 0.6s ease 0.3s both; }
        .anim-fade-up-4 { animation: fadeUp 0.6s ease 0.4s both; }
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse-slow 2s ease infinite; }
      `}</style>

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="anim-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-emerald-400 mb-6">
            <span className="live-dot" />
            <span>Live traders using TradeClaw right now</span>
          </div>
          <h1 className="anim-fade-up-1 text-4xl md:text-6xl font-black tracking-tight mb-4">
            Traders{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Actually Using
            </span>
            <br />
            TradeClaw
          </h1>
          <p className="anim-fade-up-2 text-lg text-white/60 max-w-2xl mx-auto mb-8">
            From day traders in Singapore to quant devs in Berlin — see real setups, real workflows,
            and why they chose to self-host their trading intelligence.
          </p>
          {/* Stats bar */}
          <div className="anim-fade-up-3 flex flex-wrap justify-center gap-6 mb-10">
            {[
              { icon: Star, label: 'GitHub Stars', value: stars !== null ? `${stars}` : '…' },
              { icon: BarChart2, label: 'Signal Pairs', value: '10' },
              { icon: Globe, label: 'App Pages', value: '120+' },
              { icon: Code2, label: 'API Endpoints', value: '40+' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-0.5">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span className="text-2xl font-bold text-white">{value}</span>
                </div>
                <div className="text-white/40 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use case cards */}
      <section className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {USE_CASES.map((uc, i) => (
            <div
              key={uc.name}
              className={`glass rounded-2xl overflow-hidden anim-fade-up-${i + 1}`}
              style={{ animationDelay: `${i * 0.1 + 0.2}s` }}
            >
              {/* Card header gradient */}
              <div className={`bg-gradient-to-br ${uc.gradient} p-5 pb-4`}>
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 ${
                      uc.accentColor === 'emerald'
                        ? 'bg-emerald-500'
                        : uc.accentColor === 'purple'
                          ? 'bg-purple-500'
                          : 'bg-rose-500'
                    }`}
                  >
                    {uc.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-white">{uc.name}</div>
                    <div className="text-white/60 text-xs">{uc.role} · {uc.location}</div>
                  </div>
                </div>
                {/* Mock dashboard */}
                <MockDashboard accentColor={uc.accentColor} />
              </div>
              {/* Card body */}
              <div className="p-5">
                <p className="text-white/70 text-sm leading-relaxed mb-4">{uc.description}</p>
                <div className="space-y-1.5 mb-4">
                  {uc.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/60">
                      <ChevronRight
                        className={`w-3 h-3 flex-shrink-0 ${
                          uc.accentColor === 'emerald'
                            ? 'text-emerald-400'
                            : uc.accentColor === 'purple'
                              ? 'text-purple-400'
                              : 'text-rose-400'
                        }`}
                      />
                      {f}
                    </div>
                  ))}
                </div>
                <div
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg ${
                    uc.accentColor === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : uc.accentColor === 'purple'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  🖥️ {uc.setup}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live signal snapshot */}
      <section className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="live-dot" />
                <h2 className="text-xl font-bold">Live Signal Feed</h2>
              </div>
              <p className="text-white/50 text-sm">The same signals all three traders above are watching right now</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
            >
              Full dashboard <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          {signals.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {signals.map((sig, i) => (
                <div
                  key={`${sig.pair}-${i}`}
                  className="bg-white/5 rounded-xl p-3 hover:bg-white/8 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{sig.pair}</span>
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        sig.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {sig.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          sig.direction === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${sig.confidence}%` }}
                      />
                    </div>
                    <span className="text-white/50 text-xs">{sig.confidence}%</span>
                  </div>
                  {sig.timeframe && (
                    <div className="text-white/30 text-[10px] mt-1">{sig.timeframe}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-4 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Built With Best-in-Class Stack</h2>
          <p className="text-white/50 text-sm">Open source, auditable, no vendor lock-in</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {TECH_STACK.map((t) => (
            <div key={t.name} className="glass rounded-xl p-4 text-center hover:bg-white/8 transition-colors group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{t.icon}</div>
              <div className="text-white text-xs font-bold">{t.name}</div>
              <div className="text-white/40 text-[10px] mt-0.5">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Deploy CTA */}
      <section className="px-4 pb-24 max-w-4xl mx-auto text-center">
        <div className="glass rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-transparent to-purple-950/20 pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs mb-5">
              <Zap className="w-3.5 h-3.5" />
              Deploy in under 2 minutes
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Start Your Own TradeClaw
            </h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Free forever. Self-hosted. No API keys needed to get started. One Docker command.
            </p>

            {/* Command copy */}
            <div className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3 max-w-xl mx-auto">
              <code className="text-emerald-400 text-xs md:text-sm truncate">
                git clone github.com/naimkatiman/tradeclaw && docker compose up
              </code>
              <button
                onClick={copyDeployCmd}
                className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </button>
            </div>

            {/* Deploy buttons */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <a
                href="https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#7B2FBE] hover:bg-[#8B3FBE] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Server className="w-4 h-4" /> Deploy on Railway
              </a>
              <a
                href="https://vercel.com/new/clone?repository-url=https://github.com/naimkatiman/tradeclaw/tree/main/apps/web"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg transition-colors border border-white/10"
              >
                <Box className="w-4 h-4" /> Deploy on Vercel
              </a>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors border border-white/10"
              >
                <GitBranch className="w-4 h-4" /> View on GitHub
              </a>
            </div>

            {/* Share */}
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=Check%20out%20TradeClaw%20%E2%80%94%20open-source%20AI%20trading%20signal%20platform%20with%20RSI%2FMACD%2FEMA%2C%20Telegram%20alerts%2C%20paper%20trading%2C%20and%20100%2B%20features.%20Free%20%26%20self-hosted.%20https%3A%2F%2Fgithub.com%2Fnaimkatiman%2Ftradeclaw`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Share on X
              </a>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-yellow-400/70 hover:text-yellow-400 text-xs transition-colors"
              >
                <Star className="w-3.5 h-3.5" /> Star on GitHub ({stars ?? '…'})
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

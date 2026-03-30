'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Copy,
  CheckCheck,
  ExternalLink,
  Star,
  Bell,
  Users,
  Zap,
  Shield,
  ChevronRight,
  Hash,
  Volume2,
  Headphones,
} from 'lucide-react';

const INVITE_URL = 'https://discord.gg/tradeclaw';

const CHANNELS = [
  {
    icon: Hash,
    name: 'live-signals',
    description: 'Real-time BUY/SELL signal alerts for BTC, ETH, XAU and 7+ pairs — auto-posted every cycle.',
    color: 'text-emerald-400',
    badge: 'Live',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    icon: Hash,
    name: 'strategies',
    description: 'Share your strategy JSON, get feedback, and discover community-built setups for every timeframe.',
    color: 'text-purple-400',
    badge: 'Community',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    icon: Hash,
    name: 'support',
    description: 'Self-hosting help, Docker questions, API issues — the community and maintainers respond fast.',
    color: 'text-blue-400',
    badge: 'Help',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    icon: Volume2,
    name: 'announcements',
    description: 'New releases, breaking changes, and roadmap updates — never miss a TradeClaw milestone.',
    color: 'text-amber-400',
    badge: 'Official',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    icon: Hash,
    name: 'showcase',
    description: 'Post your dashboard screenshots, backtest results, and custom strategy performance.',
    color: 'text-rose-400',
    badge: 'Show & Tell',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  {
    icon: Headphones,
    name: 'general',
    description: 'Off-topic trading talk, market discussion, and community banter.',
    color: 'text-zinc-400',
    badge: 'Open',
    badgeColor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
];

const MILESTONES = [
  { stars: 10, reward: 'Discord #early-access channel unlocked for first 10 members' },
  { stars: 50, reward: 'Community vote on next major feature — members decide' },
  { stars: 100, reward: 'Exclusive #alpha-signals channel with highest-confidence-only alerts' },
  { stars: 500, reward: 'TradeClaw members get custom strategy review from maintainers' },
  { stars: 1000, reward: 'Full open roadmap + community RFC process for v2.0' },
];

const WEBHOOK_STEPS = [
  {
    step: 1,
    title: 'Create a Discord Webhook',
    body: 'In your Discord server, go to any channel → Edit Channel → Integrations → Webhooks → New Webhook. Copy the URL.',
  },
  {
    step: 2,
    title: 'Open TradeClaw Webhooks',
    body: 'Go to Settings → Webhooks (or /settings/webhooks) and click "Add Webhook".',
  },
  {
    step: 3,
    title: 'Paste the URL',
    body: 'Paste your Discord webhook URL. TradeClaw auto-detects Discord and formats signals as rich embeds with BUY/SELL color coding.',
  },
  {
    step: 4,
    title: 'Choose your filters',
    body: 'Filter by asset pair (BTC, ETH, XAU…) and minimum confidence (e.g. 75%+) so you only get high-quality signals.',
  },
  {
    step: 5,
    title: 'Save and test',
    body: 'Click "Test" to receive a sample signal embed in your Discord channel immediately.',
  },
];

// Mock Discord-style embed preview
function SignalEmbed() {
  return (
    <div className="rounded-lg overflow-hidden border border-[#5865F2]/40 bg-[#2b2d31] font-sans text-sm shadow-xl">
      {/* Discord chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1f22] border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-rose-500" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="ml-2 text-xs text-zinc-500">#live-signals</span>
      </div>

      {/* Message */}
      <div className="px-4 py-3">
        {/* Bot avatar + name */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">TC</span>
          </div>
          <span className="text-[#5865F2] font-semibold text-sm">TradeClaw</span>
          <span className="text-[10px] bg-[#5865F2] text-white px-1 rounded font-medium">BOT</span>
          <span className="text-zinc-500 text-xs">Today at 4:07 AM</span>
        </div>

        {/* Embed */}
        <div className="ml-10 border-l-4 border-emerald-500 bg-[#232428] rounded-r-lg p-3 space-y-1">
          <div className="text-white font-bold text-sm">📈 BUY Signal — BTCUSD H1</div>
          <div className="text-zinc-300 text-xs">
            Confidence: <span className="text-emerald-400 font-semibold">87%</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 text-xs mt-1">
            <div>
              <div className="text-zinc-500 uppercase text-[10px] tracking-wide">Entry</div>
              <div className="text-zinc-200">$67,420</div>
            </div>
            <div>
              <div className="text-zinc-500 uppercase text-[10px] tracking-wide">Take Profit</div>
              <div className="text-emerald-400">$68,150</div>
            </div>
            <div>
              <div className="text-zinc-500 uppercase text-[10px] tracking-wide">Stop Loss</div>
              <div className="text-rose-400">$66,800</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs mt-1 text-zinc-400">
            <span>RSI: <span className="text-amber-400">42</span></span>
            <span>MACD: <span className="text-emerald-400">+0.12</span></span>
            <span>EMA: <span className="text-emerald-400">↑ Bullish</span></span>
          </div>
          <div className="mt-2 text-[10px] text-[#5865F2] hover:underline cursor-pointer">
            🔗 View full analysis →
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiscordServerClient() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INVITE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800/50 pb-16 pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse 800px 400px at 50% -80px, #5865F2, transparent)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          {/* Discord logo mark */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#5865F2] shadow-lg shadow-[#5865F2]/30">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Join the TradeClaw{' '}
            <span className="text-[#5865F2]">Discord</span> Community
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
            Live signals in your server, strategy discussions with fellow traders,
            and direct access to the maintainers.
          </p>

          {/* Invite card */}
          <div className="mt-8 mx-auto max-w-md rounded-2xl border border-[#5865F2]/40 bg-zinc-900/80 p-5 shadow-xl shadow-[#5865F2]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">TradeClaw Community</div>
                <div className="text-xs text-zinc-400">discord.gg/tradeclaw</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Online
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Join Server
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Community growing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Live signal alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#5865F2]" />
              <span>Free forever</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 space-y-20 pt-16">

        {/* Signal preview */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Signals land in Discord like this</h2>
            <p className="mt-2 text-zinc-400 text-sm">Rich embeds with color-coded direction, TP/SL levels, and one-click analysis link.</p>
          </div>
          <div className="max-w-md mx-auto">
            <SignalEmbed />
          </div>
        </section>

        {/* Channels */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            <Hash className="inline w-6 h-6 text-[#5865F2] mr-2 -mt-0.5" />
            Community Channels
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map((ch) => (
              <div
                key={ch.name}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-[#5865F2]/40 transition-colors"
              >
                <ch.icon className={`mt-0.5 w-5 h-5 flex-shrink-0 ${ch.color}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-200">#{ch.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ch.badgeColor} font-medium`}>
                      {ch.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{ch.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Webhook setup guide */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Discord Server</h2>
          <p className="text-zinc-400 text-sm mb-8">
            Already have a trading server? Route TradeClaw signals directly into your own Discord channel in under 5 minutes.
          </p>
          <div className="space-y-4">
            {WEBHOOK_STEPS.map((s) => (
              <div
                key={s.step}
                className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
              >
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">{s.title}</div>
                  <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/settings/webhooks"
              className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4] transition-colors"
            >
              <Zap className="w-4 h-4" />
              Open Webhook Settings
              <ChevronRight className="w-4 h-4 opacity-70" />
            </Link>
            <Link
              href="/docs/webhooks"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Read docs
            </Link>
          </div>
        </section>

        {/* Milestone rewards */}
        <section>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Star Milestone Rewards</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-5">
              Early Discord members get first access to exclusive channels as the repo hits star milestones. 
              Star the repo to help us get there faster.
            </p>
            <div className="space-y-3">
              {MILESTONES.map((m) => (
                <div key={m.stars} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center gap-1 text-amber-400 w-16">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-sm font-semibold">{m.stars}</span>
                  </div>
                  <p className="text-sm text-zinc-300">{m.reward}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              title: 'Live Signals',
              body: 'Auto-broadcast top signals from every cycle directly into #live-signals.',
            },
            {
              icon: Users,
              color: 'text-[#5865F2]',
              bg: 'bg-[#5865F2]/10',
              title: 'Community Input',
              body: 'Upvote features, report false signals, and shape the roadmap.',
            },
            {
              icon: Shield,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              title: 'Early Access',
              body: 'Members see beta features before GitHub release — exclusive preview builds.',
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-center"
            >
              <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${b.bg}`}>
                <b.icon className={`w-5 h-5 ${b.color}`} />
              </div>
              <div className="text-sm font-semibold text-zinc-200">{b.title}</div>
              <p className="mt-1 text-xs text-zinc-400">{b.body}</p>
            </div>
          ))}
        </section>

        {/* Star CTA */}
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-8 text-center">
          <Star className="mx-auto mb-3 w-8 h-8 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-white mb-2">Help us reach 1000 stars</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Every star unlocks more community features and keeps TradeClaw free and open-source. 
            Takes 2 seconds — means a lot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 transition-colors"
            >
              <Star className="w-4 h-4 fill-white" />
              Star on GitHub
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Join Discord
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

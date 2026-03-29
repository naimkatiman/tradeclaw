'use client';

import Link from 'next/link';
import {
  Heart,
  Users,
  Code,
  Clock,
  Zap,
  Database,
  Smartphone,
  Cloud,
  DollarSign,
  Copy,
  ExternalLink,
  Gift,
  Star,
  ArrowLeft,
  Check,
  Shield,
  Rocket,
} from 'lucide-react';
import { useState } from 'react';

const SPONSORS_URL = 'https://github.com/sponsors/naimkatiman';

/* ─── Sponsorship Tiers ─── */

interface SponsorTier {
  name: string;
  price: string;
  priceAmount: number;
  badge?: string;
  color: string;
  borderColor: string;
  benefits: string[];
  href: string;
}

const TIERS: SponsorTier[] = [
  {
    name: 'Community',
    price: '$5/mo',
    priceAmount: 5,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    benefits: [
      'Name in sponsors wall',
      'Discord sponsor role',
      'Early access to release notes',
    ],
    href: SPONSORS_URL,
  },
  {
    name: 'Supporter',
    price: '$20/mo',
    priceAmount: 20,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    benefits: [
      'Everything in Community',
      'Logo on /sponsor page',
      'Priority issue responses',
      'Monthly progress newsletter',
    ],
    href: SPONSORS_URL,
  },
  {
    name: 'Business',
    price: '$100/mo',
    priceAmount: 100,
    badge: 'Popular',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    benefits: [
      'Everything in Supporter',
      'Logo on README',
      'Private support channel',
      'Feature request priority',
      'Consulting call (1hr/mo)',
    ],
    href: SPONSORS_URL,
  },
  {
    name: 'Enterprise',
    price: '$500/mo',
    priceAmount: 500,
    badge: 'For Teams',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    benefits: [
      'Everything in Business',
      'Custom integration support',
      'Dedicated onboarding',
      'Logo on landing page',
      'Co-development input',
    ],
    href: SPONSORS_URL,
  },
];

/* ─── Roadmap Unlocks ─── */

interface RoadmapMilestone {
  sponsors: number;
  feature: string;
  description: string;
  icon: typeof Database;
}

const ROADMAP_MILESTONES: RoadmapMilestone[] = [
  {
    sponsors: 10,
    feature: 'PostgreSQL Migration',
    description: 'Move from file-based JSON to a real database for production-grade persistence.',
    icon: Database,
  },
  {
    sponsors: 25,
    feature: 'MT4/MT5 Broker Support',
    description: 'Connect TradeClaw signals directly to MetaTrader via MetaApi integration.',
    icon: Zap,
  },
  {
    sponsors: 50,
    feature: 'Mobile App',
    description: 'React Native app with push notifications, charts, and signal alerts on the go.',
    icon: Smartphone,
  },
  {
    sponsors: 100,
    feature: 'Managed Cloud Hosting',
    description: 'One-click deploy with managed updates, backups, and monitoring built in.',
    icon: Cloud,
  },
];

/* ─── Stats ─── */

interface OssStat {
  label: string;
  value: string;
  icon: typeof Code;
}

const OSS_STATS: OssStat[] = [
  { label: 'Lines of Code', value: '45k+', icon: Code },
  { label: 'Commits', value: '200+', icon: Clock },
  { label: 'Contributors', value: 'Growing', icon: Users },
  { label: 'Uptime', value: '99.9%', icon: Shield },
];

/* ─── Why Sponsor ─── */

interface WhySponsorReason {
  title: string;
  description: string;
  icon: typeof DollarSign;
}

const WHY_SPONSOR: WhySponsorReason[] = [
  {
    title: 'Server Costs',
    description: 'API hosting, data feeds, and CDN costs add up. Your sponsorship keeps the infrastructure running.',
    icon: DollarSign,
  },
  {
    title: 'Dev Time',
    description: 'TradeClaw is built by a solo developer. Sponsoring buys focused development hours.',
    icon: Clock,
  },
  {
    title: 'Feature Velocity',
    description: 'More sponsors = faster roadmap. Each milestone unlocks features the community has voted for.',
    icon: Rocket,
  },
  {
    title: 'Independence',
    description: 'No VC, no ads, no data selling. User-funded means user-aligned. Your money keeps it that way.',
    icon: Shield,
  },
];

/* ─── Component ─── */

export function SponsorClient() {
  const [copied, setCopied] = useState(false);

  const currentSponsors = 0;
  const shareUrl = 'https://tradeclaw.win/sponsor';
  const shareText = 'Support TradeClaw — open-source AI trading signals. Sponsor tiers from $5/mo.';

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">

        {/* ─── Hero ─── */}
        <section className="text-center mb-20 animate-fade-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to TradeClaw
          </Link>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center">
              <Heart className="w-8 h-8 text-pink-400" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Support <span className="text-emerald-400">TradeClaw</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Open source needs funding to stay independent. Your sponsorship keeps TradeClaw
            free, ad-free, and moving fast.
          </p>

          <a
            href={SPONSORS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
          >
            <Heart className="w-4 h-4" />
            Sponsor on GitHub
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </section>

        {/* ─── Tiers ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">Sponsorship Tiers</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            Choose a tier that fits you. Every dollar counts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border backdrop-blur-xl bg-white/[0.03] p-6 flex flex-col transition-all duration-300 ${tier.borderColor}`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-zinc-300 border border-white/10">
                    {tier.badge}
                  </span>
                )}

                <div className="mb-4">
                  <h3 className={`text-lg font-semibold ${tier.color}`}>{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold">${tier.priceAmount}</span>
                    <span className="text-zinc-500 text-sm">/mo</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-zinc-400">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.color}`} />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 hover:bg-white/5 ${tier.borderColor} ${tier.color}`}
                >
                  Sponsor {tier.price}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Roadmap Unlocks ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">Sponsor Milestones</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            Reach X sponsors and we build Y. Your support accelerates the roadmap.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROADMAP_MILESTONES.map((milestone) => {
              const reached = currentSponsors >= milestone.sponsors;
              return (
                <div
                  key={milestone.feature}
                  className={`rounded-2xl border backdrop-blur-xl bg-white/[0.03] p-6 transition-all duration-300 ${
                    reached
                      ? 'border-emerald-500/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        reached
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-zinc-400'
                      }`}
                    >
                      {milestone.sponsors}
                    </div>
                    <milestone.icon
                      className={`w-5 h-5 ${reached ? 'text-emerald-400' : 'text-zinc-500'}`}
                    />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{milestone.feature}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{milestone.description}</p>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
                      <span>{currentSponsors} sponsors</span>
                      <span>{milestone.sponsors} goal</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          reached ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                        style={{
                          width: `${Math.min((currentSponsors / milestone.sponsors) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Sponsors Wall ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">Our Sponsors</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            People and companies keeping TradeClaw alive.
          </p>

          <div className="rounded-2xl border border-dashed border-white/10 backdrop-blur-xl bg-white/[0.02] p-12 text-center">
            <Gift className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 font-medium mb-2">Be the first sponsor!</p>
            <p className="text-xs text-zinc-600 mb-6 max-w-md mx-auto">
              Your name or logo will appear here. Sponsors make open source sustainable.
            </p>
            <a
              href={SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-500/10 text-pink-400 text-sm font-semibold border border-pink-500/20 hover:bg-pink-500/20 transition-all duration-300"
            >
              <Heart className="w-4 h-4" />
              Become a Sponsor
            </a>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">TradeClaw by the Numbers</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            This is what your sponsorship sustains.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {OSS_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 backdrop-blur-xl bg-white/[0.03] p-6 text-center"
              >
                <stat.icon className="w-5 h-5 text-emerald-400 mx-auto mb-3" />
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Why Sponsor ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">Why Sponsor?</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            Honest breakdown of where your money goes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {WHY_SPONSOR.map((reason) => (
              <div
                key={reason.title}
                className="rounded-2xl border border-white/10 backdrop-blur-xl bg-white/[0.03] p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <reason.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-sm">{reason.title}</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{reason.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Share ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-2">Spread the Word</h2>
          <p className="text-zinc-500 text-center mb-10 text-sm">
            Can&apos;t sponsor? Sharing helps just as much.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </a>

            <a
              href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Support TradeClaw — Open-Source AI Trading Signals')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
              Share on Reddit
            </a>

            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Share on LinkedIn
            </a>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </section>

        {/* ─── Footer CTA ─── */}
        <section className="text-center rounded-2xl border border-white/10 backdrop-blur-xl bg-white/[0.03] p-10 sm:p-14">
          <Star className="w-8 h-8 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Every dollar helps</h2>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto mb-8">
            TradeClaw is free for everyone. Sponsoring keeps it that way — no ads,
            no paywalls, no investor pressure. Just a better tool for traders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
            >
              <Heart className="w-4 h-4" />
              Sponsor on GitHub
            </a>

            <a
              href="https://ko-fi.com/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              Ko-fi
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>

            <a
              href="https://buymeacoffee.com/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              Buy Me a Coffee
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          </div>

          <p className="mt-6 text-xs text-zinc-600">
            All tiers managed through{' '}
            <a href={SPONSORS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-400">
              GitHub Sponsors
            </a>
            . One-time donations welcome on Ko-fi and Buy Me a Coffee.
          </p>
        </section>
      </div>
    </main>
  );
}

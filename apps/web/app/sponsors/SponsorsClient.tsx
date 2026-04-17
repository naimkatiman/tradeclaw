'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Star, GitFork, Users, ExternalLink, CheckCircle, Share2 } from 'lucide-react';

interface Sponsor {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  tier: string;
  amount: number;
  since: string;
  message: string;
}

interface Tier {
  name: string;
  amount: number;
  color: string;
  perks: string[];
  sponsorCount: number;
}

interface Goal {
  amount: number;
  label: string;
  description: string;
}

interface SponsorsData {
  sponsors: Sponsor[];
  tiers: Tier[];
  goals: Goal[];
  stats: {
    totalSponsors: number;
    monthlyRevenue: number;
    githubUrl: string;
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const GRADIENT_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-rose-500 to-pink-600',
  'from-zinc-500 to-orange-600',
];

function TierColor({ tier }: { tier: string }) {
  if (tier === 'Champion') return 'text-purple-400 bg-purple-500/10 border border-purple-500/20';
  if (tier === 'Supporter') return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
  return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
}

export function SponsorsClient() {
  const [data, setData] = useState<SponsorsData | null>(null);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/sponsors')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((d) => setStars(d.stars))
      .catch(() => {});
  }, []);

  const tiers = data?.tiers ?? [];
  const sponsors = data?.sponsors ?? [];
  const goals = data?.goals ?? [];
  const githubUrl = data?.stats?.githubUrl ?? 'https://github.com/sponsors/naimkatiman';
  const totalMrr = data?.stats?.monthlyRevenue ?? 0;
  const currentGoal = goals.find((g) => g.amount > totalMrr) ?? goals[goals.length - 1];
  const goalPct = currentGoal ? Math.min(100, Math.round((totalMrr / currentGoal.amount) * 100)) : 0;

  const shareText = encodeURIComponent(
    `I just sponsored @naimkatiman's TradeClaw — open-source AI trading signals, free forever 🚀\n\nhttps://github.com/sponsors/naimkatiman`,
  );

  return (
    <main
      className="min-h-screen pb-32 pt-28"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium mb-6">
          <Heart className="w-3 h-3 fill-rose-400" />
          Open Source Sustainability
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Support TradeClaw&apos;s
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">
            Open Source Mission
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-xl mx-auto">
          TradeClaw is free forever. Your sponsorship funds new features, a hosted demo,
          and full-time maintenance. Zero paywalls, always.
        </p>

        {/* OSS Stats */}
        <div className="flex items-center justify-center gap-8 mb-8">
          {[
            { icon: Star, label: 'GitHub Stars', value: stars ?? '…' },
            { icon: GitFork, label: 'Forks', value: '12+' },
            { icon: Users, label: 'Sponsors', value: data?.stats.totalSponsors ?? '…' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold mb-0.5">
                <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                {value}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{label}</div>
            </div>
          ))}
        </div>

        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300 active:scale-[0.98]"
        >
          <Heart className="w-4 h-4 fill-white" />
          Sponsor on GitHub
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </section>

      {/* Funding goal */}
      {currentGoal && (
        <section className="max-w-2xl mx-auto px-6 mb-16">
          <div
            className="rounded-2xl border border-[var(--border)] p-6"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                  Current Goal
                </div>
                <div className="text-lg font-semibold">{currentGoal.label}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">${totalMrr}</div>
                <div className="text-xs text-[var(--text-secondary)]">of ${currentGoal.amount}/mo</div>
              </div>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{currentGoal.description}</p>
          </div>
        </section>
      )}

      {/* Tiers */}
      <section className="max-w-4xl mx-auto px-6 mb-16">
        <h2 className="text-xl font-semibold text-center mb-8">Choose a tier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const isChampion = tier.name === 'Champion';
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 ${
                  isChampion
                    ? 'border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
                    : 'border-[var(--border)]'
                }`}
                style={{ background: 'var(--bg-card)' }}
              >
                {isChampion && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest">
                    Most Impact
                  </div>
                )}
                <div>
                  <div
                    className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${TierColor({ tier: tier.name })}`}
                  >
                    {tier.name}
                  </div>
                  <div className="text-3xl font-bold">
                    ${tier.amount}
                    <span className="text-sm text-[var(--text-secondary)] font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {tier.sponsorCount} sponsor{tier.sponsorCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center text-xs font-semibold py-2.5 rounded-full transition-all duration-300 ${
                    isChampion
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'border border-[var(--border)] hover:bg-white/5 text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Become a {tier.name}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sponsor wall */}
      {sponsors.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 mb-16">
          <h2 className="text-xl font-semibold text-center mb-2">Our Sponsors</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
            These amazing people keep TradeClaw free for everyone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sponsors.map((sponsor, i) => (
              <div
                key={sponsor.id}
                className="flex items-start gap-4 rounded-2xl border border-[var(--border)] p-4"
                style={{ background: 'var(--bg-card)' }}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                    GRADIENT_COLORS[i % GRADIENT_COLORS.length]
                  } flex items-center justify-center text-white text-sm font-bold shrink-0`}
                >
                  {getInitials(sponsor.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{sponsor.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${TierColor({ tier: sponsor.tier })}`}
                    >
                      {sponsor.tier}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mb-1">
                    Since {new Date(sponsor.since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  {sponsor.message && (
                    <p className="text-xs text-[var(--text-secondary)] italic line-clamp-2">
                      &ldquo;{sponsor.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All goals */}
      <section className="max-w-3xl mx-auto px-6 mb-16">
        <h2 className="text-xl font-semibold text-center mb-8">Roadmap milestones</h2>
        <div className="flex flex-col gap-3">
          {goals.map((goal) => {
            const reached = totalMrr >= goal.amount;
            const pct = Math.min(100, Math.round((totalMrr / goal.amount) * 100));
            return (
              <div
                key={goal.amount}
                className={`rounded-2xl border p-5 transition-all duration-300 ${
                  reached
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--border)]'
                }`}
                style={reached ? {} : { background: 'var(--bg-card)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold">{goal.label}</span>
                    {reached && (
                      <span className="ml-2 text-xs text-emerald-400 font-medium">✓ Reached!</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">${goal.amount}/mo</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">{goal.description}</p>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      reached ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-pink-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why sponsor */}
      <section className="max-w-2xl mx-auto px-6 mb-16 text-center">
        <h2 className="text-xl font-semibold mb-6">Why sponsor?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: '🔓',
              title: 'Keeps it free',
              desc: 'TradeClaw is MIT-licensed and always will be. Sponsors make that sustainable.',
            },
            {
              icon: '⚡',
              title: 'Ships faster',
              desc: 'Sponsorship lets the maintainer spend more time on features you actually want.',
            },
            {
              icon: '🌍',
              title: 'Open ecosystem',
              desc: 'Your support builds public infrastructure the whole trading dev community benefits from.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--border)] p-5"
              style={{ background: 'var(--bg-card)' }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-semibold text-sm mb-1">{title}</div>
              <div className="text-xs text-[var(--text-secondary)]">{desc}</div>
            </div>
          ))}
        </div>

        {/* Share */}
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[var(--border)] hover:bg-white/5 text-sm px-5 py-2.5 rounded-full transition-all duration-300 mr-3"
        >
          <Share2 className="w-4 h-4" />
          Share on X
        </a>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300"
        >
          <Heart className="w-4 h-4 fill-white" />
          Become a Sponsor
        </a>
      </section>

      {/* Star CTA */}
      <section className="max-w-2xl mx-auto px-6 text-center">
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Not ready to sponsor? A GitHub star costs nothing and helps discovery.
        </p>
        <a
          href="https://github.com/naimkatiman/tradeclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[var(--border)] hover:bg-white/5 text-sm px-5 py-2.5 rounded-full transition-all duration-300"
        >
          <Star className="w-4 h-4 text-zinc-400" />
          Star on GitHub
          <span className="text-[var(--text-secondary)] text-xs">{stars ? `${stars} stars` : ''}</span>
        </a>
        <div className="mt-4 text-xs text-[var(--text-secondary)]">
          Already a sponsor?{' '}
          <Link href="/contribute" className="text-emerald-400 hover:underline">
            Contribute code too
          </Link>
        </div>
      </section>
    </main>
  );
}

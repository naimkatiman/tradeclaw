'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Copy,
  Check,
  ExternalLink,
  Star,
  Code2,
  Share2,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';

const OFFICIAL_BASE = 'https://tradeclaw.win';

const BADGE_PAIRS = [
  { pair: 'BTCUSD', label: 'BTC', color: 'F7931A' },
  { pair: 'ETHUSD', label: 'ETH', color: '627EEA' },
  { pair: 'XAUUSD', label: 'Gold', color: 'FFD700' },
  { pair: 'EURUSD', label: 'EUR/USD', color: '003087' },
  { pair: 'GBPUSD', label: 'GBP/USD', color: 'CF142B' },
  { pair: 'USDJPY', label: 'USD/JPY', color: 'BC002D' },
];

const BADGE_STYLES = [
  { id: 'flat', label: 'Flat' },
  { id: 'flat-square', label: 'Square' },
  { id: 'for-the-badge', label: 'Big' },
  { id: 'plastic', label: 'Plastic' },
];

function shieldsUrl(baseUrl: string, pair: string, style: string) {
  const clean = baseUrl.replace(/\/$/, '');
  const endpoint = encodeURIComponent(`${clean}/api/badge/${pair}/json`);
  return `https://img.shields.io/endpoint?url=${endpoint}&style=${style}&cacheSeconds=300`;
}

function badgeMarkdown(baseUrl: string, pair: string, style: string, label: string) {
  const img = shieldsUrl(baseUrl, pair, style);
  const link = `${baseUrl.replace(/\/$/, '')}/dashboard`;
  return `[![TradeClaw ${label} Signal](${img})](${link})`;
}

function CopyButton({ text, small = false }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200 ${
        small
          ? 'px-2 py-1 text-xs'
          : 'px-3 py-1.5 text-xs'
      } ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
      }`}
    >
      {copied ? (
        <><Check className="w-3 h-3" />Copied!</>
      ) : (
        <><Copy className="w-3 h-3" />Copy</>
      )}
    </button>
  );
}

export default function BadgesReadmeClient() {
  const [instanceUrl, setInstanceUrl] = useState('');
  const [badgeStyle, setBadgeStyle] = useState('flat-square');
  const [showCustom, setShowCustom] = useState(false);
  const [stars, setStars] = useState<number | null>(null);

  // Fetch stars on mount
  useState(() => {
    fetch('/api/github-stars')
      .then(r => r.json())
      .then(d => setStars(d.stars ?? d.stargazers_count ?? null))
      .catch(() => {});
  });

  const customBase = instanceUrl.trim() || OFFICIAL_BASE;
  const isCustom = instanceUrl.trim().length > 0 && instanceUrl.trim() !== OFFICIAL_BASE;

  const allMarkdown = BADGE_PAIRS.map(({ pair, label }) =>
    badgeMarkdown(customBase, pair, badgeStyle, label)
  ).join('\n');

  const officialAllMarkdown = BADGE_PAIRS.map(({ pair, label }) =>
    badgeMarkdown(OFFICIAL_BASE, pair, badgeStyle, label)
  ).join('\n');

  const shareText = encodeURIComponent(
    `Added live signal badges to my README using @TradeClaw_win 📊\n\nShowing real-time BUY/SELL signals for BTC, ETH, XAU and more — completely free & open source.\n\nhttps://tradeclaw.win/badges/readme`
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* Hero */}
      <section className="relative border-b border-[var(--border)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
            <BadgeCheck className="w-3.5 h-3.5" />
            Live Signal Badges
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Add Live Signal Badges
            <br />
            <span className="text-emerald-400">to Your README</span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mb-8 leading-relaxed">
            Fork TradeClaw and show real-time BUY/SELL signals directly in your README.
            Every fork with badges becomes a signal discovery node for your community.
          </p>

          {/* Live badge previews — official */}
          <div className="flex flex-wrap gap-2 mb-8">
            {BADGE_PAIRS.slice(0, 4).map(({ pair, label }) => (
              <img
                key={pair}
                src={shieldsUrl(OFFICIAL_BASE, pair, 'flat-square')}
                alt={`TradeClaw ${label} signal`}
                className="h-5"
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#generator"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all duration-200 inline-flex items-center gap-2"
            >
              <Code2 className="w-4 h-4" />
              Generate Badges
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all duration-200 inline-flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
              {stars !== null && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  {stars}
                </span>
              )}
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">

        {/* Official Instance Badges */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Official Instance Badges
            </h2>
            <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">
              tradeclaw.win
            </span>
          </div>

          <p className="text-sm text-zinc-400 mb-5">
            Use these in your project&apos;s README to reference TradeClaw&apos;s live signals.
            Badges auto-update every 5 minutes.
          </p>

          {/* Style picker */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-zinc-500 mr-1">Style:</span>
            {BADGE_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setBadgeStyle(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  badgeStyle === s.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Badge grid */}
          <div className="grid gap-3">
            {BADGE_PAIRS.map(({ pair, label }) => {
              const md = badgeMarkdown(OFFICIAL_BASE, pair, badgeStyle, label);
              const imgUrl = shieldsUrl(OFFICIAL_BASE, pair, badgeStyle);
              return (
                <div
                  key={pair}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                >
                  <div className="w-28 flex-shrink-0">
                    <img src={imgUrl} alt={`${label} signal badge`} className="h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs text-zinc-400 font-mono break-all line-clamp-1">
                      {md}
                    </code>
                  </div>
                  <CopyButton text={md} small />
                </div>
              );
            })}
          </div>

          {/* Copy all block */}
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-white/[0.02]">
              <span className="text-xs font-medium text-zinc-400">All badges — copy to README.md</span>
              <CopyButton text={officialAllMarkdown} />
            </div>
            <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {officialAllMarkdown}
            </pre>
          </div>
        </section>

        {/* Custom Instance Generator */}
        <section id="generator">
          <button
            onClick={() => setShowCustom(v => !v)}
            className="w-full flex items-center justify-between p-5 rounded-xl border border-[var(--border)] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Custom Fork Badges</p>
                <p className="text-xs text-zinc-500">Generate badges pointing to your self-hosted instance</p>
              </div>
            </div>
            {showCustom
              ? <ChevronUp className="w-4 h-4 text-zinc-400" />
              : <ChevronDown className="w-4 h-4 text-zinc-400" />
            }
          </button>

          {showCustom && (
            <div className="mt-4 p-5 rounded-xl border border-[var(--border)] bg-white/[0.02] space-y-5">
              {/* URL input */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Your TradeClaw Instance URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={instanceUrl}
                    onChange={e => setInstanceUrl(e.target.value)}
                    placeholder="https://mytradeclaw.railway.app"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                  />
                  {isCustom && (
                    <a
                      href={`${customBase}/api/badge/BTCUSD/json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all inline-flex items-center"
                      title="Test badge endpoint"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </a>
                  )}
                </div>
                {!isCustom && (
                  <p className="mt-1.5 text-xs text-zinc-600">
                    Leave empty to use the official tradeclaw.win instance
                  </p>
                )}
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-3">
                  Preview — badges will point to{' '}
                  <code className="text-emerald-400">{customBase}</code>
                </p>
                <div className="flex flex-wrap gap-2 mb-4 p-4 rounded-lg bg-zinc-950 border border-white/5">
                  {BADGE_PAIRS.map(({ pair, label }) => (
                    <img
                      key={pair}
                      src={shieldsUrl(customBase, pair, badgeStyle)}
                      alt={`${label} signal`}
                      className="h-5"
                    />
                  ))}
                </div>

                <div className="grid gap-3">
                  {BADGE_PAIRS.map(({ pair, label }) => {
                    const md = badgeMarkdown(customBase, pair, badgeStyle, label);
                    const imgUrl = shieldsUrl(customBase, pair, badgeStyle);
                    return (
                      <div
                        key={pair}
                        className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20"
                      >
                        <div className="w-28 flex-shrink-0">
                          <img src={imgUrl} alt={`${label} badge`} className="h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <code className="text-xs text-zinc-500 font-mono break-all line-clamp-1">
                            {md}
                          </code>
                        </div>
                        <CopyButton text={md} small />
                      </div>
                    );
                  })}
                </div>

                {/* Copy all */}
                <div className="mt-4 rounded-xl border border-white/5 bg-zinc-950 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <span className="text-xs font-medium text-zinc-500">Copy all to README.md</span>
                    <CopyButton text={allMarkdown} />
                  </div>
                  <pre className="p-4 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {allMarkdown}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-xl font-bold mb-5">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: '1',
                title: 'Deploy TradeClaw',
                desc: 'Fork and deploy your own instance on Railway, Vercel, or Docker. Get your public URL.',
                color: 'emerald',
              },
              {
                step: '2',
                title: 'Generate Badges',
                desc: 'Enter your URL above to get badge markdown. Shields.io fetches live signal data from your instance.',
                color: 'purple',
              },
              {
                step: '3',
                title: 'Add to README',
                desc: 'Paste the markdown into your README. Badges update every 5 minutes with live BUY/SELL signals.',
                color: 'blue',
              },
            ].map(({ step, title, desc, color }) => (
              <div
                key={step}
                className={`p-5 rounded-xl border bg-white/[0.02] border-${color}-500/20`}
              >
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-3`}>
                  <span className={`text-sm font-bold text-${color}-400`}>{step}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Example README snippet */}
        <section>
          <h2 className="text-xl font-bold mb-2">Example README Snippet</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Here&apos;s how a full live-signal README section looks:
          </p>
          <div className="rounded-xl border border-[var(--border)] bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-white/[0.02]">
              <span className="text-xs font-mono text-zinc-500">README.md</span>
              <CopyButton text={`## 📡 Live Signal Badges\n\n${officialAllMarkdown}\n\n> Powered by [TradeClaw](https://tradeclaw.win) — open-source AI trading signals.`} />
            </div>
            <pre className="p-4 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`## 📡 Live Signal Badges

${officialAllMarkdown}

> Powered by [TradeClaw](https://tradeclaw.win) — open-source AI trading signals.`}
            </pre>
          </div>
        </section>

        {/* Share + CTA */}
        <section className="flex flex-col sm:flex-row gap-4 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Spread the Word</h2>
            <p className="text-sm text-zinc-400">
              Share that you&apos;re using TradeClaw badges — every share brings more contributors and stars.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-medium transition-all inline-flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </a>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all inline-flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </a>
          </div>
        </section>

        {/* Related links */}
        <section>
          <h2 className="text-lg font-bold mb-4">Related Tools</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { href: '/badges', label: 'All Badges', desc: 'Full badge gallery for all pairs' },
              { href: '/embed', label: 'Widget Embed', desc: 'Embeddable signal widget for websites' },
              { href: '/api-docs', label: 'API Docs', desc: 'REST API for building custom integrations' },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="p-4 rounded-xl border border-[var(--border)] hover:border-emerald-500/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
              >
                <p className="text-sm font-semibold group-hover:text-emerald-400 transition-colors mb-1">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

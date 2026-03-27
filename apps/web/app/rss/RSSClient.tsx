'use client';

import { useState } from 'react';
import { Rss, Copy, Check, ExternalLink, Zap, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import type { SignalHistoryRecord } from '../../lib/signal-history';

const BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://tradeclaw.win';

interface FeedLink {
  label: string;
  url: string;
  type: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
}

interface RSSReaderGuide {
  name: string;
  url: string;
  type: 'cloud' | 'self-hosted';
  description: string;
  supports: string[];
}

const READERS: RSSReaderGuide[] = [
  {
    name: 'Feedly',
    url: 'https://feedly.com',
    type: 'cloud',
    description: 'Most popular web-based RSS reader. Supports RSS & Atom.',
    supports: ['RSS', 'Atom'],
  },
  {
    name: 'Inoreader',
    url: 'https://www.inoreader.com',
    type: 'cloud',
    description: 'Power-user RSS reader with filters and rules.',
    supports: ['RSS', 'Atom', 'JSON Feed'],
  },
  {
    name: 'NewsBlur',
    url: 'https://newsblur.com',
    type: 'cloud',
    description: 'Open-source RSS reader. Clean interface.',
    supports: ['RSS', 'Atom'],
  },
  {
    name: 'FreshRSS',
    url: 'https://freshrss.org',
    type: 'self-hosted',
    description: 'Self-hosted RSS aggregator. Docker-ready. Full control.',
    supports: ['RSS', 'Atom', 'JSON Feed'],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={12} className="text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          Copy
        </>
      )}
    </button>
  );
}

function fmtPrice(price: number): string {
  if (!price || price === 0) return 'N/A';
  return price.toFixed(price >= 100 ? 2 : 5);
}

function SignalPreviewItem({ signal }: { signal: SignalHistoryRecord }) {
  const isBuy = signal.direction === 'BUY';
  const outcome24h = signal.outcomes['24h'];
  const date = new Date(signal.timestamp);

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <div
        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isBuy
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}
      >
        {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{signal.pair}</span>
          <span className="text-xs text-zinc-500">{signal.timeframe}</span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {signal.direction}
          </span>
          <span className="text-xs text-zinc-500">{signal.confidence}% confidence</span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
          <span>Entry: {fmtPrice(signal.entryPrice)}</span>
          {signal.tp1 && <span className="text-emerald-500">TP1: {fmtPrice(signal.tp1)}</span>}
          {signal.sl && <span className="text-red-500">SL: {fmtPrice(signal.sl)}</span>}
        </div>

        {outcome24h && (
          <div className="mt-1">
            <span
              className={`text-xs font-medium ${
                outcome24h.hit ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              24h: {outcome24h.hit ? '✅ Hit TP' : '❌ Hit SL'}{' '}
              ({outcome24h.pnlPct > 0 ? '+' : ''}
              {outcome24h.pnlPct}%)
            </span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Clock size={10} />
          <span>{date.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

interface RSSClientProps {
  recentSignals: SignalHistoryRecord[];
}

export function RSSClient({ recentSignals }: RSSClientProps) {
  const feedLinks: FeedLink[] = [
    {
      label: 'RSS 2.0',
      url: `${BASE_URL}/feed.xml`,
      type: 'application/rss+xml',
      description: 'Standard RSS feed. Works with every reader.',
      icon: <Rss size={16} className="text-orange-400" />,
      badge: 'Universal',
      badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    {
      label: 'Atom 1.0',
      url: `${BASE_URL}/atom.xml`,
      type: 'application/atom+xml',
      description: 'Atom 1.0 feed. Richer metadata and categories.',
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-blue-400"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          <path d="M2 12h20" />
        </svg>
      ),
      badge: 'Atom',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      label: 'JSON Feed 1.1',
      url: `${BASE_URL}/feed.json`,
      type: 'application/feed+json',
      description: 'Modern JSON format for programmers and new readers.',
      icon: (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-purple-400"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      badge: 'JSON',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <div className="border-b border-white/[0.06] pt-20 pb-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Rss size={20} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Live Signal Feed</h1>
              <p className="text-sm text-zinc-500">Subscribe via RSS, Atom, or JSON Feed</p>
            </div>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
            Get TradeClaw AI trading signals delivered directly to your RSS reader, monitoring
            setup, or automation workflow. No account required. Free forever.
          </p>

          {/* RSS badge */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <img
              src="https://img.shields.io/badge/RSS-Live%20Signals-orange?logo=rss&logoColor=white"
              alt="RSS Live Signals"
              height="20"
            />
            <img
              src="https://img.shields.io/badge/Atom-Feed-blue?logo=atom&logoColor=white"
              alt="Atom Feed"
              height="20"
            />
            <img
              src="https://img.shields.io/badge/JSON%20Feed-1.1-purple?logo=json&logoColor=white"
              alt="JSON Feed 1.1"
              height="20"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Feed URLs */}
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Zap size={15} className="text-emerald-400" />
            Feed URLs
          </h2>
          <div className="space-y-3">
            {feedLinks.map((feed) => (
              <div
                key={feed.url}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {feed.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{feed.label}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border font-medium ${feed.badgeColor}`}
                        >
                          {feed.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{feed.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyButton text={feed.url} />
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                  </div>
                </div>
                <div className="mt-3 px-3 py-2 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-zinc-400 break-all">
                  {feed.url}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live preview */}
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-400" />
            Latest Signals Preview
          </h2>
          {recentSignals.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No signals yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSignals.map((signal) => (
                <SignalPreviewItem key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </section>

        {/* Reader instructions */}
        <section>
          <h2 className="text-base font-semibold mb-4">RSS Reader Setup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {READERS.map((reader) => (
              <div
                key={reader.name}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{reader.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                      reader.type === 'self-hosted'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}
                  >
                    {reader.type === 'self-hosted' ? 'Self-hosted' : 'Cloud'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-3">{reader.description}</p>
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {reader.supports.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-zinc-600 space-y-1">
                  <p>1. Open {reader.name}</p>
                  <p>2. Add new feed</p>
                  <p>
                    3. Paste:{' '}
                    <code className="text-zinc-400 bg-white/5 px-1 rounded">{BASE_URL}/feed.xml</code>
                  </p>
                </div>
                <a
                  href={reader.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ExternalLink size={10} />
                  {reader.url.replace('https://', '')}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section>
          <h2 className="text-base font-semibold mb-4">Example Use Cases</h2>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
            {[
              {
                title: 'Morning briefing',
                desc: 'Check overnight signals in Feedly before the market open. No apps to switch between.',
              },
              {
                title: 'Alert fatigue reduction',
                desc: 'Use Inoreader rules to filter only BUY signals above 80% confidence — skip the noise.',
              },
              {
                title: 'Monitoring pipeline',
                desc: 'Parse the JSON feed in Python/Node to trigger your own bots or strategy automations.',
              },
              {
                title: 'Self-hosted FreshRSS',
                desc: 'Deploy FreshRSS alongside TradeClaw for a fully self-contained trading signal stack.',
              },
              {
                title: 'Zapier / Make.com',
                desc: 'Use the RSS feed as a trigger in no-code automation tools to push signals to Slack or Telegram.',
              },
            ].map((item) => (
              <div key={item.title} className="px-4 py-3">
                <span className="text-sm font-medium text-white">{item.title}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Autodiscovery note */}
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="text-sm font-semibold text-emerald-400 mb-1">
            Autodiscovery enabled
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            TradeClaw includes feed autodiscovery{' '}
            <code className="text-zinc-300 bg-white/5 px-1 rounded">
              {'<link rel="alternate">'}
            </code>{' '}
            tags in every page. Most RSS readers and browsers will detect the feeds automatically
            when you paste any TradeClaw URL.
          </p>
        </section>
      </div>
    </div>
  );
}

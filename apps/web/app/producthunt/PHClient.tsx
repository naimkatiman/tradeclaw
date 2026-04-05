/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  ExternalLink,
  Star,
  Rocket,
  MessageSquare,
  Image,
  Share2,
  CheckSquare,
  Square,
  ArrowUpRight,
  Hash,
  FileText,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const PH_URL = 'https://www.producthunt.com/posts/tradeclaw';
const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';

const TAGLINES = [
  'Open-source AI trading signals you can self-host',
  'Self-hosted trading intelligence for developers',
  'Free AI trading signals — no vendor lock-in',
];

const SHORT_DESCRIPTION =
  'TradeClaw is an open-source, self-hosted AI trading signal platform. Get real-time BUY/SELL signals for crypto, forex, and commodities. Docker Compose deploy in 60 seconds. No API keys, no paywall.';

const TOPICS = ['Developer Tools', 'Finance', 'Open Source', 'Bots', 'Productivity'];

const FIRST_COMMENT = `Hey Product Hunt! 👋

I built TradeClaw because I was tired of paying $50+/mo for trading signal services that I couldn't customize or self-host.

TradeClaw is 100% open-source and runs on your own infra with a single \`docker compose up\`. It analyzes BTC, ETH, XAU, EUR, GBP and more using EMA, RSI, MACD, Bollinger Bands, and Stochastic oscillators.

What makes it different:
- Self-hosted — your data stays yours
- Real-time signals with confidence scores
- Paper trading mode to test before risking real money
- Embeddable widgets for blogs and dashboards
- REST API + Telegram bot integration

Would love your feedback. Star us on GitHub if you find it useful!`;

const GALLERY_CAPTIONS = [
  'Real-time dashboard with live BUY/SELL signals and confidence scores',
  'Multi-timeframe analysis across BTC, ETH, XAU, EUR, GBP',
  'One-click Docker Compose deployment — self-host in 60 seconds',
  'Paper trading mode: test strategies with zero risk',
  'Embeddable signal widgets for your blog or newsletter',
  'REST API with full documentation — build your own integrations',
];

const TWEET_TEXT = `🚀 TradeClaw just launched on Product Hunt!

Open-source AI trading signals you can self-host. Free forever, no vendor lock-in.

Upvote & check it out 👇
${PH_URL}

#OpenSource #Trading #AI #ProductHunt`;

const LINKEDIN_TEXT = `Excited to share that TradeClaw just launched on Product Hunt!

TradeClaw is an open-source, self-hosted AI trading signal platform. It provides real-time BUY/SELL signals for crypto, forex, and commodities — all running on your own infrastructure.

Key features:
- Docker Compose deploy in 60 seconds
- Multi-timeframe technical analysis
- Paper trading mode
- REST API + embeddable widgets
- 100% free, no vendor lock-in

Would love your support — check it out and upvote if you find it interesting:
${PH_URL}`;

interface ChecklistItem {
  id: string;
  label: string;
}

const CHECKLIST: ChecklistItem[] = [
  { id: 'ph-tagline', label: 'Write a compelling tagline (pick from suggestions above)' },
  { id: 'ph-description', label: 'Prepare short description (250 chars max)' },
  { id: 'ph-gallery', label: 'Upload 5-6 gallery images with captions' },
  { id: 'ph-firstcomment', label: 'Draft your first comment (maker intro)' },
  { id: 'ph-social', label: 'Schedule social posts for launch day' },
  { id: 'ph-team', label: 'Notify team/community about the launch' },
  { id: 'ph-respond', label: 'Plan to respond to comments within first 2 hours' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }, [text]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-xs"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label ?? 'Copy'}
    </button>
  );
}

function CopyCard({ title, text, icon: Icon }: { title: string; text: string; icon: typeof Copy }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </div>
        <CopyButton text={text} />
      </div>
      <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PHClient() {
  // Load checklist state from localStorage
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ph-checklist');
      if (saved) {
        return JSON.parse(saved) as Record<string, boolean>;
      }
    } catch {
      /* noop */
    }
    return {};
  });

  const toggleCheck = useCallback((id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('ph-checklist', JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const checkedCount = CHECKLIST.filter((item) => checkedItems[item.id]).length;

  return (
    <main className="min-h-screen pb-24">
      <div className="pt-28 px-4 md:px-6 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(218, 85, 47, 0.15)', color: '#DA552F', borderWidth: 1, borderColor: 'rgba(218, 85, 47, 0.3)' }}>
              <Rocket className="w-3 h-3" />
              Product Hunt
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            TradeClaw on <span style={{ color: '#DA552F' }}>Product Hunt</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-xl mb-6">
            Support TradeClaw on Product Hunt. Upvote, share with your network, and help the open-source trading community grow.
          </p>

          {/* Upvote button + PH badge */}
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href={PH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: '#DA552F' }}
            >
              <ArrowUpRight className="w-4 h-4" />
              Upvote on Product Hunt
            </a>

            <a
              href={PH_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_slug=tradeclaw&theme=dark"
                alt="TradeClaw - Open source AI trading signals | Product Hunt"
                width={250}
                height={54}
                style={{ width: 250, height: 54 }}
              />
            </a>
          </div>
        </div>

        {/* Hunter Kit */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#DA552F' }} />
            Hunter Kit
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Everything you need to support the launch. Copy any section with one click.
          </p>

          {/* Taglines */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] mb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              Tagline Variants
            </h3>
            <div className="flex flex-col gap-2">
              {TAGLINES.map((tagline, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2">
                  <span className="text-xs text-[var(--foreground)]">{tagline}</span>
                  <CopyButton text={tagline} />
                </div>
              ))}
            </div>
          </div>

          {/* Short description */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] mb-4">
            <CopyCard title={`Short Description (${SHORT_DESCRIPTION.length} chars)`} text={SHORT_DESCRIPTION} icon={FileText} />
          </div>

          {/* Topics */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] mb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={{ backgroundColor: 'rgba(218, 85, 47, 0.1)', color: '#DA552F', borderColor: 'rgba(218, 85, 47, 0.25)' }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* First comment */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] mb-4">
            <CopyCard title="First Comment Template" text={FIRST_COMMENT} icon={MessageSquare} />
          </div>

          {/* Gallery captions */}
          <div className="glass rounded-2xl p-5 border border-[var(--border)] mb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              {/* eslint-disable-next-line jsx-a11y/alt-text -- lucide icon, not <img> */}
              <Image className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              Gallery Captions
            </h3>
            <div className="flex flex-col gap-2">
              {GALLERY_CAPTIONS.map((caption, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2">
                  <span className="text-xs text-[var(--foreground)]">
                    <span className="text-[var(--text-secondary)] mr-1.5">{i + 1}.</span>
                    {caption}
                  </span>
                  <CopyButton text={caption} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social Share */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Share2 className="w-4 h-4" style={{ color: '#DA552F' }} />
            Social Share
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Pre-written posts ready to copy and share on launch day.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Twitter */}
            <div className="glass rounded-2xl p-5 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  <span className="text-sm font-medium">Post on X</span>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={TWEET_TEXT} />
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-xs transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{TWEET_TEXT}</p>
            </div>

            {/* LinkedIn */}
            <div className="glass rounded-2xl p-5 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  <span className="text-sm font-medium">Post on LinkedIn</span>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={LINKEDIN_TEXT} />
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PH_URL)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{LINKEDIN_TEXT}</p>
            </div>
          </div>
        </div>

        {/* Launch Checklist */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" style={{ color: '#DA552F' }} />
            Before You Launch
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            {checkedCount}/{CHECKLIST.length} completed. Your progress is saved locally.
          </p>

          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-white/5">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${(checkedCount / CHECKLIST.length) * 100}%`,
                  backgroundColor: '#DA552F',
                }}
              />
            </div>

            <div className="p-4">
              {CHECKLIST.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  {checkedItems[item.id] ? (
                    <CheckSquare className="w-4 h-4 shrink-0" style={{ color: '#DA552F' }} />
                  ) : (
                    <Square className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                  )}
                  <span className={`text-sm ${checkedItems[item.id] ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--foreground)]'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GitHub Star CTA */}
        <div className="glass rounded-2xl p-5 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold">Star TradeClaw on GitHub</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Open-source, no paywall. A GitHub star helps others discover this project and boosts the Product Hunt launch.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold transition-colors"
            >
              <Star className="w-3 h-3" />
              Star on GitHub
            </a>
            <Link
              href="/star-history"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View star history
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

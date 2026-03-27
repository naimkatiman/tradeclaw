'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: '📡',
    title: 'Real-time Signals',
    desc: 'RSI, MACD, EMA-20/50/200, Bollinger Bands — multi-indicator confluence scoring across 12 forex, crypto & metal pairs.',
  },
  {
    emoji: '📊',
    title: 'Backtesting Engine',
    desc: 'Test strategies against historical data. Win rate, profit factor, Sharpe ratio, max drawdown — all computed client-side.',
  },
  {
    emoji: '💼',
    title: 'Paper Trading',
    desc: 'Simulate trades on live prices with a virtual portfolio. Track open P&L, equity curve, and performance stats in real time.',
  },
  {
    emoji: '🤖',
    title: 'Telegram Bot',
    desc: 'Subscribe to real-time buy/sell alerts in your Telegram chat. Filter by pair and minimum confidence — no app required.',
  },
  {
    emoji: '🔧',
    title: 'Strategy Builder',
    desc: 'Drag-and-drop visual composer for custom indicator logic. Export strategies as JSON and run instant backtests.',
  },
  {
    emoji: '🧩',
    title: 'Plugin System',
    desc: 'Write custom indicators in JavaScript — VWAP, ATR, OBV, Ichimoku. Sandboxed execution with live test runner.',
  },
];

const TAGLINES = [
  'Self-hosted AI trading signals. Free forever. Deploy in 5 min.',
  'Open-source Bloomberg terminal for indie traders.',
  'Stop renting your trading edge. Own it.',
];

const SHORT_DESC =
  'TradeClaw is a self-hosted AI trading signal platform for forex, crypto & metals. RSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. MIT licensed. Docker deploy in 5 min.';

const TOPICS = ['Open Source', 'Trading', 'Artificial Intelligence', 'Fintech', 'Developer Tools', 'Crypto', 'Self-Hosted'];

const FIRST_COMMENT = `Hey Product Hunt! 👋 I'm Naim, the maker of TradeClaw.

I built TradeClaw because I was tired of paying $50–$300/month for trading signal platforms that I couldn't audit, customize, or trust. Every "AI" signal was a black box. So I open-sourced one.

TradeClaw gives you real-time buy/sell signals for 12 forex, crypto & metal pairs — powered by RSI, MACD, EMA-20/50/200, and Bollinger Bands confluence scoring. You self-host it on your own VPS or even a Raspberry Pi. One command: \`docker compose up\`.

What you get:
• Real-time signals with multi-indicator confluence scoring
• Full backtesting engine with Sharpe ratio, win rate & drawdown metrics
• Paper trading simulator with live P&L tracking
• Telegram bot for instant buy/sell notifications
• Visual strategy builder with JSON export
• Plugin system for custom indicators

It's MIT licensed. Free forever. No accounts, no subscriptions, no black boxes.

What's next: options flow analysis, broker API integration (OANDA, Interactive Brokers), and a hosted SaaS tier for traders who don't want to self-host.

I'd love to hear your feedback — especially from fellow algo traders. What features would make you switch from your current setup? 🙏`;

const TWEETS = [
  {
    platform: 'Twitter / X',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    text: '🚀 TradeClaw just launched on @ProductHunt — self-hosted AI trading signals, free forever.\n\nRSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. MIT license. Docker deploy in 5 min.\n\nSupport the launch 👇\nhttps://www.producthunt.com/posts/tradeclaw',
  },
  {
    platform: 'LinkedIn',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    text: 'Excited to share that TradeClaw is live on Product Hunt today! 🚀\n\nTradeClaw is an open-source, self-hosted AI trading signal platform — RSI/MACD/EMA confluence scoring, backtesting, paper trading simulator, Telegram alerts, and a plugin system for custom indicators.\n\nMIT licensed. Free forever. Deploy on your own VPS in 5 minutes with Docker.\n\nIf you work in fintech, algo trading, or love open-source tools — I would really appreciate your support on PH today!\n\n👉 https://www.producthunt.com/posts/tradeclaw',
  },
  {
    platform: 'Reddit post title',
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    text: 'I built a self-hosted AI trading signal platform — open source, MIT license, Docker deploy in 5 min [TradeClaw on Product Hunt today]',
  },
];

const FAQS = [
  {
    q: 'When is the launch?',
    a: "We're targeting an imminent launch on Product Hunt. Follow TradeClaw on PH to get notified the moment we go live. Launches happen at 12:01 AM Pacific Time — that's when the PH community is most active.",
  },
  {
    q: 'Is TradeClaw really free?',
    a: 'Yes. TradeClaw is MIT licensed and fully self-hosted. You pay for your own server (a $5/month VPS works fine) — there are no subscriptions, no usage limits, and no vendor lock-in. The code is yours to audit, fork, and extend.',
  },
  {
    q: 'How can I help with the launch?',
    a: 'Three things make the biggest difference: (1) Upvote on Product Hunt when we go live, (2) share the PH link on Twitter/LinkedIn/Reddit, (3) leave a genuine review on our PH listing. GitHub stars also help — they signal traction to the PH community.',
  },
];

const CHECKLIST = [
  'README polished with badges, screenshots, and quick-start',
  'Live demo deployed at tradeclaw.win',
  'Gallery screenshots prepared (dashboard, signals, backtest, paper trading)',
  'PH listing submitted with tagline + description + topics',
  'First comment drafted and ready to post at launch',
  'Social posts scheduled for launch day blast',
  'Telegram community notified',
  'Discord announcement prepared',
];

const GALLERY_SUGGESTIONS = [
  { title: 'Dashboard — Live Signals', desc: 'Full dashboard with 12 asset signal cards, confidence badges, and live price ticker.' },
  { title: 'Signal Detail Page', desc: '/signal/XAUUSD-H1-BUY with AI analysis, indicator breakdown, key levels, and share button.' },
  { title: 'Backtesting Results', desc: 'Backtest page with price chart (EMA overlays, signal triangles), RSI/MACD panel, and performance metrics.' },
  { title: 'Paper Trading Portfolio', desc: 'Virtual portfolio with equity curve canvas, open positions P&L, and performance stats.' },
  { title: 'Strategy Builder', desc: 'Visual drag-and-drop strategy composer with indicator blocks and JSON export.' },
  { title: 'Telegram Alert Preview', desc: 'Screenshot of a TradeClaw Telegram bot message with BUY/SELL badge, price levels, and confidence.' },
];

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        copied
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── FaqItem ───────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-900/60 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-200">{q}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '300px' : '0px' }}
      >
        <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LaunchClient() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {/* ── Hero ── */}
      <section className="relative px-6 pt-28 pb-20 text-center overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-br from-emerald-500/8 via-purple-500/6 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
            <span>🚀</span>
            Product Hunt Launch
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight">
            TradeClaw is launching on{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent">
              Product Hunt
            </span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
            Self-hosted AI trading signals — free forever. RSI, MACD, EMA confluence scoring,
            backtesting, paper trading, Telegram alerts. MIT licensed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <a
              href="https://www.producthunt.com/posts/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-orange-500/20"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.604 8.4h-3.405V12h3.405c.996 0 1.801-.805 1.801-1.8S14.6 8.4 13.604 8.4zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.8V6h5.804c2.319 0 4.2 1.881 4.2 4.2s-1.881 4.2-4.2 4.2z" />
              </svg>
              Upvote on Product Hunt
            </a>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
          </div>

          {/* Official PH embed badge */}
          {/* TODO: Replace PLACEHOLDER in post_id with actual PH post numeric ID once listing is live */}
          <div className="flex justify-center">
            <a
              href="https://www.producthunt.com/posts/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=tradeclaw&theme=dark"
                alt="TradeClaw — Product Hunt"
                width={250}
                height={54}
              />
            </a>
          </div>
        </div>
      </section>

      {/* ── Feature Gallery ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">What you get</h2>
        <p className="text-zinc-500 text-sm mb-8">
          Six core features — all open source, all self-hosted, all yours.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-200"
            >
              <div className="text-2xl mb-3">{f.emoji}</div>
              <div className="text-sm font-semibold text-zinc-100 mb-2">{f.title}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Hunter Kit ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.604 8.4h-3.405V12h3.405c.996 0 1.801-.805 1.801-1.8S14.6 8.4 13.604 8.4zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.8V6h5.804c2.319 0 4.2 1.881 4.2 4.2s-1.881 4.2-4.2 4.2z" />
            </svg>
            Hunter Kit
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Everything you need to submit</h2>
          <p className="text-zinc-500 text-sm mb-8">
            Copy-paste ready assets for your PH submission. Click any copy button to grab the text.
          </p>

          {/* Taglines */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Tagline options</h3>
            <div className="space-y-3">
              {TAGLINES.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3">
                  <span className="text-sm text-zinc-300 font-mono">{t}</span>
                  <CopyButton text={t} label="Copy" />
                </div>
              ))}
            </div>
          </div>

          {/* Short description */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-300">Short description</h3>
              <span className="text-xs text-zinc-600">{SHORT_DESC.length} / 260 chars</span>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm text-zinc-400 leading-relaxed">{SHORT_DESC}</p>
                <CopyButton text={SHORT_DESC} label="Copy" />
              </div>
            </div>
          </div>

          {/* Topics */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Topics / tags</h3>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* First comment */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-300">First comment template</h3>
              <CopyButton text={FIRST_COMMENT} label="Copy comment" />
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans">{FIRST_COMMENT}</pre>
            </div>
          </div>

          {/* Gallery suggestions */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Gallery image suggestions</h3>
            <p className="text-xs text-zinc-600 mb-4">Recommended screenshots for your PH gallery. PH optimal size: 1270 × 760 px.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GALLERY_SUGGESTIONS.map((g, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-zinc-300 mb-0.5">{g.title}</div>
                    <div className="text-xs text-zinc-600 leading-relaxed">{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Sharing ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Tell your friends</h2>
        <p className="text-zinc-500 text-sm mb-8">
          Pre-written posts for launch day. Copy, paste, and share — it takes 30 seconds and makes a huge difference.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {TWEETS.map((t) => (
            <div key={t.platform} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <span className="text-zinc-500">{t.icon}</span>
                  {t.platform}
                </div>
                <CopyButton text={t.text} label="Copy" />
              </div>
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-950/60 rounded-xl p-3 max-h-40 overflow-y-auto">
                {t.text}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">FAQ</h2>
        <p className="text-zinc-500 text-sm mb-8">Common questions about the launch.</p>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ── Launch Checklist ── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-950/50 to-zinc-900 border border-emerald-500/20 rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Launch checklist</h2>
          <p className="text-zinc-500 text-sm mb-8">Everything we need in place before going live.</p>

          <ul className="space-y-3">
            {CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                <span className="shrink-0 w-5 h-5 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Back link ── */}
      <section className="px-6 pb-28 text-center">
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back to TradeClaw
        </Link>
      </section>

    </main>
  );
}

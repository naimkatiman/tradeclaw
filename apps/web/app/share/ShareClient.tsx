'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClipboardList, Circle, Bird, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';
const SITE_URL = 'https://tradeclaw.win';
const STARS_GOAL = 1000;
const STARS_FALLBACK = 1;

// Platform IDs for share tracking
const PLATFORM_IDS = [
  'github',
  'reddit-selfhosted',
  'reddit-algotrading',
  'reddit-crypto',
  'hn',
  'twitter',
  'linkedin',
  'discord',
] as const;

type PlatformId = typeof PLATFORM_IDS[number];

const SHARE_CONTENT = {
  twitterFallback: `🚀 Just open-sourced TradeClaw — self-hosted AI trading signals, MIT licensed, free forever.\n\nRSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. Docker deploy in 5 min.\n\n${REPO_URL}`,
  redditSelfhostedTitle: 'TradeClaw — open-source self-hosted AI trading signal platform (RSI/MACD/EMA, Docker, MIT)',
  hnTitle: 'Show HN: TradeClaw – Self-hosted AI trading signals (RSI/MACD/EMA, backtesting, Docker)',
};

const QUICK_SHARE_LINKS = [
  {
    platform: 'github' as PlatformId,
    color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-400/40',
    href: REPO_URL,
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 .587l3.668 7.431L24 9.306l-6 5.851 1.416 8.257L12 19.012l-7.416 4.402L6 15.157 0 9.306l8.332-1.288z" />
      </svg>
    ),
    label: 'Star on GitHub',
  },
  {
    platform: 'twitter' as PlatformId,
<<<<<<< HEAD
    color: 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
=======
    color: 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--foreground)] hover:border-zinc-500',
>>>>>>> origin/main
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_CONTENT.twitterFallback)}`,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    label: 'Tweet about it',
  },
  {
    platform: 'reddit-selfhosted' as PlatformId,
    color: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:border-orange-400/40',
    href: `https://reddit.com/submit?url=${encodeURIComponent(REPO_URL)}&title=${encodeURIComponent(SHARE_CONTENT.redditSelfhostedTitle)}`,
    icon: (
      <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    label: 'Post to Reddit',
  },
  {
    platform: 'hn' as PlatformId,
    color: 'bg-orange-600/10 border-orange-600/20 text-orange-300 hover:border-orange-500/40',
    href: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(REPO_URL)}&t=${encodeURIComponent(SHARE_CONTENT.hnTitle)}`,
    icon: (
      <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
        <path d="M0 0v24h24V0H0zm13.448 12.28l3.507-7.28h1.494l-4.259 8.648V20h-1.39v-6.352L8.551 5h1.494l3.403 7.28z" />
      </svg>
    ),
    label: 'Submit to HN',
  },
  {
    platform: 'linkedin' as PlatformId,
    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-400/40',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(REPO_URL)}`,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    label: 'Share on LinkedIn',
  },
];

const PRE_WRITTEN_POSTS: {
  id: PlatformId;
  platform: string;
  subreddit: string | null;
  icon: React.ReactNode;
  title: string | null;
  text: string;
  submitHref?: string;
}[] = [
  {
    id: 'reddit-selfhosted',
    platform: 'Reddit — r/selfhosted',
    subreddit: 'r/selfhosted',
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    title: 'TradeClaw — open-source self-hosted AI trading signal platform (RSI/MACD/EMA, Docker, MIT)',
    submitHref: `https://www.reddit.com/r/selfhosted/submit?url=${encodeURIComponent(REPO_URL)}&title=${encodeURIComponent('TradeClaw — open-source self-hosted AI trading signal platform (RSI/MACD/EMA, Docker, MIT)')}`,
    text: `Hey r/selfhosted! I built TradeClaw — a fully self-hosted, open-source AI trading signal platform. No subscriptions, no black boxes.

What it does:
• Real-time buy/sell signals for 12 forex, crypto & metal pairs
• Multi-indicator confluence scoring (RSI, MACD, EMA-20/50/200, Bollinger Bands)
• Full backtesting engine with Sharpe ratio, win rate & max drawdown
• Paper trading simulator with live P&L tracking
• Telegram bot for instant buy/sell notifications
• Visual strategy builder + custom indicator plugin system

Deploy: one command — \`docker compose up\`. Runs on a $5/month VPS or a Raspberry Pi.

MIT licensed. No accounts required. The code is yours to audit, fork, and extend.

GitHub: ${REPO_URL}
Live demo: ${SITE_URL}

Would love feedback from the self-hosting community!`,
  },
  {
    id: 'reddit-algotrading',
    platform: 'Reddit — r/algotrading',
    subreddit: 'r/algotrading',
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    title: 'I open-sourced my multi-indicator confluence signal engine — TradeClaw [self-hosted, Docker, MIT]',
    submitHref: `https://www.reddit.com/r/algotrading/submit?url=${encodeURIComponent(REPO_URL)}&title=${encodeURIComponent('I open-sourced my multi-indicator confluence signal engine — TradeClaw [self-hosted, Docker, MIT]')}`,
    text: `I got tired of paying $150+/month for signal platforms I couldn't audit, so I built TradeClaw.

Signal logic:
• Confluence scoring across RSI (14), MACD (12/26/9), EMA-20/50/200, Bollinger Bands
• Each indicator votes BUY/SELL/NEUTRAL — final signal requires majority + minimum confidence threshold (default 55%)
• 12 pairs: EURUSD, GBPUSD, USDJPY, XAUUSD, BTCUSD, ETHUSD + more
• Backtesting engine with proper metrics: Sharpe ratio, profit factor, max drawdown, win rate

Tech stack: Next.js, Redis, Node workers. Self-hosted. MIT.

Not financial advice — this is a research/learning tool.

GitHub: ${REPO_URL}

Thoughts on the signal methodology? Happy to discuss the confluence scoring approach.`,
  },
  {
    id: 'reddit-crypto',
    platform: 'Reddit — r/CryptoCurrency',
    subreddit: 'r/CryptoCurrency',
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    title: 'TradeClaw — free open-source crypto signal platform with live BTC/ETH signals, paper trading & backtesting',
    submitHref: `https://www.reddit.com/r/CryptoCurrency/submit?url=${encodeURIComponent(REPO_URL)}&title=${encodeURIComponent('TradeClaw — free open-source crypto signal platform with live BTC/ETH signals, paper trading & backtesting')}`,
    text: `Built an open-source crypto trading signal tool that generates live BUY/SELL signals for BTC, ETH, and 10 other pairs. Self-hosted, MIT license, completely free.

What makes it different:
• Live signals for BTCUSD, ETHUSD, XRPUSD, and 9 more pairs
• No black boxes — you can see exactly how each signal is generated (RSI + MACD + EMA confluence)
• Paper trading simulator so you can test strategies with zero risk
• Full backtesting engine: Sharpe ratio, win rate, max drawdown, profit factor
• Telegram bot sends alerts the moment a signal fires

Deploy it yourself in 5 minutes: \`docker compose up\`

Or check the live demo: ${SITE_URL}

MIT licensed. No subscription. You own your data.

Not financial advice — this is an open-source research and learning tool.

GitHub: ${REPO_URL}`,
  },
  {
    id: 'hn',
    platform: 'Hacker News — Show HN',
    subreddit: null,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M0 0v24h24V0H0zm13.448 12.28l3.507-7.28h1.494l-4.259 8.648V20h-1.39v-6.352L8.551 5h1.494l3.403 7.28z" />
      </svg>
    ),
    title: 'Show HN: TradeClaw – Self-hosted AI trading signals (RSI/MACD/EMA, backtesting, Docker)',
    submitHref: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(REPO_URL)}&t=${encodeURIComponent('Show HN: TradeClaw – Self-hosted AI trading signals (RSI/MACD/EMA, backtesting, Docker)')}`,
    text: `TradeClaw is an open-source, self-hosted trading signal platform built with Next.js and TypeScript.

It runs multi-indicator confluence scoring — RSI(14), MACD(12/26/9), EMA-20/50/200, and Bollinger Bands each cast a BUY/SELL/NEUTRAL vote across 12 forex, crypto, and metal pairs. A signal fires when a majority agrees and confidence clears a configurable threshold (default 55%).

The signal engine is written from scratch (no TA library black boxes). Every calculation is auditable.

Ships with:
- Backtesting engine (Sharpe ratio, max drawdown, win rate, profit factor)
- Paper trading simulator with live P&L
- Telegram alerts bot
- Visual strategy builder + custom indicator plugin system

Deploy: \`docker compose up\` on any VPS. MIT licensed.

GitHub: ${REPO_URL}

Built this because I couldn't find a signal platform where I could actually see how the signals were generated and verify the math myself.`,
  },
  {
    id: 'twitter',
    platform: 'Twitter / X — 3 tweets',
    subreddit: null,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    title: null,
    submitHref: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just open-sourced TradeClaw — self-hosted AI trading signals, MIT licensed, free forever.\n\nRSI + MACD + EMA confluence scoring. Docker deploy in 5 min.\n\n${REPO_URL}`)}`,
    text: `Tweet 1 — "Just open-sourced" angle:
Just open-sourced TradeClaw — self-hosted AI trading signals, MIT licensed, free forever.

RSI + MACD + EMA confluence scoring. Docker deploy in 5 min.

${REPO_URL}

---

Tweet 2 — Feature showcase:
TradeClaw feature breakdown:
→ 7 indicators (RSI, MACD, EMA×3, BB, Stoch)
→ 10+ assets: BTCUSD, ETHUSD, XAUUSD, EURUSD + more
→ Live signals + paper trading simulator
→ Backtesting with Sharpe ratio & drawdown
→ Telegram alerts bot
→ Docker deploy in 5 min

Free. MIT. Self-hosted. ${REPO_URL}

---

Tweet 3 — Star CTA:
We're trying to reach 1,000 GitHub stars for TradeClaw 🌟

It's a free, open-source, self-hosted trading signal platform — RSI/MACD/EMA confluence, backtesting, paper trading, Telegram alerts.

If you trade or build trading tools, a star helps a lot:
${REPO_URL}`,
  },
  {
    id: 'linkedin',
    platform: 'LinkedIn',
    subreddit: null,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    title: null,
    submitHref: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(REPO_URL)}`,
    text: `Excited to share TradeClaw — an open-source, self-hosted AI trading signal platform I've been building.

The problem: most trading signal tools are expensive black boxes ($50–$300/month) with no transparency into how signals are generated.

TradeClaw solves this by being fully open-source and self-hosted. You deploy it on your own server and can inspect, modify, and extend every line of signal logic.

Core features:
• Multi-indicator confluence scoring (RSI, MACD, EMA, Bollinger Bands)
• Backtesting engine with institutional-grade metrics
• Paper trading simulator for risk-free strategy testing
• Telegram bot for real-time trade alerts
• MIT licensed — no subscriptions, no lock-in

If you're in fintech, algo trading, or just believe traders deserve transparent tools, I'd appreciate a look and a GitHub star.

${REPO_URL}`,
  },
  {
    id: 'discord',
    platform: 'Discord',
    subreddit: null,
    icon: (
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    title: null,
    text: `Hey! Just wanted to share an open-source project I've been working on — TradeClaw.

It's a self-hosted AI trading signal platform — RSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. MIT licensed, free forever.

Deploy it yourself in 5 min: \`docker compose up\`

GitHub: ${REPO_URL}
Demo: ${SITE_URL}

Would love feedback if any of you are into trading or self-hosting!`,
  },
];

const BADGES = [
  {
    label: 'GitHub Stars',
    imgSrc: 'https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=for-the-badge&logo=github&color=gold',
    markdown: `[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=for-the-badge&logo=github&color=gold)](${REPO_URL})`,
    html: `<a href="${REPO_URL}"><img src="https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=for-the-badge&logo=github&color=gold" alt="GitHub Stars"/></a>`,
  },
  {
    label: 'MIT License',
    imgSrc: 'https://img.shields.io/badge/license-MIT-green?style=for-the-badge',
    markdown: `[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](${REPO_URL}/blob/main/LICENSE)`,
    html: `<a href="${REPO_URL}/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"/></a>`,
  },
  {
    label: 'Docker Ready',
    imgSrc: 'https://img.shields.io/badge/docker-ready-blue?style=for-the-badge&logo=docker',
    markdown: `[![Docker Ready](https://img.shields.io/badge/docker-ready-blue?style=for-the-badge&logo=docker)](${REPO_URL})`,
    html: `<a href="${REPO_URL}"><img src="https://img.shields.io/badge/docker-ready-blue?style=for-the-badge&logo=docker" alt="Docker Ready"/></a>`,
  },
  {
    label: 'Self-Hosted',
    imgSrc: 'https://img.shields.io/badge/self--hosted-%E2%9C%93-10b981?style=for-the-badge',
    markdown: `[![Self-Hosted](https://img.shields.io/badge/self--hosted-%E2%9C%93-10b981?style=for-the-badge)](${REPO_URL})`,
    html: `<a href="${REPO_URL}"><img src="https://img.shields.io/badge/self--hosted-%E2%9C%93-10b981?style=for-the-badge" alt="Self-Hosted"/></a>`,
  },
  {
    label: 'Last Commit',
    imgSrc: 'https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?style=for-the-badge&color=8b5cf6',
    markdown: `[![Last Commit](https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?style=for-the-badge&color=8b5cf6)](${REPO_URL})`,
    html: `<a href="${REPO_URL}"><img src="https://img.shields.io/github/last-commit/naimkatiman/tradeclaw?style=for-the-badge&color=8b5cf6" alt="Last Commit"/></a>`,
  },
  {
    label: 'Open Source',
    imgSrc: 'https://img.shields.io/badge/open%20source-%E2%9D%A4-ff69b4?style=for-the-badge',
    markdown: `[![Open Source](https://img.shields.io/badge/open%20source-%E2%9D%A4-ff69b4?style=for-the-badge)](${REPO_URL})`,
    html: `<a href="${REPO_URL}"><img src="https://img.shields.io/badge/open%20source-%E2%9D%A4-ff69b4?style=for-the-badge" alt="Open Source"/></a>`,
  },
];

const TIMING_TIPS: { platform: string; icon: LucideIcon; bestTime: string; tip: string }[] = [
  {
    platform: 'Reddit',
    icon: ClipboardList,
    bestTime: 'Mon–Fri, 9am–12pm EST',
    tip: 'Post on weekday mornings. r/selfhosted and r/algotrading peak mid-morning US time. Avoid weekends.',
  },
  {
    platform: 'Hacker News',
    icon: Circle,
    bestTime: 'Mon–Fri, 8am–10am EST',
    tip: 'Show HN posts perform best early weekday mornings (US East Coast). Avoid Fridays and weekends.',
  },
  {
    platform: 'Twitter / X',
    icon: Bird,
    bestTime: 'Tue–Thu, 9am or 5pm EST',
    tip: 'Engagement peaks at commute hours. Use the thread format — split content across 3 tweets for higher reach.',
  },
  {
    platform: 'LinkedIn',
    icon: Briefcase,
    bestTime: 'Tue–Thu, 8am–10am EST',
    tip: 'Professional network is most active Tuesday–Thursday mornings. Lead with the problem you solved, not the solution.',
  },
];

const STORAGE_KEY = 'tradeclaw-shared-platforms';

// ── CopyButton ─────────────────────────────────────────────────────────────────

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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0 ${
        copied
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
<<<<<<< HEAD
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600'
=======
          : 'bg-[var(--bg-card)] hover:bg-zinc-700 text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-zinc-600'
>>>>>>> origin/main
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

// ── CopyLinkButton ─────────────────────────────────────────────────────────────

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(REPO_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 border ${
        copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
<<<<<<< HEAD
          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
=======
          : 'bg-zinc-900 border-[var(--border)] text-[var(--foreground)] hover:border-zinc-500'
>>>>>>> origin/main
      }`}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ShareClient() {
  const [stars, setStars] = useState(STARS_FALLBACK);
  const [shared, setShared] = useState<Partial<Record<PlatformId, boolean>>>({});

  // Load share tracking from localStorage
  useEffect(() => {
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setShared(JSON.parse(stored));
      } catch {
        // ignore
      }
    }, 0);
  }, []);

  // Fetch live GitHub star count
  useEffect(() => {
    fetch('https://api.github.com/repos/naimkatiman/tradeclaw')
      .then(r => r.json())
      .then((data: { stargazers_count?: number }) => {
        if (typeof data.stargazers_count === 'number') {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        // fall back to static value
      });
  }, []);

  function toggleShared(id: PlatformId) {
    setShared(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const sharedCount = PLATFORM_IDS.filter(id => shared[id]).length;
  const starsPercent = (stars / STARS_GOAL) * 100;
  const sharePercent = (sharedCount / PLATFORM_IDS.length) * 100;

  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-zinc-950 text-white">
=======
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
>>>>>>> origin/main

      {/* ── Hero ── */}
      <section className="relative px-6 pt-28 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-br from-emerald-500/8 via-amber-500/5 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-amber-600/4 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .587l3.668 7.431L24 9.306l-6 5.851 1.416 8.257L12 19.012l-7.416 4.402L6 15.157 0 9.306l8.332-1.288z" />
            </svg>
            Community Growth
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Help us reach{' '}
            <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              1,000 GitHub Stars
            </span>
          </h1>

<<<<<<< HEAD
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10">
=======
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto mb-10">
>>>>>>> origin/main
            Every star, share, and post helps independent traders discover a free alternative
            to expensive signal platforms. Takes 10 seconds. Makes a real difference.
          </p>

          {/* GitHub stars progress bar */}
          <div className="mb-6 px-4">
<<<<<<< HEAD
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span className="text-emerald-400 font-medium">{stars.toLocaleString()} stars</span>
              <span>Goal: {STARS_GOAL.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
=======
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
              <span className="text-emerald-400 font-medium">{stars.toLocaleString()} stars</span>
              <span>Goal: {STARS_GOAL.toLocaleString()}</span>
            </div>
            <div className="w-full bg-[var(--bg-card)] rounded-full h-3 overflow-hidden">
>>>>>>> origin/main
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(starsPercent, 0.3)}%` }}
              />
            </div>
<<<<<<< HEAD
            <p className="text-xs text-zinc-600 mt-2 text-center">
=======
            <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
>>>>>>> origin/main
              {(STARS_GOAL - stars).toLocaleString()} more stars to reach our goal
            </p>
          </div>

          {/* Share progress */}
          {sharedCount > 0 && (
            <div className="mb-8 px-4 py-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-emerald-400 font-semibold">
                  You&apos;ve shared to {sharedCount}/{PLATFORM_IDS.length} platforms
                </span>
                {sharedCount === PLATFORM_IDS.length && (
                  <span className="text-emerald-300 font-bold">Complete!</span>
                )}
              </div>
<<<<<<< HEAD
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
=======
              <div className="w-full bg-[var(--bg-card)] rounded-full h-2 overflow-hidden">
>>>>>>> origin/main
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${sharePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-sm font-bold transition-all duration-200 shadow-lg shadow-amber-500/20"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .587l3.668 7.431L24 9.306l-6 5.851 1.416 8.257L12 19.012l-7.416 4.402L6 15.157 0 9.306l8.332-1.288z" />
            </svg>
            Star on GitHub — it&#39;s free!
          </a>
        </div>
      </section>

      {/* ── Share Progress Tracker ── */}
      <section className="px-6 pb-16 max-w-3xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
<<<<<<< HEAD
              <h2 className="text-base font-semibold text-zinc-100">Your sharing progress</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Check off each platform after you share</p>
            </div>
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">
              {sharedCount}<span className="text-zinc-600 text-lg">/{PLATFORM_IDS.length}</span>
=======
              <h2 className="text-base font-semibold text-[var(--foreground)]">Your sharing progress</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Check off each platform after you share</p>
            </div>
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">
              {sharedCount}<span className="text-[var(--text-secondary)] text-lg">/{PLATFORM_IDS.length}</span>
>>>>>>> origin/main
            </span>
          </div>

          {/* Progress bar */}
<<<<<<< HEAD
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-5 overflow-hidden">
=======
          <div className="w-full bg-[var(--bg-card)] rounded-full h-2 mb-5 overflow-hidden">
>>>>>>> origin/main
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${sharePercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORM_IDS.map(id => {
              const post = PRE_WRITTEN_POSTS.find(p => p.id === id);
              const quickLink = QUICK_SHARE_LINKS.find(l => l.platform === id);
              const label = post?.platform ?? quickLink?.label ?? id;
              const isChecked = !!shared[id];
              return (
                <button
                  key={id}
                  onClick={() => toggleShared(id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 text-left ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
<<<<<<< HEAD
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
=======
                      : 'bg-[var(--bg-card)]/50 border-[var(--border)]/50 text-[var(--text-secondary)] hover:border-zinc-600 hover:text-[var(--text-secondary)]'
>>>>>>> origin/main
                  }`}
                >
                  <span className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                  }`}>
                    {isChecked && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{label.replace('Reddit — ', '').replace(' — Show HN', '').replace(' — 3 tweets', '')}</span>
                </button>
              );
            })}
          </div>

          {sharedCount === PLATFORM_IDS.length && (
            <div className="mt-4 text-center text-sm text-emerald-400 font-medium">
              You&apos;re a TradeClaw ambassador! Thank you for spreading the word.
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Share Buttons ── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
<<<<<<< HEAD
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Quick share</h2>
        <p className="text-zinc-500 text-sm mb-8">
=======
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Quick share</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
>>>>>>> origin/main
          One click to share on any platform. Pre-filled content — just review and post.
        </p>

        <div className="flex flex-wrap gap-3">
          {QUICK_SHARE_LINKS.map((link) => (
            <a
              key={link.platform}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleShared(link.platform)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 border ${link.color}`}
            >
              {link.icon}
              {link.label}
              {shared[link.platform] && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </a>
          ))}
          <CopyLinkButton />
        </div>
      </section>

      {/* ── Pre-written Posts ── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
<<<<<<< HEAD
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Pre-written posts</h2>
        <p className="text-zinc-500 text-sm mb-8">
=======
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Pre-written posts</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
>>>>>>> origin/main
          Copy-paste ready content for every platform. Customise as you like — or post as-is.
        </p>

        <div className="space-y-4">
          {PRE_WRITTEN_POSTS.map((post) => (
            <div key={post.id} className={`bg-zinc-900 border rounded-2xl p-5 transition-colors ${
              shared[post.id] ? 'border-emerald-500/25' : 'border-zinc-800'
            }`}>
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
<<<<<<< HEAD
                  <span className="text-zinc-500 shrink-0">{post.icon}</span>
                  <span className="text-sm font-medium text-zinc-300 truncate">{post.platform}</span>
                  {post.subreddit && (
                    <span className="shrink-0 text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
=======
                  <span className="text-[var(--text-secondary)] shrink-0">{post.icon}</span>
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">{post.platform}</span>
                  {post.subreddit && (
                    <span className="shrink-0 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] px-2 py-0.5 rounded-full">
>>>>>>> origin/main
                      {post.subreddit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CopyButton text={post.title ? `${post.title}\n\n${post.text}` : post.text} label="Copy" />
                  {post.submitHref && (
                    <a
                      href={post.submitHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => toggleShared(post.id)}
<<<<<<< HEAD
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-all duration-200"
=======
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-zinc-700 text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-zinc-600 transition-all duration-200"
>>>>>>> origin/main
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Post
                    </a>
                  )}
                </div>
              </div>
              {post.title && (
<<<<<<< HEAD
                <p className="text-xs font-semibold text-zinc-400 mb-2 px-3 py-2 bg-zinc-950/60 rounded-lg border border-zinc-800">
                  Title: {post.title}
                </p>
              )}
              <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-950/60 rounded-xl p-3 max-h-48 overflow-y-auto border border-zinc-800/50">
=======
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 px-3 py-2 bg-[var(--background)]/60 rounded-lg border border-zinc-800">
                  Title: {post.title}
                </p>
              )}
              <pre className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans bg-[var(--background)]/60 rounded-xl p-3 max-h-48 overflow-y-auto border border-zinc-800/50">
>>>>>>> origin/main
                {post.text}
              </pre>

              {/* "I shared this!" checkbox */}
              <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                <button
                  onClick={() => toggleShared(post.id)}
                  className={`flex items-center gap-2 text-xs font-medium transition-all duration-200 ${
<<<<<<< HEAD
                    shared[post.id] ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    shared[post.id] ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
=======
                    shared[post.id] ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    shared[post.id] ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border)]'
>>>>>>> origin/main
                  }`}>
                    {shared[post.id] && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {shared[post.id] ? 'Shared!' : 'Mark as shared'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Embed Badge Wall ── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
<<<<<<< HEAD
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Embed badges</h2>
        <p className="text-zinc-500 text-sm mb-8">
=======
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Embed badges</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
>>>>>>> origin/main
          Add TradeClaw badges to your blog, README, or website. Click to copy Markdown or HTML.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BADGES.map((badge) => (
<<<<<<< HEAD
            <div key={badge.label} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-400">{badge.label}</span>
=======
            <div key={badge.label} className="bg-zinc-900 border border-zinc-800 hover:border-[var(--border)] rounded-2xl p-5 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{badge.label}</span>
>>>>>>> origin/main
              </div>

              {/* Badge preview */}
              <div className="flex mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge.imgSrc} alt={badge.label} height={28} className="h-7" />
              </div>

              {/* Copy buttons */}
              <div className="flex gap-2">
                <CopyButton text={badge.markdown} label="Markdown" />
                <CopyButton text={badge.html} label="HTML" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timing Tips ── */}
      <section className="px-6 pb-28 max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-950/50 to-zinc-900 border border-emerald-500/20 rounded-3xl p-8">
<<<<<<< HEAD
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Every share matters</h2>
          <p className="text-zinc-500 text-sm mb-8">
=======
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Every share matters</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
>>>>>>> origin/main
            Open-source projects live and die by word of mouth. A single well-timed Reddit post can bring hundreds of new users.
            Here&#39;s when each platform is most receptive.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TIMING_TIPS.map((tip) => (
              <div key={tip.platform} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <tip.icon className="w-5 h-5 text-emerald-400" />
<<<<<<< HEAD
                  <span className="text-sm font-semibold text-zinc-300">{tip.platform}</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium mb-1.5">{tip.bestTime}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{tip.tip}</p>
=======
                  <span className="text-sm font-semibold text-[var(--foreground)]">{tip.platform}</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium mb-1.5">{tip.bestTime}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tip.tip}</p>
>>>>>>> origin/main
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
<<<<<<< HEAD
              <p className="text-sm font-medium text-zinc-300">Ready to spread the word?</p>
              <p className="text-xs text-zinc-600 mt-0.5">Star it first — then share it.</p>
=======
              <p className="text-sm font-medium text-[var(--foreground)]">Ready to spread the word?</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Star it first — then share it.</p>
>>>>>>> origin/main
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:border-emerald-400/40 transition-colors"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .587l3.668 7.431L24 9.306l-6 5.851 1.416 8.257L12 19.012l-7.416 4.402L6 15.157 0 9.306l8.332-1.288z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Back link ── */}
      <section className="px-6 pb-16 text-center">
<<<<<<< HEAD
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
=======
        <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors">
>>>>>>> origin/main
          ← Back to TradeClaw
        </Link>
      </section>

    </main>
  );
}

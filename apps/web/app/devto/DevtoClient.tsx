'use client';

import { useEffect, useState } from 'react';

const ARTICLE_URL =
  'https://dev.to/naimkatiman/i-built-an-open-source-ai-trading-signal-platform-heres-what-i-learned-51dm';

const ARTICLE_TITLE =
  'I built an open-source AI trading signal platform — here\u0027s what I learned';

const ARTICLE_PREVIEW =
  'Every time I wanted to trade forex or crypto, I had the same friction: open TradingView, look at RSI, look at MACD, look at EMA, try to decide if they agree, second-guess myself. The tools exist. The data exists. The math is solved. But nobody had packaged it as "here\u0027s the decision, not just the numbers." So I built TradeClaw — a self-hosted AI trading signal platform. Point it at a symbol, and it returns a decision with confidence, entry, stop-loss, and take-profit levels. Not RSI=68. Not "MACD is crossing above signal line." A decision.';

interface DevtoStats {
  reactions: number;
  comments: number;
  reads: number;
  url: string;
  title: string;
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
      <span className="text-3xl mb-2 block">{icon}</span>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

export function DevtoClient() {
  const [stats, setStats] = useState<DevtoStats | null>(null);

  useEffect(() => {
    fetch('/api/devto-stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    'Check out this deep-dive on building an open-source AI trading signal platform 🔥'
  )}&url=${encodeURIComponent(ARTICLE_URL)}`;

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    ARTICLE_URL
  )}`;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          {/* DEV badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black border border-white/20 mb-8">
            <span className="text-white font-black text-2xl tracking-tight">DEV</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            {ARTICLE_TITLE}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            A deep-dive article on building TradeClaw — the open-source AI trading signal platform. Published on Dev.to.
          </p>

          <a
            href={ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Read on Dev.to
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Article Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon="❤️"
            label="Reactions"
            value={stats?.reactions ?? '—'}
          />
          <StatCard
            icon="💬"
            label="Comments"
            value={stats?.comments ?? '—'}
          />
          <StatCard
            icon="👁️"
            label="Reads"
            value={stats?.reads ?? '—'}
          />
        </div>
      </section>

      {/* Article Preview */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Preview</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
            {ARTICLE_PREVIEW}
          </p>
          <a
            href={ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
          >
            Continue reading on Dev.to &rarr;
          </a>
        </div>
      </section>

      {/* Share */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Share</h2>
        <div className="flex justify-center gap-4">
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border)] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </a>
          <a
            href={linkedinShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border)] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Share on LinkedIn
          </a>
        </div>
      </section>

      {/* GitHub CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-32 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-[var(--text-secondary)] mb-4">
            Star the repo to support open-source trading tools.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border)] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}

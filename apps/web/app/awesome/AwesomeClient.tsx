'use client';

import { useState } from 'react';

type SubmissionStatus = 'Listed' | 'Review required';

interface AwesomeSubmission {
  name: string;
  repoUrl: string;
  category: string;
  description: string;
  status: SubmissionStatus;
  lastChecked: string;
  copyText?: string;
  copyLabel?: string;
}

const SUBMISSIONS: AwesomeSubmission[] = [
  {
    name: 'awesome-quant',
    repoUrl: 'https://github.com/wilsonfreitas/awesome-quant',
    category: 'Trading & Backtesting',
    description:
      'TradeClaw appears in the upstream README. This correction draft narrows the description to behavior visible in the current repository.',
    status: 'Listed',
    lastChecked: '2026-07-15',
    copyText:
      '* [TradeClaw](https://github.com/naimkatiman/tradeclaw) - `Node.js` `TypeScript` - Self-hostable market-analysis application that derives technical signals from observed OHLCV when available and includes modeled historical backtests with explicit cost and exit assumptions. Deployable with Docker Compose.',
    copyLabel: 'Copy correction draft',
  },
  {
    name: 'awesome-selfhosted',
    repoUrl: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
    category: 'External self-hosted catalog',
    description:
      'No TradeClaw entry was found in the checked upstream README. Eligibility, category, and the current contribution process still need upstream review, so no submission draft is offered.',
    status: 'Review required',
    lastChecked: '2026-07-15',
  },
  {
    name: 'awesome-nodejs',
    repoUrl: 'https://github.com/sindresorhus/awesome-nodejs',
    category: 'Node.js packages and resources',
    description:
      'The upstream guide focuses broadly useful packages, applies age and star thresholds, and may pause submissions. TradeClaw is a full application; fit must be established before drafting a proposal.',
    status: 'Review required',
    lastChecked: '2026-07-15',
  },
];

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  Listed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  'Review required': 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
};

const REPOSITORY_FACTS = [
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Documented self-host path',
    desc: 'Docker Compose defines the app, PostgreSQL, Redis, migrations, and WebSocket services. Required secrets must be configured and images built.',
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: 'Observed-data analysis',
    desc: 'The public signal list excludes synthetic candles. Analytical output depends on available observed OHLCV and carries source and data-quality metadata.',
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Backtesting engine',
    desc: 'Historical candle simulations report modeled metrics whose meaning depends on the selected strategy, costs, sizing, and exit assumptions.',
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.06 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z" />
      </svg>
    ),
    title: 'Optional delivery paths',
    desc: 'Telegram, Discord, email, push, and SMS code paths require provider credentials and scheduled jobs. Availability is deployment-specific.',
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: 'Inspectable interfaces',
    desc: 'Repository routes expose signal, methodology, and health data. Individual integrations must be checked for implementation and configuration status.',
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'MIT open source',
    desc: 'The repository declares the MIT license and includes the application source, deployment files, and test suite.',
  },
];

function CopyButton({ text, label }: { text: string; label: string }) {
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
          : 'bg-[var(--glass-bg)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--glass-border-accent)]'
      }`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export function AwesomeClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero */}
      <section className="relative px-6 pt-28 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Open Source Recognition
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Review TradeClaw{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              listing candidates
            </span>
          </h1>

          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto mb-10">
            This is a dated manual review of external repositories, not an assurance that TradeClaw is eligible,
            submitted, or accepted. Check each upstream contribution guide before using a draft.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <a
              href="https://github.com/wilsonfreitas/awesome-quant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--border)] text-[var(--foreground)] text-sm font-medium transition-colors border border-[var(--border)]"
            >
              View verified listing
            </a>
          </div>
        </div>
      </section>

      {/* Submission Status Cards */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">External Review</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
          Status reflects an upstream README check on the date shown. A copyable correction is provided only for the
          verified listing; unverified candidates intentionally have no submission draft.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUBMISSIONS.map((sub) => (
            <div
              key={sub.name}
              className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <a
                    href={sub.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm font-semibold text-[var(--foreground)] hover:text-emerald-400 transition-colors"
                  >
                    {sub.name}
                  </a>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sub.category}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">Checked {sub.lastChecked}</div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
                  {sub.status}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">{sub.description}</p>

              {sub.copyText && sub.copyLabel ? (
                <div className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Correction draft</span>
                    <CopyButton text={sub.copyText} label={sub.copyLabel} />
                  </div>
                  <code className="text-xs text-[var(--text-secondary)] leading-relaxed break-all">{sub.copyText}</code>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-3 text-xs text-amber-200">
                  No copyable entry until upstream fit and contribution rules are verified.
                </div>
              )}

              <a
                href={sub.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-emerald-500 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View upstream repository
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Repository-observed facts */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Repository-observed facts</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            These statements describe checked implementation boundaries. They do not establish eligibility for any
            external list and do not imply live trading performance.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPOSITORY_FACTS.map((item) => (
              <div
                key={item.title}
                className="flex gap-3 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)]"
              >
                <div className="shrink-0 text-emerald-400 mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)] mb-1">{item.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28 max-w-5xl mx-auto">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">Review before proposing</h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-lg mx-auto mb-8">
            Search the upstream list, read its current contribution guide, confirm eligibility and category fit, and
            keep descriptions limited to repository-supported behavior. Do not solicit votes or comments unless the
            upstream maintainers permit it.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/wilsonfreitas/awesome-quant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
            >
              Review current listing
            </a>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--border)] text-[var(--foreground)] text-sm font-medium transition-colors border border-[var(--border)]"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star TradeClaw
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

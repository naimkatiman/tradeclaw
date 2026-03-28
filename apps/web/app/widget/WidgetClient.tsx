'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'https://tradeclaw.win';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-[var(--text-secondary)] hover:text-white font-mono"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold">
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="text-[11px] bg-black/40 border border-white/5 rounded p-2 overflow-x-auto text-emerald-300 font-mono whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

function WidgetCard({
  title,
  description,
  previewUrl,
  previewWidth,
  previewHeight,
  snippets,
  cacheBust,
}: {
  title: string;
  description: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  snippets: { label: string; code: string }[];
  cacheBust: number;
}) {
  return (
    <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
      </div>

      {/* Live preview */}
      <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-4 flex items-center justify-center">
        <img
          src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_=${cacheBust}`}
          alt={title}
          width={previewWidth}
          height={previewHeight}
          className="max-w-full"
          loading="lazy"
        />
      </div>

      {/* Snippets */}
      <div className="space-y-3">
        {snippets.map((s) => (
          <CodeBlock key={s.label} label={s.label} code={s.code} />
        ))}
      </div>
    </div>
  );
}

export function WidgetClient() {
  const [cacheBust, setCacheBust] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCacheBust(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = useCallback(() => setCacheBust(Date.now()), []);

  const badgeUrl = `${BASE_URL}/api/widget/portfolio`;
  const cardUrl = `${BASE_URL}/api/widget/portfolio/card`;

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Embeddable Widgets
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Show your P&amp;L{' '}
            <span className="text-emerald-400">everywhere</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-relaxed">
            Dynamic SVG widgets that display your live paper trading performance.
            Embed them in GitHub READMEs, blogs, portfolios, or any website. No API key required.
          </p>

          {/* Live previews */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <img
              src={`/api/widget/portfolio?_=${cacheBust}`}
              alt="Portfolio badge"
              height={20}
              className="h-5"
            />
            <img
              src={`/api/widget/portfolio/card?_=${cacheBust}`}
              alt="Portfolio card"
              width={400}
              height={120}
              className="max-w-full"
            />
            <p className="text-[10px] text-[var(--text-secondary)]">
              Live — refreshes every 5 minutes
            </p>
          </div>
        </div>

        {/* Refresh */}
        <div className="flex items-center justify-end">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh widgets
          </button>
        </div>

        {/* Widget gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WidgetCard
            title="Portfolio Badge"
            description="Shields.io-compatible flat badge showing balance, return %, and win rate."
            previewUrl="/api/widget/portfolio"
            previewWidth={300}
            previewHeight={20}
            cacheBust={cacheBust}
            snippets={[
              {
                label: 'Markdown',
                code: `[![TradeClaw Portfolio](${badgeUrl})](${BASE_URL}/paper-trading)`,
              },
              {
                label: 'HTML',
                code: `<a href="${BASE_URL}/paper-trading"><img src="${badgeUrl}" alt="TradeClaw Portfolio" /></a>`,
              },
              { label: 'Direct URL', code: badgeUrl },
            ]}
          />

          <WidgetCard
            title="Portfolio Card"
            description="Rich 400x120 card with balance, return, win rate, trade count, and P&L sparkline."
            previewUrl="/api/widget/portfolio/card"
            previewWidth={400}
            previewHeight={120}
            cacheBust={cacheBust}
            snippets={[
              {
                label: 'Markdown',
                code: `[![TradeClaw Portfolio](${cardUrl})](${BASE_URL}/paper-trading)`,
              },
              {
                label: 'HTML',
                code: `<a href="${BASE_URL}/paper-trading"><img src="${cardUrl}" alt="TradeClaw Portfolio Card" width="400" /></a>`,
              },
              { label: 'Direct URL', code: cardUrl },
            ]}
          />
        </div>

        {/* Share section */}
        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold">Share your performance</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Add both widgets to your GitHub profile README to showcase your trading results:
          </p>
          <CodeBlock
            label="Markdown — paste into your README.md"
            code={[
              `## My Trading Performance`,
              ``,
              `[![TradeClaw Portfolio](${badgeUrl})](${BASE_URL}/paper-trading)`,
              ``,
              `[![TradeClaw Portfolio Card](${cardUrl})](${BASE_URL}/paper-trading)`,
            ].join('\n')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm text-[var(--text-secondary)]">
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Badge endpoint</p>
              <code className="text-xs font-mono text-emerald-400">
                /api/widget/portfolio
              </code>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Card endpoint</p>
              <code className="text-xs font-mono text-emerald-400">
                /api/widget/portfolio/card
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Widgets update every 5 minutes · Data from paper trading engine ·{' '}
          <a href="/paper-trading" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Start paper trading →
          </a>
        </p>
      </div>
    </main>
  );
}

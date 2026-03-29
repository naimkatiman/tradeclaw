'use client';

import { useState, useEffect, useCallback } from 'react';

const PAIRS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', short: 'BTC' },
  { symbol: 'ETHUSD', name: 'Ethereum', short: 'ETH' },
  { symbol: 'XAUUSD', name: 'Gold', short: 'XAU' },
  { symbol: 'XRPUSD', name: 'XRP', short: 'XRP' },
  { symbol: 'EURUSD', name: 'EUR/USD', short: 'EUR/USD' },
  { symbol: 'GBPUSD', name: 'GBP/USD', short: 'GBP/USD' },
  { symbol: 'USDJPY', name: 'USD/JPY', short: 'USD/JPY' },
  { symbol: 'AUDUSD', name: 'AUD/USD', short: 'AUD/USD' },
  { symbol: 'USDCAD', name: 'USD/CAD', short: 'USD/CAD' },
  { symbol: 'XAGUSD', name: 'Silver', short: 'XAG' },
];

const TIMEFRAMES = ['H1', 'H4', 'D1'];
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

function BadgeCard({
  symbol,
  name,
  timeframe,
  cacheBust,
}: {
  symbol: string;
  name: string;
  timeframe: string;
  cacheBust: number;
}) {
  const badgeUrl = `${BASE_URL}/api/badge/${symbol}?tf=${timeframe}`;
  const badgeUrlWithCacheBust = `/api/badge/${symbol}?tf=${timeframe}&_=${cacheBust}`;
  const linkUrl = `${BASE_URL}`;

  const markdownSnippet = `[![${name} Signal](${badgeUrl})](${linkUrl})`;
  const htmlSnippet = `<a href="${linkUrl}"><img src="${badgeUrl}" alt="${name} Signal" /></a>`;
  const directUrl = badgeUrl;

  return (
    <div className="border border-white/10 rounded-xl p-4 space-y-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{name}</h3>
          <span className="text-xs text-[var(--text-secondary)] font-mono">{symbol}</span>
        </div>
        {/* Live preview */}
<<<<<<< HEAD
=======
        {/* eslint-disable-next-line @next/next/no-img-element */}
>>>>>>> origin/main
        <img
          src={badgeUrlWithCacheBust}
          alt={`${name} signal badge`}
          height={20}
          className="h-5"
          loading="lazy"
        />
      </div>

      {/* GitHub README dark bg preview */}
      <div className="rounded-lg bg-[#0d1117] border border-[#30363d] px-4 py-3 flex items-center gap-3">
        <span className="text-xs text-[#8b949e] font-mono">README.md</span>
<<<<<<< HEAD
=======
        {/* eslint-disable-next-line @next/next/no-img-element */}
>>>>>>> origin/main
        <img
          src={badgeUrlWithCacheBust}
          alt={`${name} signal`}
          height={20}
          className="h-5"
          loading="lazy"
        />
      </div>

      {/* Snippets */}
      <div className="space-y-3">
        <CodeBlock label="Markdown" code={markdownSnippet} />
        <CodeBlock label="HTML" code={htmlSnippet} />
        <CodeBlock label="Direct URL" code={directUrl} />
      </div>
    </div>
  );
}

export function BadgeClient() {
  const [timeframe, setTimeframe] = useState('H1');
  const [cacheBust, setCacheBust] = useState(() => Date.now());

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => setCacheBust(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = useCallback(() => setCacheBust(Date.now()), []);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Signal Badges
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Embed TradeClaw badges in{' '}
            <span className="text-emerald-400">your README</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-relaxed">
            Dynamic SVG badges that show live trading signals — updated every 5 minutes.
            Drop them into any GitHub README, documentation, or website. No API key required.
          </p>

          {/* Live example */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex flex-wrap justify-center gap-2">
              {['BTCUSD', 'ETHUSD', 'XAUUSD'].map(sym => (
<<<<<<< HEAD
=======
                // eslint-disable-next-line @next/next/no-img-element
>>>>>>> origin/main
                <img
                  key={sym}
                  src={`/api/badge/${sym}?tf=${timeframe}&_=${cacheBust}`}
                  alt={`${sym} signal`}
                  height={20}
                  className="h-5"
                />
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              Live — refreshes every 5 minutes
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Timeframe</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-emerald-500 text-white'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh badges
          </button>
        </div>

        {/* Badge gallery */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All pairs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAIRS.map(pair => (
              <BadgeCard
                key={pair.symbol}
                symbol={pair.symbol}
                name={pair.name}
                timeframe={timeframe}
                cacheBust={cacheBust}
              />
            ))}
          </div>
        </div>

        {/* Quick start */}
        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold">Quick start</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Add BTC + ETH + Gold badges to your README in one line:
          </p>
          <CodeBlock
            label="Markdown — paste into your README.md"
            code={[
              `[![BTC Signal](${BASE_URL}/api/badge/BTCUSD)](${BASE_URL})`,
              `[![ETH Signal](${BASE_URL}/api/badge/ETHUSD)](${BASE_URL})`,
              `[![Gold Signal](${BASE_URL}/api/badge/XAUUSD)](${BASE_URL})`,
            ].join('\n')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm text-[var(--text-secondary)]">
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Badge URL format</p>
              <code className="text-xs font-mono text-emerald-400">
                {BASE_URL}/api/badge/&#123;PAIR&#125;?tf=&#123;TF&#125;
              </code>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Supported timeframes</p>
              <div className="flex gap-2">
                {TIMEFRAMES.map(tf => (
                  <span key={tf} className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)]">
                    {tf}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Badges update every 5 minutes · Powered by real TA (RSI, MACD, EMA, Bollinger Bands) ·{' '}
          <a href="/api-docs" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Full API docs →
          </a>
        </p>
      </div>
    </main>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Code, Copy, Check, Sun, Moon, ExternalLink, Star } from 'lucide-react';

const BASE_URL = 'https://tradeclaw.win';

type Theme = 'dark' | 'light';
type SizePreset = 'compact' | 'standard' | 'large';

const SIZES: Record<SizePreset, { w: number; h: number; label: string }> = {
  compact: { w: 280, h: 160, label: 'Compact' },
  standard: { w: 320, h: 200, label: 'Standard' },
  large: { w: 400, h: 280, label: 'Large' },
};

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
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-[var(--text-secondary)] hover:text-white font-mono"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeSnippet({ code, label }: { code: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Code className="w-3 h-3" />
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="text-[11px] bg-black/40 border border-white/5 rounded-lg p-3 overflow-x-auto text-emerald-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export function WidgetClient() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [size, setSize] = useState<SizePreset>('standard');

  const { w, h } = SIZES[size];
  const embedUrl = `${BASE_URL}/api/widget/portfolio/embed?theme=${theme}`;
  const badgeUrl = `${BASE_URL}/api/widget/portfolio/badge`;

  const iframeCode = `<iframe src="${embedUrl}" width="${w}" height="${h}" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`;
  const badgeMarkdown = `[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=${encodeURIComponent(badgeUrl)}&style=for-the-badge)](${BASE_URL}/paper-trading)`;

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Embeddable Widget
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Embed Your Portfolio{' '}
            <span className="text-emerald-400">Anywhere</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-relaxed">
            Show live P&amp;L from your paper trading on any website, blog, or README.
            Auto-refreshing every 30 seconds. No API key required.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Theme toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-white/15 text-white'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white/15 text-white'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
          </div>

          {/* Size presets */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(Object.entries(SIZES) as [SizePreset, (typeof SIZES)[SizePreset]][]).map(
              ([key, { label, w: pw, h: ph }]) => (
                <button
                  key={key}
                  onClick={() => setSize(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    size === key
                      ? 'bg-white/15 text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {label}
                  <span className="ml-1 text-[10px] opacity-60">
                    {pw}x{ph}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[#0d1117] border border-[#30363d] p-6 inline-block">
            <iframe
              src={`/api/widget/portfolio/embed?theme=${theme}`}
              width={w}
              height={h}
              style={{ border: 'none', borderRadius: 12, overflow: 'hidden' }}
              title="TradeClaw Portfolio Widget"
            />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live preview — auto-refreshes every 30s
          </p>
        </div>

        {/* Code snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Iframe Embed
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Paste into any HTML page, blog, or Notion embed block.
              </p>
            </div>
            <CodeSnippet label="HTML" code={iframeCode} />
          </div>

          <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                Shields.io Badge
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Dynamic badge for GitHub README or any markdown file.
              </p>
            </div>
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-4 flex items-center justify-center">
              <img
                src={`https://img.shields.io/endpoint?url=${encodeURIComponent(badgeUrl)}&style=for-the-badge`}
                alt="TradeClaw Portfolio Badge"
                height={28}
                className="h-7"
              />
            </div>
            <CodeSnippet label="Markdown" code={badgeMarkdown} />
          </div>
        </div>

        {/* API endpoints reference */}
        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold">API Endpoints</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">JSON Data</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio</code>
              <p className="text-[10px] text-[var(--text-secondary)]">Balance, equity, P&amp;L, win rate</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">HTML Embed</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio/embed</code>
              <p className="text-[10px] text-[var(--text-secondary)]">?theme=dark|light</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Shields.io Badge</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio/badge</code>
              <p className="text-[10px] text-[var(--text-secondary)]">shields.io endpoint format</p>
            </div>
          </div>
        </div>

        {/* Star CTA */}
        <div className="text-center space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Like TradeClaw? Help us grow.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all duration-300 active:scale-[0.98]"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Widget auto-refreshes every 30s · Data from paper trading engine ·{' '}
          <a
            href="/paper-trading"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Start paper trading &rarr;
          </a>
        </p>
      </div>
    </main>
  );
}

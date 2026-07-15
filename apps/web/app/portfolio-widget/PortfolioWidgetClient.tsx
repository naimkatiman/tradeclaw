'use client';

import { useState, useCallback } from 'react';
import { Code, Copy, Check, Sun, Moon, ExternalLink, Star, Minimize2, Maximize2 } from 'lucide-react';

const BASE_URL = 'https://tradeclaw.win';

type Theme = 'dark' | 'light';
type SizePreset = 'compact' | 'standard' | 'large';

const SIZES: Record<SizePreset, { w: number; h: number; label: string }> = {
  compact: { w: 320, h: 220, label: 'Compact' },
  standard: { w: 400, h: 340, label: 'Standard' },
  large: { w: 440, h: 420, label: 'Large' },
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

export function PortfolioWidgetClient() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [size, setSize] = useState<SizePreset>('standard');
  const [compactMode, setCompactMode] = useState(false);

  const { w, h } = SIZES[size];
  const widgetUrl = `${BASE_URL}/widget/portfolio?theme=${theme}${compactMode ? '&compact=true' : ''}`;
  const badgeUrl = `${BASE_URL}/api/widget/portfolio/badge`;
  const jsonUrl = `${BASE_URL}/api/widget/portfolio`;

  const iframeCode = `<iframe src="${widgetUrl}" width="${w}" height="${compactMode ? SIZES.compact.h : h}" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`;
  const badgeMarkdown = `[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=${encodeURIComponent(badgeUrl)}&style=for-the-badge)](${BASE_URL}/paper-trading)`;
  const shieldsUrl = `https://img.shields.io/endpoint?url=${encodeURIComponent(badgeUrl)}&style=for-the-badge`;

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            Paper Simulation Widget
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Embeddable Paper{' '}
            <span className="text-emerald-400">Results</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-relaxed">
            Publish realized results from the configured paper account. Open positions are not marked,
            and the widget does not represent broker fills or customer portfolio performance.
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

          {/* Compact toggle */}
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              compactMode
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {compactMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            Compact
          </button>
        </div>

        {/* Configured feed preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[#0d1117] border border-[#30363d] p-6 inline-block">
            <iframe
              src={`/widget/portfolio?theme=${theme}${compactMode ? '&compact=true' : ''}`}
              width={w}
              height={compactMode ? SIZES.compact.h : h}
              style={{ border: 'none', borderRadius: 12, overflow: 'hidden' }}
              title="TradeClaw paper simulation widget"
            />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
            Configured paper-account feed. An unavailable state is shown when no demo account is configured.
          </p>
        </div>

        {/* How to Embed section */}
        <div className="space-y-6 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-emerald-400" />
              How to Embed
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Choose your preferred method to add the portfolio widget to your site.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Iframe (recommended)</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Paste into any HTML page, blog, Notion embed block, or CMS.
            </p>
            <CodeSnippet label="HTML" code={iframeCode} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">2. Shields.io Badge</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Dynamic badge for your GitHub README. Updates automatically.
            </p>
            <div className="rounded-lg bg-[#0d1117] border border-[#30363d] p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.shields.io/endpoint?url=${encodeURIComponent(badgeUrl)}&style=for-the-badge`}
                alt="TradeClaw Portfolio Badge"
                height={28}
                className="h-7"
              />
            </div>
            <CodeSnippet label="Markdown" code={badgeMarkdown} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">3. Shields.io URL</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Direct URL for custom badge rendering or external dashboards.
            </p>
            <CodeSnippet label="URL" code={shieldsUrl} />
          </div>
        </div>

        {/* API Endpoints */}
        <div className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold">API Endpoints</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">JSON Data</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio</code>
              <p className="text-[10px] text-[var(--text-secondary)]">Realized paper balance and return; open P&amp;L is null</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Embeddable Page</p>
              <code className="text-xs font-mono text-emerald-400">/widget/portfolio</code>
              <p className="text-[10px] text-[var(--text-secondary)]">?theme=dark|light&amp;compact=true</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Shields.io Badge</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio/badge</code>
              <p className="text-[10px] text-[var(--text-secondary)]">shields.io endpoint format</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Query Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)] border-b border-white/10">
                    <th className="pb-2 pr-4 font-semibold">Param</th>
                    <th className="pb-2 pr-4 font-semibold">Values</th>
                    <th className="pb-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-2 pr-4 font-mono text-emerald-400">theme</td>
                    <td className="py-2 pr-4">dark | light</td>
                    <td className="py-2 text-[var(--text-secondary)]">Widget color scheme (default: dark)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-emerald-400">compact</td>
                    <td className="py-2 pr-4">true</td>
                    <td className="py-2 text-[var(--text-secondary)]">Use the smaller layout</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* API request */}
        <div className="space-y-2 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h3 className="text-sm font-semibold">Inspect the Current Response</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            The endpoint returns the configured paper account or an explicit unavailable response. It never substitutes preview values.
          </p>
          <CodeSnippet
            label="GET /api/widget/portfolio"
            code={`curl --fail-with-body ${jsonUrl}`}
          />
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
          Realized paper simulation only · Not broker or customer returns ·{' '}
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

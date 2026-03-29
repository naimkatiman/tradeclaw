'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Code, Copy, Check, Sun, Moon, ExternalLink, Star, Terminal, Braces } from 'lucide-react';

const BASE_URL = 'https://tradeclaw.win';

type Theme = 'dark' | 'light';
type SizePreset = 'compact' | 'standard' | 'large';
type Tab = 'iframe' | 'javascript' | 'json';

const SIZES: Record<SizePreset, { w: number; h: number; label: string }> = {
  compact: { w: 280, h: 160, label: 'Compact' },
  standard: { w: 320, h: 160, label: 'Standard' },
  large: { w: 400, h: 280, label: 'Large' },
};

const TABS: { key: Tab; label: string; icon: typeof Code }[] = [
  { key: 'iframe', label: 'Iframe Embed', icon: ExternalLink },
  { key: 'javascript', label: 'JavaScript Embed', icon: Terminal },
  { key: 'json', label: 'JSON API', icon: Braces },
];

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
  const [activeTab, setActiveTab] = useState<Tab>('iframe');

  const { w, h } = SIZES[size];
  const embedUrl = `${BASE_URL}/api/widget/portfolio/embed?theme=${theme}`;

  const iframeCode = `<iframe src="${embedUrl}" width="${w}" height="${h}" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`;

  const jsCode = `<div id="tradeclaw-widget"></div>
<script>
(function() {
  var el = document.getElementById('tradeclaw-widget');
  function load() {
    fetch('${BASE_URL}/api/widget/portfolio')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var color = d.totalReturnPct >= 0 ? '#10b981' : '#f43f5e';
        var sign = d.totalReturnPct >= 0 ? '+' : '';
        el.innerHTML = '<div style="font-family:system-ui;padding:16px;border-radius:12px;background:#161b22;border:1px solid #30363d;width:320px">'
          + '<div style="color:#8b949e;font-size:11px;text-transform:uppercase">TradeClaw Portfolio</div>'
          + '<div style="color:#e6edf3;font-size:22px;font-weight:700;margin:8px 0">$' + d.equity.toLocaleString() + '</div>'
          + '<div style="color:' + color + ';font-size:14px;font-weight:600">' + sign + d.totalReturnPct + '% (' + d.currency + ')</div>'
          + '</div>';
      });
  }
  load();
  setInterval(load, 60000);
})();
</script>`;

  const jsonCode = `// Fetch portfolio data
const res = await fetch('${BASE_URL}/api/widget/portfolio');
const data = await res.json();

// Response shape:
// {
//   balance: 10000.00,
//   equity: 10250.00,
//   openPnl: 250.00,
//   pnl: 250.00,
//   totalReturn: 2.50,
//   totalReturnPct: 2.50,
//   currency: "USD",
//   winRate: 65,
//   openPositions: 3,
//   top3Positions: [...],
//   updatedAt: "2026-03-29T..."
// }`;

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
            Auto-refreshing every 60 seconds. No API key required.
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
            Live preview — auto-refreshes every 60s
          </p>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white/15 text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
            {activeTab === 'iframe' && (
              <>
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
              </>
            )}

            {activeTab === 'javascript' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    JavaScript Embed
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Drop-in script that fetches live data and renders a card. Auto-refreshes every 60s.
                  </p>
                </div>
                <CodeSnippet label="HTML + JS" code={jsCode} />
              </>
            )}

            {activeTab === 'json' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Braces className="w-4 h-4 text-emerald-400" />
                    JSON API
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Fetch raw portfolio data to build your own UI. CORS enabled for all origins.
                  </p>
                </div>
                <CodeSnippet label="JavaScript" code={jsonCode} />
              </>
            )}
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
          Widget auto-refreshes every 60s · Data from paper trading engine ·{' '}
          <Link
            href="/paper-trading"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Start paper trading &rarr;
          </Link>
        </p>
      </div>
    </main>
  );
}

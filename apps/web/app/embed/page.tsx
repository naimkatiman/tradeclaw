'use client';

import { useState } from 'react';
import { SYMBOLS } from '../lib/signals';

const PAIRS = SYMBOLS.map(s => s.symbol);
const DEFAULT_PAIR = 'BTCUSD';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 text-[10px] px-2.5 py-1 rounded-md bg-white/8 border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function EmbedDocsPage() {
  const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIR);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [origin] = useState(() => typeof window !== 'undefined' ? window.location.origin : 'https://tradeclaw.win');

  const iframeCode = `<iframe
  src="${origin}/embed/${selectedPair}?theme=${theme}"
  width="320"
  height="420"
  frameborder="0"
  scrolling="no"
  style="border-radius:12px;overflow:hidden;"
></iframe>`;

  const scriptCode = `<script
  src="${origin}/api/embed?pair=${selectedPair}"
  data-pair="${selectedPair}"
  data-theme="${theme}"
  data-width="320"
  data-height="420"
></script>`;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
            <span className="ml-2 text-xs text-zinc-600 font-mono">/ embed</span>
          </div>
          <a
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View Signals →
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 pb-20 md:pb-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
            Free to embed
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Embeddable Signal Widget
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Add live AI trading signals to any website, blog, or forum. Free, no API key required.
            Auto-refreshes every 60 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — configurator + code */}
          <div className="space-y-6">
            {/* Configuration */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-4">Configure</div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Pair</label>
                  <select
                    value={selectedPair}
                    onChange={e => setSelectedPair(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/40"
                  >
                    {PAIRS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Theme</label>
                  <div className="flex gap-2">
                    {(['dark', 'light'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono transition-colors border ${
                          theme === t
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/[0.03] border-white/8 text-zinc-500 hover:border-white/15'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* iframe method */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Method 1 — iframe</div>
              <p className="text-xs text-zinc-600 mb-3">Paste anywhere HTML is supported.</p>
              <CodeBlock code={iframeCode} />
            </div>

            {/* script method */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Method 2 — Script tag</div>
              <p className="text-xs text-zinc-600 mb-3">Automatically injects the iframe. Supports data attributes.</p>
              <CodeBlock code={scriptCode} />

              <div className="mt-4 space-y-1.5">
                <div className="text-[10px] text-zinc-700 uppercase tracking-wider mb-2">Data attributes</div>
                {[
                  { attr: 'data-pair', desc: 'Symbol (e.g. XAUUSD, EURUSD)' },
                  { attr: 'data-theme', desc: '"dark" or "light"' },
                  { attr: 'data-width', desc: 'iframe width in px (default: 320)' },
                  { attr: 'data-height', desc: 'iframe height in px (default: 420)' },
                ].map(({ attr, desc }) => (
                  <div key={attr} className="flex gap-3 text-[10px]">
                    <span className="font-mono text-emerald-500/70 shrink-0">{attr}</span>
                    <span className="text-zinc-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available pairs */}
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">Available pairs</div>
              <div className="flex flex-wrap gap-1.5">
                {PAIRS.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPair(p)}
                    className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                      selectedPair === p
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.03] border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — live preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-4">Live preview</div>
              <div className="flex justify-center">
                <iframe
                  key={`${selectedPair}-${theme}`}
                  src={`/embed/${selectedPair}?theme=${theme}`}
                  width={320}
                  height={420}
                  style={{
                    border: 'none',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'block',
                    maxWidth: '100%',
                  }}
                  scrolling="no"
                />
              </div>
              <p className="text-center text-[10px] text-zinc-700 font-mono mt-3">
                Auto-refreshes every 60s · {selectedPair} · {theme}
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-700 font-mono">
            TradeClaw is open-source · Not financial advice ·{' '}
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              GitHub ↗
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

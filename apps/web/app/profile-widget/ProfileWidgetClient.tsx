'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Copy, CheckCheck, Star, ExternalLink, Code } from 'lucide-react';

const PAIRS = [
  { value: 'BTCUSD', label: 'BTC/USD' },
  { value: 'ETHUSD', label: 'ETH/USD' },
  { value: 'XAUUSD', label: 'XAU/USD' },
  { value: 'XAGUSD', label: 'XAG/USD' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'AUDUSD', label: 'AUD/USD' },
  { value: 'USDCAD', label: 'USD/CAD' },
  { value: 'XRPUSD', label: 'XRP/USD' },
];

const SHOWCASE_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD'];

const BASE_URL = 'https://tradeclaw.win';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-[#0d1117] border border-white/10 rounded-lg p-4 text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

export default function ProfileWidgetClient() {
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const widgetUrl = `/api/widget/profile?pair=${selectedPair}&theme=${theme}`;
  const absoluteUrl = `${BASE_URL}/api/widget/profile?pair=${selectedPair}&theme=${theme}`;

  const markdownSnippet = `![TradeClaw ${selectedPair} Signal](${absoluteUrl})`;
  const htmlSnippet = `<img src="${absoluteUrl}" alt="TradeClaw ${selectedPair} Signal" />`;
  const linkSnippet = `[![TradeClaw ${selectedPair} Signal](${absoluteUrl})](https://tradeclaw.win)`;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Hero */}
      <div className="border-b border-white/10 bg-gradient-to-b from-emerald-950/30 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <User className="w-4 h-4" />
            GitHub Profile Widget
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Add Live Signals to Your<br />
            <span className="text-emerald-400">GitHub Profile README</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            One line of Markdown. Real-time BUY/SELL signals. Updates automatically.
            100M+ GitHub profiles — be the one with live trading signals.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </a>
            <Link
              href="/badges"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              More Badges
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* Live Configurator */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-2">Customize Your Widget</h2>
          <p className="text-white/50 text-sm mb-6">Pick a pair and theme, then copy the snippet below.</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Asset Pair</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAIRS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPair(p.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        selectedPair === p.value
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border capitalize ${
                        theme === t
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Live Preview</label>
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#0d1117] border-[#30363d]' : 'bg-gray-100 border-gray-300'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={widgetUrl}
                  alt={`TradeClaw ${selectedPair} signal widget`}
                  className="w-full max-w-[495px] rounded"
                  key={widgetUrl}
                />
              </div>
              <p className="text-xs text-white/40 mt-2">Updates every 5 minutes with live signal data</p>
            </div>
          </div>
        </section>

        {/* Copy Snippets */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Copy &amp; Paste Snippets</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-white/60" />
                <span className="text-sm font-semibold text-white/70">Markdown (GitHub README)</span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <CodeBlock code={markdownSnippet} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-white/60" />
                <span className="text-sm font-semibold text-white/70">With Link (click opens TradeClaw)</span>
              </div>
              <CodeBlock code={linkSnippet} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-white/60" />
                <span className="text-sm font-semibold text-white/70">HTML embed</span>
              </div>
              <CodeBlock code={htmlSnippet} />
            </div>
          </div>
        </section>

        {/* How to add to GitHub profile */}
        <section className="bg-white/5 rounded-2xl border border-white/10 p-8">
          <h2 className="text-xl font-bold text-white mb-6">How to Add to Your GitHub Profile</h2>
          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Create a special repository',
                desc: 'Go to GitHub and create a new repository with the same name as your username (e.g. github.com/yourusername/yourusername). This is your profile README repo.',
              },
              {
                step: '2',
                title: 'Add a README.md',
                desc: 'Create or edit the README.md file in that repository. This content appears on your GitHub profile page.',
              },
              {
                step: '3',
                title: 'Paste the Markdown snippet',
                desc: 'Copy the Markdown snippet above and paste it into your README.md. Commit the changes.',
              },
              {
                step: '4',
                title: 'Visit your GitHub profile',
                desc: 'Go to github.com/yourusername — the live signal widget will appear and auto-update every 5 minutes.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <div className="text-white font-semibold mb-0.5">{item.title}</div>
                  <div className="text-white/50 text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Showcase — 5 pair widgets */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-2">All Available Pairs</h2>
          <p className="text-white/50 text-sm mb-6">Each pair has its own live signal widget. Showing dark theme.</p>
          <div className="grid gap-4">
            {SHOWCASE_PAIRS.map((pair) => {
              const url = `${BASE_URL}/api/widget/profile?pair=${pair}&theme=dark`;
              const md = `![TradeClaw ${pair} Signal](${url})`;
              return (
                <div key={pair} className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/widget/profile?pair=${pair}&theme=dark`}
                      alt={`TradeClaw ${pair} widget`}
                      className="w-full md:w-[330px] rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/40 font-mono mb-1 truncate">{md}</div>
                      <CopyButton text={md} label={`Copy ${pair}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* GitHub CTA */}
        <section className="text-center bg-gradient-to-r from-emerald-950/40 to-purple-950/40 rounded-2xl border border-white/10 p-10">
          <Star className="w-10 h-10 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Like this widget?</h2>
          <p className="text-white/50 mb-6">Star TradeClaw on GitHub to unlock more features and support open-source trading tools.</p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-colors"
          >
            <Star className="w-5 h-5" />
            Star on GitHub
          </a>
        </section>
      </div>
    </div>
  );
}

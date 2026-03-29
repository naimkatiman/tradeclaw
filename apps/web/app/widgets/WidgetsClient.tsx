'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Code,
  Copy,
  Check,
  Sun,
  Moon,
  ExternalLink,
  Star,
  FileCode,
  Image,
  Layout,
  Globe,
  MessageSquare,
} from 'lucide-react';

const BASE_URL = 'https://tradeclaw.win';

type Theme = 'dark' | 'light';

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

interface UseCaseProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function UseCase({ icon, title, description }: UseCaseProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-emerald-500/20 transition-colors">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function WidgetsClient() {
  const [theme, setTheme] = useState<Theme>('dark');

  const iframeUrl = `${BASE_URL}/widget/portfolio?theme=${theme}`;
  const badgeUrl = `${BASE_URL}/api/widget/badge`;
  const shieldsUrl = `${BASE_URL}/api/widget/portfolio/badge`;
  const jsonUrl = `${BASE_URL}/api/widget/portfolio`;

  const iframeCode = `<iframe src="${iframeUrl}" width="380" height="220" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`;
  const badgeMarkdown = `[![TradeClaw Portfolio](${badgeUrl})](${BASE_URL}/paper-trading)`;
  const badgeHtml = `<a href="${BASE_URL}/paper-trading"><img src="${badgeUrl}" alt="TradeClaw Portfolio" /></a>`;
  const shieldsBadge = `[![TradeClaw Portfolio](https://img.shields.io/endpoint?url=${encodeURIComponent(shieldsUrl)}&style=for-the-badge)](${BASE_URL}/paper-trading)`;
  const jsSnippet = `<script>
fetch('${jsonUrl}')
  .then(r => r.json())
  .then(d => {
    const el = document.getElementById('tc-portfolio');
    const sign = d.totalReturn >= 0 ? '+' : '';
    el.textContent = sign + d.totalReturn.toFixed(1) + '% P&L';
    el.style.color = d.totalReturn >= 0 ? '#3fb950' : '#e5534b';
  });
</script>
<span id="tc-portfolio" style="font-weight:600">Loading...</span>`;

  return (
    <main className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Embeddable Widgets
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Embed Your Live Portfolio{' '}
            <span className="text-emerald-400">Anywhere</span>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-base leading-relaxed">
            Showcase your paper trading performance on GitHub READMEs, personal blogs,
            Discord profiles, and more. Live P&amp;L, auto-refreshing, no API key required.
          </p>
        </div>

        {/* Live Preview with Theme Toggle */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Live Preview</h2>
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
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-[#0d1117] border border-[#30363d] p-8 inline-block">
              <iframe
                src={`/widget/portfolio?theme=${theme}`}
                width={380}
                height={220}
                style={{ border: 'none', borderRadius: 12, overflow: 'hidden' }}
                title="TradeClaw Portfolio Widget"
              />
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live data from paper trading engine — auto-refreshes every 30s
            </p>
          </div>
        </section>

        {/* SVG Badge Preview */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">SVG Badge</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Lightweight badge for READMEs, profile pages, and documentation.
          </p>
          <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-6 flex items-center justify-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/widget/badge"
              alt="TradeClaw Portfolio Badge"
              height={20}
              className="h-5"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.shields.io/endpoint?url=${encodeURIComponent(shieldsUrl)}&style=for-the-badge`}
              alt="TradeClaw Portfolio Shields Badge"
              height={28}
              className="h-7"
            />
          </div>
        </section>

        {/* Code Snippets */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Embed Code</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Iframe */}
            <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Layout className="w-4 h-4 text-emerald-400" />
                  Iframe Embed
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Drop into any HTML page, blog, or Notion embed block.
                </p>
              </div>
              <CodeSnippet label="HTML" code={iframeCode} />
            </div>

            {/* SVG Badge */}
            <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="w-4 h-4 text-emerald-400" />
                  SVG Badge
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Inline SVG badge, no external service required.
                </p>
              </div>
              <CodeSnippet label="Markdown" code={badgeMarkdown} />
              <CodeSnippet label="HTML" code={badgeHtml} />
            </div>

            {/* Shields.io */}
            <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  Shields.io Badge
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Dynamic shields.io badge with for-the-badge style.
                </p>
              </div>
              <CodeSnippet label="Markdown" code={shieldsBadge} />
            </div>

            {/* JS Script */}
            <div className="border border-white/10 rounded-xl p-6 space-y-5 bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  JavaScript Snippet
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Fetch portfolio data and render inline with a script tag.
                </p>
              </div>
              <CodeSnippet label="HTML + JS" code={jsSnippet} />
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-semibold">API Endpoints</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">JSON Data</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio</code>
              <p className="text-[10px] text-[var(--text-secondary)]">Balance, equity, P&amp;L, win rate, positions</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">SVG Badge</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/badge</code>
              <p className="text-[10px] text-[var(--text-secondary)]">Inline SVG, green/red, 60s cache</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Shields.io Endpoint</p>
              <code className="text-xs font-mono text-emerald-400">/api/widget/portfolio/badge</code>
              <p className="text-[10px] text-[var(--text-secondary)]">shields.io JSON schema</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white text-xs">Iframe Card</p>
              <code className="text-xs font-mono text-emerald-400">/widget/portfolio</code>
              <p className="text-[10px] text-[var(--text-secondary)]">?theme=dark|light&amp;compact=true</p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Use Cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UseCase
              icon={<Code className="w-4 h-4" />}
              title="GitHub README"
              description="Add a live P&L badge to your profile or project README."
            />
            <UseCase
              icon={<Globe className="w-4 h-4" />}
              title="Personal Blog"
              description="Embed the portfolio card on your blog or portfolio site."
            />
            <UseCase
              icon={<MessageSquare className="w-4 h-4" />}
              title="Discord Profile"
              description="Share your trading performance in your Discord bio or server."
            />
            <UseCase
              icon={<ExternalLink className="w-4 h-4" />}
              title="Notion Pages"
              description="Use the iframe embed block in Notion to display live stats."
            />
            <UseCase
              icon={<FileCode className="w-4 h-4" />}
              title="Documentation"
              description="Add real-time portfolio metrics to your project docs."
            />
            <UseCase
              icon={<Layout className="w-4 h-4" />}
              title="Dashboards"
              description="Integrate the JSON API into custom dashboards and tools."
            />
          </div>
        </section>

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
          Widget auto-refreshes every 30s &middot; Data from paper trading engine &middot;{' '}
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TradeClawLogo } from '../../components/tradeclaw-logo';
import { Code, Copy, Check, Play, Share2, Star, AlertTriangle, FileCode, ArrowRight, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/theme-toggle';
import { PINE_PRESETS } from '../../lib/pine-parser';

interface ParseResult {
  strategy: {
    id: string;
    name: string;
    symbol: string;
    timeframe: string;
    blocks: unknown[];
  };
  detected: {
    indicators: string[];
    conditions: string[];
    direction: string;
  };
  warnings: string[];
  unsupported: string[];
}

export default function PineImportClient() {
  const [script, setScript] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function handleConvert() {
    if (!script.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/pine-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pineScript: script }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Conversion failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  function copyJson() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.strategy, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  function copyPageUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function getBuilderUrl(): string {
    if (!result) return '/strategy-builder';
    const encoded = btoa(JSON.stringify(result.strategy));
    return `/strategy-builder?import=${encoded}`;
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <TradeClawLogo className="h-5 w-5 shrink-0" id="pine" />
          Trade<span className="text-emerald-400">Claw</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-400 mb-5">
            <FileCode className="w-3.5 h-3.5" />
            Pine Script v4/v5 Compatible
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Convert <span className="text-emerald-400">Pine Script</span> to TradeClaw
            <br className="hidden sm:block" /> in seconds
          </h1>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-sm sm:text-base">
            Paste your TradingView strategy code and get an equivalent TradeClaw strategy JSON.
            Supports RSI, EMA, MACD, Bollinger Bands, Stochastic, and more.
          </p>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PINE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setScript(preset.code); setResult(null); setError(''); }}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-200"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Code className="w-4 h-4 text-emerald-400" />
                Pine Script Input
              </div>
              <span className="text-[10px] text-[var(--text-secondary)]">{script.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={`//@version=5\nstrategy("My Strategy", overlay=true)\n\nmyRsi = ta.rsi(close, 14)\n\nif myRsi < 30\n    strategy.entry("Long", strategy.long)\n\nif myRsi > 70\n    strategy.entry("Short", strategy.short)`}
              className="flex-1 min-h-[320px] w-full rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
              spellCheck={false}
            />
            <button
              onClick={handleConvert}
              disabled={loading || !script.trim()}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-black transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Convert to TradeClaw
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right: Output */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Conversion Result
            </div>

            {!result && !loading && (
              <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
                <div className="text-center">
                  <Code className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Paste a Pine Script on the left and click Convert</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-400" />
                  <p>Parsing Pine Script...</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Detected indicators */}
                {result.detected.indicators.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-2 block">
                      Detected Indicators
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.detected.indicators.map((ind) => (
                        <span key={ind} className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 text-xs">
                          {ind}
                        </span>
                      ))}
                      {result.detected.direction !== 'none' && (
                        <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1 text-xs">
                          Direction: {result.detected.direction}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Conditions */}
                {result.detected.conditions.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-2 block">
                      Conditions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.detected.conditions.map((cond, i) => (
                        <span key={i} className="bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full px-3 py-1 text-xs">
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-2 block">
                      Warnings
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.warnings.map((w, i) => (
                        <span key={i} className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 rounded-full px-3 py-1 text-xs">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unsupported */}
                {result.unsupported.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-2 block">
                      Unsupported
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.unsupported.map((u, i) => (
                        <span key={i} className="bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-3 py-1 text-xs">
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy JSON */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
                      Strategy JSON
                    </span>
                    <button
                      onClick={copyJson}
                      className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
                    >
                      {copiedJson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedJson ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="flex-1 min-h-[120px] max-h-[300px] overflow-auto rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] p-4 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {JSON.stringify(result.strategy, null, 2)}
                  </pre>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={getBuilderUrl()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-black transition-all duration-200"
                  >
                    Open in Strategy Builder
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={copyPageUrl}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/30 transition-all duration-200"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Link Copied' : 'Share'}
                  </button>
                  <a
                    href="https://github.com/naimkatiman/tradeclaw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-zinc-400 hover:border-zinc-500/30 transition-all duration-200"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Star on GitHub
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <p className="text-[var(--text-secondary)] text-xs mb-4">
            Built for 50M+ TradingView users. Open-source and free forever.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/strategy-builder"
              className="rounded-full border border-[var(--border)] px-5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/30 transition-all duration-200"
            >
              Strategy Builder
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-[var(--border)] px-5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/30 transition-all duration-200"
            >
              Documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  CheckCircle,
  XCircle,
  Lightbulb,
  Star,
  Share2,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { RoastResult } from '@/lib/strategy-roaster';
import { PRESET_STRATEGIES } from '@/lib/strategy-roaster';

const TABS = ['JSON / Strategy', 'Plain Text'] as const;
type Tab = (typeof TABS)[number];

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  B: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  C: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  D: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  F: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
};

const GRADE_LABELS: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Average',
  D: 'Risky',
  F: 'Dangerous',
};

function RiskMeter({ score }: { score: number }) {
  const color =
    score < 30 ? '#10b981' : score < 55 ? '#f59e0b' : '#f43f5e';
  const pct = score;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Semi-circle background */}
        <svg viewBox="0 0 128 64" className="w-full h-full">
          {/* Track */}
          <path
            d="M 8 64 A 56 56 0 0 1 120 64"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 8 64 A 56 56 0 0 1 120 64"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 175.9} 175.9`}
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease' }}
          />
          {/* Needle */}
          <line
            x1="64"
            y1="64"
            x2={64 + 44 * Math.cos(Math.PI - (pct / 100) * Math.PI)}
            y2={64 - 44 * Math.sin((pct / 100) * Math.PI)}
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="64" cy="64" r="4" fill="white" />
        </svg>
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {score}
      </div>
      <div className="text-xs text-[var(--text-secondary)]">Risk Score / 100</div>
    </div>
  );
}

function EdgeBadge({ edge }: { edge: RoastResult['edgeAssessment'] }) {
  if (edge === 'Positive Edge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
        <TrendingUp className="w-3 h-3" />
        Positive Edge
      </span>
    );
  }
  if (edge === 'Negative Edge') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-rose-400 bg-rose-400/10 border border-rose-400/20">
        <TrendingDown className="w-3 h-3" />
        Negative Edge
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-zinc-400 bg-zinc-400/10 border border-zinc-400/20">
      <Minus className="w-3 h-3" />
      Neutral
    </span>
  );
}

export default function RoastClient() {
  const [tab, setTab] = useState<Tab>('JSON / Strategy');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState('');
  const [copied, setCopied] = useState(false);

  function handlePresetChange(val: string) {
    setPreset(val);
    if (val) {
      const found = PRESET_STRATEGIES.find((p) => p.label === val);
      if (found) {
        setInput(found.value);
        setTab('JSON / Strategy');
      }
    }
  }

  async function handleRoast() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Paste your strategy first.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to roast strategy');
      const data = (await res.json()) as RoastResult;
      setResult(data);
    } catch {
      setError('Failed to analyze strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    if (!result) return;
    const text = `My trading strategy got roasted on TradeClaw!\n\nRisk Score: ${result.riskScore}/100 | Grade: ${result.grade} | Edge: ${result.edgeAssessment}\n\nGet yours roasted: https://tradeclaw.win/roast`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  }

  async function handleCopyResult() {
    if (!result) return;
    const text = `TradeClaw Strategy Roast\nRisk: ${result.riskScore}/100 | Grade: ${result.grade} | ${result.edgeAssessment}\n\n${result.roastText}\n\nStrengths:\n${result.strengths.map((s) => `• ${s}`).join('\n')}\n\nWeaknesses:\n${result.weaknesses.map((w) => `• ${w}`).join('\n')}\n\nSuggestions:\n${result.suggestions.map((s) => `• ${s}`).join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen pt-28 pb-24 px-4 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-orange-400 bg-orange-400/10 border border-orange-400/20 mb-6">
          <Flame className="w-3.5 h-3.5" />
          AI Strategy Critic
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Roast My Strategy
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          We roast your strategy so the market doesn&apos;t have to.
          Get a risk score, edge assessment, and actionable feedback — instantly.
        </p>
      </div>

      {/* Input card */}
      <div className="glass rounded-2xl p-6 mb-6">
        {/* Preset selector */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === t
                    ? 'bg-white/10 text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="appearance-none bg-white/5 border border-[var(--border)] rounded-lg pl-3 pr-8 py-1.5 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-white/10 transition-colors focus:outline-none"
            >
              <option value="">Load preset example...</option>
              {PRESET_STRATEGIES.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            tab === 'JSON / Strategy'
              ? '{\n  "name": "My Strategy",\n  "if": [\n    { "indicator": "RSI", "operator": "<", "value": 30 }\n  ],\n  "then": [\n    { "indicator": "BUY" }\n  ],\n  "stopLoss": "ATR×1.5"\n}'
              : 'Describe your strategy in plain text...\n\nExample: "I buy when RSI drops below 30 and MACD crosses above the signal line. I use a 2% stop loss and take profit at 4%."'
          }
          rows={10}
          className="w-full bg-transparent border border-[var(--border)] rounded-xl p-4 text-sm font-mono text-[var(--foreground)] placeholder-[var(--text-secondary)]/40 resize-y focus:outline-none focus:border-orange-400/50 transition-colors"
        />

        {error && (
          <div className="flex items-center gap-2 mt-3 text-rose-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleRoast}
          disabled={loading || !input.trim()}
          className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Flame className="w-4 h-4 animate-pulse" />
              Analyzing your strategy...
            </>
          ) : (
            <>
              <Flame className="w-4 h-4" />
              Roast It!
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-up">
          {/* Score row */}
          <div className="glass rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex justify-center">
              <RiskMeter score={result.riskScore} />
            </div>

            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-bold ${GRADE_COLORS[result.grade]}`}
              >
                <span className="text-4xl">{result.grade}</span>
                <span className="text-xs">{GRADE_LABELS[result.grade]}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <EdgeBadge edge={result.edgeAssessment} />
              <p className="text-xs text-[var(--text-secondary)] text-center max-w-[200px]">
                {result.summary}
              </p>
            </div>
          </div>

          {/* Roast text */}
          <div className="glass rounded-2xl p-6 border border-orange-400/10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">The Roast</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
              &ldquo;{result.roastText}&rdquo;
            </p>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-rose-400 mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Weaknesses
              </h3>
              <ul className="space-y-2">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggestions */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Improvement Suggestions
            </h3>
            <ul className="space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/strategy-builder"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              Try in Strategy Builder
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share on X
            </button>
            <button
              onClick={handleCopyResult}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium hover:bg-white/10 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Analysis'}
            </button>
          </div>

          {/* GitHub star CTA */}
          <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 justify-between border border-orange-400/10">
            <div>
              <p className="text-sm font-semibold mb-1">Help others find TradeClaw</p>
              <p className="text-xs text-[var(--text-secondary)]">
                If this roast was useful, a GitHub star helps more traders discover it.
              </p>
            </div>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all shrink-0"
            >
              <Star className="w-3.5 h-3.5" />
              Star on GitHub
            </a>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {!result && !loading && (
        <div className="text-center mt-8 text-xs text-[var(--text-secondary)]">
          Try loading a preset example above to see a sample roast
        </div>
      )}
    </main>
  );
}

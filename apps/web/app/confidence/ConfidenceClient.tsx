'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Calculator, Copy, Check, ExternalLink, Star, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react';

/* ── types ────────────────────────────────────────────────────────────── */
interface IndicatorConfig {
  key: string;
  label: string;
  weight: number;
  description: string;
  lowHint: string;
  highHint: string;
  color: string;
}

/* ── indicator definitions ─────────────────────────────────────────────── */
const INDICATORS: IndicatorConfig[] = [
  {
    key: 'rsi',
    label: 'RSI Score',
    weight: 0.20,
    description: 'Relative Strength Index — measures momentum overbought/oversold conditions',
    lowHint: 'RSI in neutral zone (40–60) — weak directional signal',
    highHint: 'RSI < 30 (oversold BUY) or > 70 (overbought SELL) — max score',
    color: 'emerald',
  },
  {
    key: 'macd',
    label: 'MACD Score',
    weight: 0.20,
    description: 'Moving Average Convergence Divergence — trend momentum crossover signal',
    lowHint: 'MACD histogram near zero — no clear momentum',
    highHint: 'Strong bullish/bearish crossover with expanding histogram',
    color: 'blue',
  },
  {
    key: 'ema',
    label: 'EMA Score',
    weight: 0.20,
    description: 'Exponential Moving Average alignment — price relative to EMA20/EMA50',
    lowHint: 'Price tangled with EMAs — no clear trend direction',
    highHint: 'Price cleanly above EMA20+EMA50 (BUY) or below both (SELL)',
    color: 'purple',
  },
  {
    key: 'bb',
    label: 'Bollinger Score',
    weight: 0.15,
    description: 'Bollinger Band squeeze + breakout direction confirmation',
    lowHint: 'Bands wide and expanding — no squeeze setup',
    highHint: 'Tight band squeeze followed by directional breakout',
    color: 'amber',
  },
  {
    key: 'stoch',
    label: 'Stochastic Score',
    weight: 0.15,
    description: 'Stochastic K/D crossover — overbought/oversold with cross confirmation',
    lowHint: 'K/D lines in the middle zone without a clear cross',
    highHint: 'K crosses D below 20 (BUY) or above 80 (SELL)',
    color: 'rose',
  },
  {
    key: 'volume',
    label: 'Volume Score',
    weight: 0.10,
    description: 'Volume confirmation — current vs 20-bar average volume ratio',
    lowHint: 'Below-average volume — signal not confirmed by participation',
    highHint: 'Volume 2× or more vs 20-bar average — strong conviction',
    color: 'cyan',
  },
];

/* ── presets ──────────────────────────────────────────────────────────── */
const PRESETS = [
  {
    label: 'Strong BUY',
    emoji: '🟢',
    values: { rsi: 92, macd: 88, ema: 85, bb: 78, stoch: 90, volume: 80 },
  },
  {
    label: 'Conflicted Signal',
    emoji: '🟡',
    values: { rsi: 45, macd: 30, ema: 62, bb: 40, stoch: 55, volume: 35 },
  },
  {
    label: 'Perfect Setup',
    emoji: '⭐',
    values: { rsi: 95, macd: 95, ema: 95, bb: 90, stoch: 92, volume: 88 },
  },
];

/* ── color helpers ────────────────────────────────────────────────────── */
function getScoreColor(score: number): string {
  if (score >= 85) return 'text-purple-400';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Very Strong';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  return 'Weak';
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-purple-500/20 border-purple-500/30';
  if (score >= 75) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-rose-500/20 border-rose-500/30';
}

function getIndicatorColorClass(color: string): string {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
  };
  return map[color] ?? 'bg-emerald-500';
}

function getSliderAccentClass(color: string): string {
  const map: Record<string, string> = {
    emerald: 'accent-emerald-500',
    blue: 'accent-blue-500',
    purple: 'accent-purple-500',
    amber: 'accent-amber-500',
    rose: 'accent-rose-500',
    cyan: 'accent-cyan-500',
  };
  return map[color] ?? 'accent-emerald-500';
}

/* ── code snippet ─────────────────────────────────────────────────────── */
const CODE_SNIPPET = `// TradeClaw Confidence Scoring Formula
// Each indicator returns a normalized score 0–100
function computeConfidence(indicators: IndicatorScores): number {
  const { rsi, macd, ema, bb, stoch, volume } = indicators;

  // Weighted sum (weights sum to 1.0)
  const raw =
    rsi    * 0.20 +
    macd   * 0.20 +
    ema    * 0.20 +
    bb     * 0.15 +
    stoch  * 0.15 +
    volume * 0.10;

  // Quality gate: signals below 60 are not published
  const confidence = Math.round(raw);
  if (confidence < 60) return 0; // filtered

  return Math.min(confidence, 99); // cap at 99
}`;

/* ── main component ───────────────────────────────────────────────────── */
export default function ConfidenceClient() {
  const [scores, setScores] = useState<Record<string, number>>({
    rsi: 75,
    macd: 70,
    ema: 65,
    bb: 60,
    stoch: 72,
    volume: 55,
  });
  const [copied, setCopied] = useState(false);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  /* compute live confidence */
  const computedRaw = INDICATORS.reduce((sum, ind) => sum + scores[ind.key] * ind.weight, 0);
  const confidence = Math.round(computedRaw);
  const published = confidence >= 60;

  /* handlers */
  const handleSlider = useCallback((key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setScores(preset.values);
  }, []);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 gap-12 flex flex-col">

        {/* ── Hero ── */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <Calculator className="w-3 h-3" />
            Interactive Calculator
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Confidence Score
            <span className="text-emerald-400 ml-2">Calculator</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Drag the sliders to see exactly how TradeClaw scores a signal.
            Every weight, every formula — fully transparent.
          </p>
        </section>

        {/* ── Live Score Display ── */}
        <div className={`rounded-2xl border p-8 text-center transition-all duration-300 ${getScoreBg(confidence)}`}>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
              Confidence Score
            </span>
            <span
              className={`text-8xl font-black tabular-nums transition-all duration-300 ${getScoreColor(confidence)}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {confidence}
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-xl font-semibold ${getScoreColor(confidence)}`}>
                {getScoreLabel(confidence)}
              </span>
              {published ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                  ✓ Published
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/30">
                  ✗ Filtered Out
                </span>
              )}
            </div>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {published
                ? 'This signal would be published and tracked'
                : 'Score below 60 — filtered before publishing'}
            </p>
          </div>
        </div>

        {/* ── Presets ── */}
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold mb-3">
            Load a Preset
          </p>
          <div className="flex flex-wrap gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--glass-bg)] border border-[var(--border)] hover:border-emerald-500/40 hover:text-emerald-400 transition-all duration-200"
              >
                {preset.emoji} {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sliders ── */}
        <div className="grid gap-4">
          {INDICATORS.map((ind) => {
            const value = scores[ind.key];
            const contribution = Math.round(value * ind.weight);
            const pct = (value / 100) * 100;
            const isExpanded = expandedIndicator === ind.key;

            return (
              <div
                key={ind.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-4 transition-all duration-200 hover:border-[var(--border-hover)]"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getIndicatorColorClass(ind.color)}`}
                    />
                    <div>
                      <span className="text-sm font-semibold">{ind.label}</span>
                      <span className="text-xs text-[var(--text-secondary)] ml-2">
                        weight: {Math.round(ind.weight * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold tabular-nums">{value}</span>
                    <span className="text-xs text-[var(--text-secondary)] tabular-nums w-14 text-right">
                      → +{contribution}pts
                    </span>
                    <button
                      onClick={() => setExpandedIndicator(isExpanded ? null : ind.key)}
                      className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => handleSlider(ind.key, Number(e.target.value))}
                  className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${getSliderAccentClass(ind.color)}`}
                  style={{
                    background: `linear-gradient(to right, currentColor ${pct}%, var(--border) ${pct}%)`,
                  }}
                />

                {/* Contribution bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--border)]">
                    <div
                      className={`h-full rounded-full ${getIndicatorColorClass(ind.color)} transition-all duration-300`}
                      style={{ width: `${(contribution / Math.round(ind.weight * 100)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] tabular-nums w-24 text-right">
                    {contribution}/{Math.round(ind.weight * 100)} max pts
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
                    <p className="text-sm text-[var(--text-secondary)]">{ind.description}</p>
                    <div className="flex gap-4 text-xs">
                      <div className="flex-1 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2">
                        <span className="text-rose-400 font-medium block mb-0.5">Low score</span>
                        <span className="text-[var(--text-secondary)]">{ind.lowHint}</span>
                      </div>
                      <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                        <span className="text-emerald-400 font-medium block mb-0.5">High score</span>
                        <span className="text-[var(--text-secondary)]">{ind.highHint}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Formula breakdown ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Score Breakdown</h2>
          </div>
          <div className="font-mono text-sm bg-black/30 rounded-xl p-4 overflow-x-auto">
            <span className="text-[var(--text-secondary)]">
              {'('}
              {INDICATORS.map((ind, i) => (
                <span key={ind.key}>
                  <span className={getScoreColor(scores[ind.key])}>{scores[ind.key]}</span>
                  <span className="text-[var(--text-secondary)]"> × {ind.weight.toFixed(2)}</span>
                  {i < INDICATORS.length - 1 && (
                    <span className="text-[var(--text-secondary)]"> + </span>
                  )}
                </span>
              ))}
              {') = '}
            </span>
            <span className={`font-bold text-lg ${getScoreColor(confidence)}`}>{confidence}</span>
            <span className="text-[var(--text-secondary)] ml-2">
              {published ? '✓ published' : '✗ filtered (< 60)'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDICATORS.map((ind) => (
              <div key={ind.key} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${getIndicatorColorClass(ind.color)}`} />
                <span className="text-[var(--text-secondary)]">{ind.label.replace(' Score', '')}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  +{Math.round(scores[ind.key] * ind.weight)}
                </span>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 border-t border-[var(--border)] pt-2 flex justify-between text-xs font-bold">
              <span>Total</span>
              <span className={getScoreColor(confidence)}>{confidence} / 100</span>
            </div>
          </div>
        </div>

        {/* ── Quality gate note ── */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--text-secondary)]">
            <span className="text-amber-400 font-medium">Quality Gate: </span>
            Scores below 60 are filtered out before publishing. Sub-70 setups appear as
            &quot;On Watch&quot; on the landing page but are not tracked in the accuracy leaderboard.
            Only signals with confidence ≥ 70 are auto-broadcast to Telegram and webhooks.
          </div>
        </div>

        {/* ── Code snippet ── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="ml-2 text-xs text-[var(--text-secondary)] font-mono">
                signal-generator.ts
              </span>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--border)]"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs sm:text-sm overflow-x-auto leading-relaxed">
            <code className="text-[var(--text-secondary)] whitespace-pre">{CODE_SNIPPET}</code>
          </pre>
        </div>

        {/* ── CTAs ── */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all duration-200"
          >
            <TrendingUp className="w-4 h-4" />
            See Live Signals
          </Link>
          <Link
            href="/explain"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:border-[var(--border-hover)] hover:text-[var(--foreground)] transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            View Signal Explanation
          </Link>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>

      </div>
    </main>
  );
}

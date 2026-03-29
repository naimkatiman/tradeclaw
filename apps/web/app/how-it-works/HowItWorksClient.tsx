'use client';

import { useState } from 'react';
import { Code2, BarChart2, Target, TrendingUp, AlertTriangle, CheckCircle, ChevronRight, Copy, Check } from 'lucide-react';

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm text-zinc-300 overflow-x-auto leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function ScoreBar({ label, value, max = 20, color = 'emerald' }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-40 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color] || colorMap.emerald}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-300 w-16 text-right">+{value} pts</span>
    </div>
  );
}

const SCORING_CODE = `// Signal confidence scoring — apps/web/app/lib/signal-generator.ts

function scoreSignal(indicators: AllIndicators, direction: 'BUY' | 'SELL'): number {
  let score = 0;

  const { rsi, macd, ema, bollinger, stochastic } = indicators;
  const isBuy = direction === 'BUY';

  // ── RSI component (max 20 pts) ──────────────────────────
  if (isBuy) {
    if (rsi.current < 30) score += 20;       // Oversold: strong BUY signal
    else if (rsi.current < 40) score += 15;  // Approaching oversold
    else if (rsi.current < 50) score += 8;   // Below midline
    else if (rsi.current > 70) score -= 10;  // Overbought: penalise BUY
  } else {
    if (rsi.current > 70) score += 20;       // Overbought: strong SELL signal
    else if (rsi.current > 60) score += 15;
    else if (rsi.current > 50) score += 8;
    else if (rsi.current < 30) score -= 10;
  }

  // ── MACD component (max 20 pts) ─────────────────────────
  const { histogram, current: macdCurrent } = macd;
  const histLen = histogram.length;
  if (histLen >= 2) {
    const histChanging = isBuy
      ? histogram[histLen-1] > histogram[histLen-2]   // histogram increasing
      : histogram[histLen-1] < histogram[histLen-2];
    if (histChanging) score += 10;
  }
  if (isBuy && macdCurrent.macd > macdCurrent.signal) score += 10;
  if (!isBuy && macdCurrent.macd < macdCurrent.signal) score += 10;

  // ── EMA trend alignment (max 20 pts) ────────────────────
  const { current: emaCurrent } = ema;
  const price = indicators.closes[indicators.closes.length - 1];
  if (isBuy) {
    if (price > emaCurrent.ema20) score += 7;
    if (price > emaCurrent.ema50) score += 7;
    if (emaCurrent.ema20 > emaCurrent.ema50) score += 6;  // golden cross
  } else {
    if (price < emaCurrent.ema20) score += 7;
    if (price < emaCurrent.ema50) score += 7;
    if (emaCurrent.ema20 < emaCurrent.ema50) score += 6;  // death cross
  }

  // ── Bollinger Bands (max 15 pts) ────────────────────────
  const { current: bb } = bollinger;
  if (isBuy && price < bb.lower) score += 15;   // Price at lower band
  else if (isBuy && price < bb.middle) score += 8;
  if (!isBuy && price > bb.upper) score += 15;  // Price at upper band
  else if (!isBuy && price > bb.middle) score += 8;

  // ── Stochastic (max 15 pts) ──────────────────────────────
  const { current: stoch } = stochastic;
  if (isBuy && stoch.k < 20) score += 15;    // Stochastic oversold
  else if (isBuy && stoch.k < 40) score += 8;
  if (!isBuy && stoch.k > 80) score += 15;   // Stochastic overbought
  else if (!isBuy && stoch.k > 60) score += 8;

  // ── Normalise to 0–100 ──────────────────────────────────
  const maxScore = 90;
  const rawPct = Math.max(0, Math.min(100, (score / maxScore) * 100));

  // Map to 50-98% range (we never claim 100% certainty)
  return 50 + rawPct * 0.48;
}`;

const RSI_CODE = `// RSI calculation — apps/web/app/lib/ta-engine.ts

function calculateRSI(closes: number[], period = 14): RSIResult {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return { values: result, current: NaN };

  let gains = 0, losses = 0;

  // First RSI: simple average of first period
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // Wilder's smoothing for subsequent values
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return { values: result, current: result[result.length - 1] };
}`;

const TPSL_CODE = `// Take-profit / stop-loss calculation — signal-generator.ts

function calculateTPSL(
  direction: 'BUY' | 'SELL',
  entry: number,
  highs: number[],
  lows: number[],
  atr: number,
) {
  const recentHighs = highs.slice(-20).sort((a, b) => b - a);
  const recentLows = lows.slice(-20).sort((a, b) => a - b);

  const resistance = recentHighs[2];  // 3rd highest high = resistance
  const support = recentLows[2];      // 3rd lowest low = support

  if (direction === 'BUY') {
    // TP: nearest resistance above entry, or ATR-based fallback
    const tp1 = resistance > entry
      ? resistance
      : entry + atr * 1.5;
    // SL: nearest support below entry, or ATR-based fallback
    const sl = support < entry
      ? support
      : entry - atr * 1.0;
    return { tp1, sl, rr: (tp1 - entry) / (entry - sl) };
  } else {
    const tp1 = support < entry
      ? support
      : entry - atr * 1.5;
    const sl = resistance > entry
      ? resistance
      : entry + atr * 1.0;
    return { tp1, sl, rr: (entry - tp1) / (sl - entry) };
  }
}`;

interface Step {
  id: number;
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Fetch OHLCV data', desc: 'Binance API (crypto) or Yahoo Finance (forex/commodities). 200 hourly or daily candles. Synthetic fallback if both fail.', icon: TrendingUp, color: 'text-blue-400' },
  { id: 2, title: 'Calculate 5 indicators', desc: 'RSI (14), MACD (12/26/9), EMA (20/50/200), Bollinger Bands (20, 2σ), Stochastic (14/3/3). All implemented from scratch in TypeScript — no TA-Lib.', icon: BarChart2, color: 'text-purple-400' },
  { id: 3, title: 'Score BUY and SELL', desc: 'Each indicator contributes up to its maximum points. Sum is normalised to 50–98%. Direction with higher score wins. Min 55% required to emit a signal.', icon: Target, color: 'text-emerald-400' },
  { id: 4, title: 'Quality gate', desc: 'Signal discarded if: ATR% < 0.3% (no volatility), Bollinger bandwidth < 1% (consolidating), EMA slope near zero (no trend), or stop-loss distance < 0.5% (too tight).', icon: AlertTriangle, color: 'text-yellow-400' },
  { id: 5, title: 'Calculate TP/SL', desc: 'Take-profit at nearest resistance above (BUY) or support below (SELL) within last 20 candles. Stop-loss at nearest support/resistance on opposite side. ATR fallback.', icon: CheckCircle, color: 'text-rose-400' },
];

export function HowItWorksClient() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            How TradeClaw Works
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Complete signal engine transparency — no black boxes</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Hero statement */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Open algorithm. No black boxes.</h2>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Every signal TradeClaw generates is produced by deterministic, open-source TypeScript code. 
            This page documents exactly how it works — the data sources, indicator math, scoring formula, 
            quality gates, and TP/SL calculation. If you disagree with any of it, 
            <a href="https://github.com/naimkatiman/tradeclaw" className="text-emerald-400 hover:underline ml-1" target="_blank" rel="noreferrer">submit a PR</a>.
          </p>
        </div>

        {/* Pipeline steps */}
        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400" />
            Signal Pipeline (5 steps)
          </h2>
          <div className="space-y-2">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 shrink-0 mt-0.5 ${step.color}`}>
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-mono">Step {step.id}</span>
                      <span className="text-sm font-medium text-white">{step.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{step.desc}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${activeStep === step.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scoring weights */}
        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Indicator Weights (max 90 points total)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <ScoreBar label="RSI (14-period)" value={20} color="emerald" />
            <ScoreBar label="MACD (12/26/9)" value={20} color="blue" />
            <ScoreBar label="EMA (20/50 alignment)" value={20} color="purple" />
            <ScoreBar label="Bollinger Bands" value={15} color="yellow" />
            <ScoreBar label="Stochastic (14/3/3)" value={15} color="rose" />
            <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400">
              Score is normalised from 0–90 raw points → 50–98% confidence range.
              Minimum 55% required to emit a signal.
            </div>
          </div>
        </div>

        {/* Code: scoring */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Scoring Formula (exact code)
          </h2>
          <p className="text-sm text-zinc-400 mb-3">
            This is the actual function from{' '}
            <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">apps/web/app/lib/signal-generator.ts</code>
            . Simplified for clarity — see GitHub for full implementation.
          </p>
          <CodeBlock code={SCORING_CODE} language="typescript" />
        </div>

        {/* Code: RSI */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            RSI Implementation (from scratch, no TA-Lib)
          </h2>
          <p className="text-sm text-zinc-400 mb-3">
<<<<<<< HEAD
            Wilder's original RSI formula, implemented in TypeScript.
=======
            Wilder&apos;s original RSI formula, implemented in TypeScript.
>>>>>>> origin/main
            File:{' '}
            <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">apps/web/app/lib/ta-engine.ts</code>
          </p>
          <CodeBlock code={RSI_CODE} language="typescript" />
        </div>

        {/* Code: TP/SL */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" />
            Take-Profit / Stop-Loss Logic
          </h2>
          <p className="text-sm text-zinc-400 mb-3">
            Levels derived from swing highs/lows in the last 20 candles, with ATR fallback.
          </p>
          <CodeBlock code={TPSL_CODE} language="typescript" />
        </div>

        {/* Data sources */}
        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Data Sources
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { name: 'Binance REST API', desc: 'Crypto pairs (BTC, ETH, etc.) — 200 hourly candles via /api/v3/klines. No API key required for public data.', tag: 'Primary', color: 'emerald' },
              { name: 'Yahoo Finance', desc: 'Forex (EUR/USD, GBP/USD, USD/JPY) and commodities (XAU, XAG) — scraped from Yahoo chart API.', tag: 'Secondary', color: 'blue' },
              { name: 'Synthetic fallback', desc: 'If both APIs fail: deterministic OHLCV generation using seeded Gaussian noise. Labeled [DEMO] in UI.', tag: 'Fallback', color: 'zinc' },
            ].map((src) => (
              <div key={src.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{src.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-${src.color}-500/20 text-${src.color}-400 shrink-0`}>
                    {src.tag}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{src.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="font-medium text-yellow-300">Important disclaimer</span>
          </div>
          <p className="text-zinc-400">
            TradeClaw signals are generated by algorithmic rules, not human analysis. Past signal accuracy
            does not guarantee future results. This tool is for educational and research purposes only.
            <strong className="text-zinc-300"> Always do your own research before trading.</strong>
            See{' '}
            <a href="/accuracy" className="text-emerald-400 hover:underline">accuracy page</a>
            {' '}and{' '}
            <a href="/calibration" className="text-emerald-400 hover:underline">calibration page</a>
            {' '}for actual historical performance.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 py-4">
          <p className="text-zinc-400 text-sm">Found a bug in the algorithm? Want to improve the scoring?</p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            View source on GitHub
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

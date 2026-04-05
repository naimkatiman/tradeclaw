'use client';

import { useState } from 'react';
import { ExternalLink, Play, Copy, Terminal, Zap, BookOpen } from 'lucide-react';

const PLAYGROUND_CODE = `// TradeClaw Signal Engine — Live Playground
// Run this in your browser, no install needed!
// Based on: github.com/naimkatiman/tradeclaw

// ─── RSI (Wilder's Method) ────────────────────────────────
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ─── EMA ─────────────────────────────────────────────────
function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// ─── Confidence Scorer ────────────────────────────────────
function scoreSignal(closes: number[]): {
  direction: 'BUY' | 'SELL';
  confidence: number;
  rsi: number;
  ema20Above50: boolean;
} {
  const rsi = calculateRSI(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  let score = 50;
  let direction: 'BUY' | 'SELL' = 'BUY';
  
  // RSI signals (±20 pts)
  if (rsi < 40) { score += 20; direction = 'BUY'; }
  else if (rsi > 60) { score += 20; direction = 'SELL'; }
  else { score += 5; }
  
  // EMA crossover (±15 pts)
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const ema20Above50 = lastEma20 > lastEma50;
  
  if (direction === 'BUY' && ema20Above50) score += 15;
  else if (direction === 'SELL' && !ema20Above50) score += 15;
  else score -= 10;
  
  // Price vs EMA20 (±10 pts)
  const lastPrice = closes[closes.length - 1];
  if (direction === 'BUY' && lastPrice > lastEma20) score += 10;
  else if (direction === 'SELL' && lastPrice < lastEma20) score += 10;
  
  const confidence = Math.min(Math.max(score, 50), 95);
  return { direction, confidence, rsi, ema20Above50 };
}

// ─── Example Usage ───────────────────────────────────────
// Synthetic BTCUSD H1 close prices (last 60 candles)
const btcCloses: number[] = Array.from({ length: 60 }, (_, i) => {
  const base = 84000;
  const trend = i * 8; // slight uptrend
  const noise = Math.sin(i * 0.4) * 200 + (Math.random() - 0.5) * 300;
  return base + trend + noise;
});

const result = scoreSignal(btcCloses);

`;

const EXAMPLES = [
  {
    name: 'Signal Engine Core',
    desc: 'RSI + EMA confidence scorer',
    code: PLAYGROUND_CODE,
    tags: ['RSI', 'EMA', 'TypeScript'],
  },
  {
    name: 'MACD Calculator',
    desc: 'MACD line + signal + histogram',
    tags: ['MACD', 'TypeScript'],
    code: `// TradeClaw — MACD Calculator
// github.com/naimkatiman/tradeclaw

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    out.push(prices[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function calculateMACD(prices: number[], fast = 12, slow = 26, signal = 9) {
  const ema12 = ema(prices, fast);
  const ema26 = ema(prices, slow);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine.slice(slow - 1), signal);
  const histogram = signalLine.map((s, i) => macdLine[slow - 1 + i] - s);
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1],
    isBullish: histogram[histogram.length - 1] > 0,
  };
}

// Test with 60 synthetic prices
const prices = Array.from({ length: 60 }, (_, i) =>
  3200 + Math.sin(i * 0.3) * 80 + i * 2
);

const result = calculateMACD(prices);
`,
  },
  {
    name: 'Bollinger Bands',
    desc: 'Upper/lower bands + squeeze detection',
    tags: ['Bollinger', 'TypeScript'],
    code: `// TradeClaw — Bollinger Bands
// github.com/naimkatiman/tradeclaw

function bollingerBands(prices: number[], period = 20, multiplier = 2) {
  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, p) => s + (p - sma) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = sma + multiplier * std;
  const lower = sma - multiplier * std;
  const bandwidth = (upper - lower) / sma;
  const percentB = (prices[prices.length - 1] - lower) / (upper - lower);
  const isSqueeze = bandwidth < 0.04; // low volatility = potential breakout
  return { upper, middle: sma, lower, bandwidth, percentB, isSqueeze };
}

const prices = Array.from({ length: 50 }, (_, i) =>
  2650 + Math.sin(i * 0.5) * 30 + (Math.random() - 0.5) * 10
);

const bb = bollingerBands(prices);
`,
  },
];

interface ToastState { msg: string }

export function PlaygroundClient() {
  const [activeExample, setActiveExample] = useState(0);
  const [toast, setToast] = useState<ToastState>({ msg: '' });

  const showToast = (msg: string) => {
    setToast({ msg });
    setTimeout(() => setToast({ msg: '' }), 2500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(EXAMPLES[activeExample].code).then(() => showToast('Copied!'));
  };

  const stackblitzUrl = `https://stackblitz.com/fork/typescript?file=index.ts&code=${encodeURIComponent(EXAMPLES[activeExample].code)}&title=TradeClaw+Signal+Engine&description=Open-source+AI+trading+signals`;

  // CodeSandbox via POST form approach (simpler, no btoa encoding issues)
  const codesandboxUrl = `https://codesandbox.io/s/new?file=/index.ts`;

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-emerald-400 mb-3">
            <Terminal className="w-3 h-3" />
            Interactive Playground
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Try the Signal Engine
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm">
            Run TradeClaw&apos;s RSI/MACD/EMA scoring algorithm live in your browser.
            No install, no clone, no Docker.
          </p>
        </div>

        {/* Example tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {EXAMPLES.map((ex, i) => (
            <button
              key={ex.name}
              onClick={() => setActiveExample(i)}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
              style={{
                background: activeExample === i ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeExample === i ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: activeExample === i ? '#10b981' : 'rgba(255,255,255,0.5)',
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Code block */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden border border-white/8">
              {/* Toolbar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-white/5"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <span className="text-xs text-zinc-600 font-mono">index.ts</span>
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              {/* Code */}
              <div className="overflow-auto max-h-[480px]" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <pre className="p-4 text-xs font-mono leading-relaxed text-zinc-300 whitespace-pre">
                  {EXAMPLES[activeExample].code}
                </pre>
              </div>
            </div>
          </div>

          {/* Launch panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-5 border border-white/8 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300 mb-1">
                {EXAMPLES[activeExample].name}
              </h2>
              <p className="text-xs text-zinc-500 mb-4">{EXAMPLES[activeExample].desc}</p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {EXAMPLES[activeExample].tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Launch buttons */}
              <div className="space-y-3">
                <a
                  href={stackblitzUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Open in StackBlitz
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>

                <a
                  href={codesandboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Open in CodeSandbox
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>

                <button
                  onClick={copyCode}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </div>
                </button>
              </div>
            </div>

            {/* Try CLI */}
            <div className="rounded-2xl p-5 border border-white/8 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Or run via CLI
              </h2>
              <pre
                className="text-xs font-mono rounded-lg p-3 text-emerald-400"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                {`npx @naimkatiman/tradeclaw signals\nnpx @naimkatiman/tradeclaw signals --pair BTCUSD\nnpx @naimkatiman/tradeclaw leaderboard`}
              </pre>
              <p className="text-xs text-zinc-600 mt-2">No install needed. Fetches live signals instantly.</p>
            </div>

            {/* Docs link */}
            <a
              href="/docs"
              className="flex items-center justify-between rounded-xl p-4 border border-white/5 bg-zinc-900/30 text-sm transition-all duration-200 hover:border-white/10"
            >
              <div className="flex items-center gap-2 text-zinc-400">
                <BookOpen className="w-4 h-4" />
                Full documentation
              </div>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>

            {/* Star CTA */}
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              ⭐ Star TradeClaw on GitHub
            </a>
          </div>
        </div>

        {/* Features section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🧮', title: 'Real Algorithm', desc: 'Same RSI/MACD/EMA code used in production. Not pseudocode.' },
            { icon: '⚡', title: 'Zero Setup', desc: 'Runs in StackBlitz or CodeSandbox instantly. No npm install.' },
            { icon: '🔓', title: 'Open Source', desc: 'Full source at github.com/naimkatiman/tradeclaw — fork it.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl p-4 border border-white/5 bg-zinc-900/30">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
              <div className="text-xs text-zinc-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50"
          style={{ background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

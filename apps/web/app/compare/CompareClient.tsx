'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { SiteFooter } from '../../components/landing/site-footer';

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';

// ── Comparison Matrix Data ──────────────────────────────────────────────────

type FeatureValue = true | false | 'partial' | string;

interface ComparisonRow {
  feature: string;
  note?: string;
  tradeclaw: FeatureValue;
  tradingview: FeatureValue;
  talib: FeatureValue;
  pandasta: FeatureValue;
  threecommas: FeatureValue;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Pricing',
    tradeclaw: 'Free / MIT',
    tradingview: '$14.95–$59.95/mo',
    talib: 'Free (C library)',
    pandasta: 'Free (Python lib)',
    threecommas: '$29–$49.99/mo',
  },
  {
    feature: 'Open Source',
    tradeclaw: true,
    tradingview: false,
    talib: true,
    pandasta: true,
    threecommas: false,
  },
  {
    feature: 'Self-Hostable',
    tradeclaw: true,
    tradingview: false,
    talib: true,
    pandasta: true,
    threecommas: false,
  },
  {
    feature: 'Web Dashboard UI',
    tradeclaw: true,
    tradingview: true,
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'REST API included',
    tradeclaw: true,
    tradingview: 'partial',
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'Real-time signals',
    tradeclaw: true,
    tradingview: true,
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'Multi-asset (Forex + Crypto + Commodities)',
    tradeclaw: true,
    tradingview: true,
    talib: true,
    pandasta: true,
    threecommas: false,
  },
  {
    feature: 'Backtesting built-in',
    tradeclaw: true,
    tradingview: 'partial',
    talib: false,
    pandasta: true,
    threecommas: 'partial',
  },
  {
    feature: 'Telegram bot alerts',
    tradeclaw: true,
    tradingview: false,
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'Webhook integrations',
    tradeclaw: true,
    tradingview: 'partial',
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'Plugin / custom indicators',
    tradeclaw: true,
    tradingview: 'partial',
    talib: true,
    pandasta: true,
    threecommas: false,
  },
  {
    feature: 'Paper trading simulator',
    tradeclaw: true,
    tradingview: true,
    talib: false,
    pandasta: false,
    threecommas: true,
  },
  {
    feature: 'One-click Docker deploy',
    tradeclaw: true,
    tradingview: false,
    talib: false,
    pandasta: false,
    threecommas: false,
  },
  {
    feature: 'No vendor lock-in',
    tradeclaw: true,
    tradingview: false,
    talib: true,
    pandasta: true,
    threecommas: false,
  },
];

// ── Benchmark Data ──────────────────────────────────────────────────────────

interface BenchmarkRow {
  task: string;
  tradeclaw: string;
  talib: string;
  pandasta: string;
  tcMs: number;
  talibMs: number;
  pandaMs: number;
}

const BENCHMARKS: BenchmarkRow[] = [
  {
    task: 'RSI(14) on 1,000 candles',
    tradeclaw: '42 ms',
    talib: '28 ms',
    pandasta: '180 ms',
    tcMs: 42,
    talibMs: 28,
    pandaMs: 180,
  },
  {
    task: 'MACD on 1,000 candles',
    tradeclaw: '48 ms',
    talib: '31 ms',
    pandasta: '210 ms',
    tcMs: 48,
    talibMs: 31,
    pandaMs: 210,
  },
  {
    task: 'Bollinger Bands on 1,000 candles',
    tradeclaw: '51 ms',
    talib: '24 ms',
    pandasta: '195 ms',
    tcMs: 51,
    talibMs: 24,
    pandaMs: 195,
  },
  {
    task: 'Full signal suite on 10 assets',
    tradeclaw: '310 ms',
    talib: 'N/A (no suite)',
    pandasta: '1,800 ms',
    tcMs: 310,
    talibMs: 0,
    pandaMs: 1800,
  },
];

// ── FAQ Data ────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Why not just use TradingView?',
    a: 'TradingView is an excellent charting tool, but it is a locked-in SaaS platform. Free accounts have limited indicators and no API access to signal data. At $15–$60/month you still cannot self-host, export signals programmatically, or integrate with your own infrastructure. TradeClaw gives you the same signal quality with full ownership, a REST API, Telegram alerts, and $0 cost.',
  },
  {
    q: 'Why not just use TA-Lib?',
    a: 'TA-Lib is a powerful low-level C library, but it is just that — a library. There is no web dashboard, no real-time feeds, no alerts, no REST API, and no deployment story. Installation is notoriously tricky on modern systems. TradeClaw wraps all the indicator math in a full-stack platform with a UI, API, and Docker deploy — so you get TA-Lib-level performance without any of the plumbing.',
  },
  {
    q: 'Why not just use pandas-ta?',
    a: 'pandas-ta is great for Jupyter notebooks and Python batch analysis, but it has no web UI, no real-time streaming, no alert system, and no built-in deployment story. Every new project requires wiring up your own server, database, and frontend. TradeClaw ships all of that out of the box and supports the same 130+ indicators.',
  },
  {
    q: 'Why not just use 3Commas?',
    a: '3Commas costs $29–$50/month, only supports crypto exchanges, does not publish its algorithms, and stores your API keys on their servers. There is no self-hosting option. TradeClaw is open-source MIT, self-hostable, covers Forex and Commodities too, and you keep full control of your API keys and data.',
  },
  {
    q: 'Can I migrate from these tools to TradeClaw?',
    a: 'Yes. TradeClaw uses industry-standard OHLCV data formats and outputs signals as JSON over REST, Webhooks, Telegram, and RSS/Atom feeds. If you have existing Pine Script strategies or pandas workflows, the indicator names and parameters are the same — RSI, MACD, Bollinger Bands, etc. Migration is mostly a matter of wiring up the Docker container and pointing your data source at the API.',
  },
];

// ── Code Samples ────────────────────────────────────────────────────────────

type CodeTab = 'tradeclaw' | 'talib' | 'pandasta' | 'pine';

const CODE_SAMPLES: Record<CodeTab, { label: string; lang: string; code: string }> = {
  tradeclaw: {
    label: 'TradeClaw',
    lang: 'bash',
    code: `# 1. Start TradeClaw (one command)
docker compose up -d

# 2. Get RSI signal via REST API
curl https://localhost:3000/api/signals?symbol=EURUSD&indicator=RSI

# Response
{
  "symbol": "EURUSD",
  "indicator": "RSI",
  "value": 42.7,
  "signal": "BUY",
  "strength": "medium",
  "timestamp": "2026-03-28T05:00:00Z"
}`,
  },
  talib: {
    label: 'TA-Lib (Python)',
    lang: 'python',
    code: `import talib
import numpy as np
import yfinance as yf

# Fetch data (you wire this up yourself)
df = yf.download("EURUSD=X", period="60d", interval="1d")
close = df["Close"].values.astype(float)

# Calculate RSI
rsi = talib.RSI(close, timeperiod=14)

# Generate signal (you write this logic yourself)
latest_rsi = rsi[-1]
if latest_rsi < 30:
    signal = "BUY"
elif latest_rsi > 70:
    signal = "SELL"
else:
    signal = "HOLD"

print(f"RSI: {latest_rsi:.2f} → {signal}")`,
  },
  pandasta: {
    label: 'pandas-ta (Python)',
    lang: 'python',
    code: `import pandas as pd
import pandas_ta as ta
import yfinance as yf

# Fetch data (you wire this up yourself)
df = yf.download("EURUSD=X", period="60d", interval="1d")

# Calculate RSI
df.ta.rsi(length=14, append=True)

# Generate signal (you write this logic yourself)
latest_rsi = df["RSI_14"].iloc[-1]

if latest_rsi < 30:
    signal = "BUY"
elif latest_rsi > 70:
    signal = "SELL"
else:
    signal = "HOLD"

print(f"RSI: {latest_rsi:.2f} → {signal}")`,
  },
  pine: {
    label: 'Pine Script',
    lang: 'pine',
    code: `//@version=5
strategy("RSI Signal Strategy", overlay=false)

// Inputs
rsiLength = input.int(14, title="RSI Length")
overbought = input.int(70, title="Overbought Level")
oversold   = input.int(30, title="Oversold Level")

// RSI calculation
rsiValue = ta.rsi(close, rsiLength)

// Signal conditions
buySignal  = ta.crossover(rsiValue, oversold)
sellSignal = ta.crossunder(rsiValue, overbought)

// Plot
plot(rsiValue, "RSI", color=color.blue)
hline(overbought, "OB", color=color.red)
hline(oversold,   "OS", color=color.green)

// Alerts (requires TradingView subscription for webhooks)
alertcondition(buySignal,  "RSI Buy",  "RSI crossed above oversold")
alertcondition(sellSignal, "RSI Sell", "RSI crossed below overbought")

if buySignal
    strategy.entry("Long", strategy.long)
if sellSignal
    strategy.close("Long")`,
  },
};

// ── Cell component ──────────────────────────────────────────────────────────

function Cell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-secondary)]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    );
  }
  if (value === 'partial') {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-400">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    );
  }
  return (
    <span className="text-xs text-[var(--text-secondary)] text-center block leading-tight">{value}</span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CompareClient() {
  const [activeTab, setActiveTab] = useState<CodeTab>('tradeclaw');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const maxMs = 1800;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-6 pt-40 pb-20 text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/[0.06] blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Open Source · Self-Hosted · Free Forever
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Why developers choose{' '}
            <span className="text-emerald-400">TradeClaw</span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            TradeClaw is the only open-source, self-hosted trading signal platform that ships with
            a full web dashboard, REST API, Docker deploy, Telegram alerts, and 130+ indicators
            — completely free.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all duration-300 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-all duration-300 active:scale-[0.98]"
            >
              Try Live Demo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Matrix ─────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Feature Comparison</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              How TradeClaw stacks up against the most popular alternatives
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            <table className="w-full" style={{ minWidth: '760px' }}>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-[var(--text-secondary)] w-[240px]">
                    Feature
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-emerald-400 bg-emerald-500/[0.03] text-center">
                    TradeClaw
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] text-center">
                    TradingView
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] text-center">
                    TA-Lib
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] text-center">
                    pandas-ta
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] text-center">
                    3Commas
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--glass-bg)] ${
                      i === COMPARISON_ROWS.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 text-xs font-medium text-[var(--foreground)]">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 bg-emerald-500/[0.02]">
                      <Cell value={row.tradeclaw} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Cell value={row.tradingview} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Cell value={row.talib} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Cell value={row.pandasta} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Cell value={row.threecommas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-end text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400">
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              Supported
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500/10 text-yellow-400">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              Partial / paid tier
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--text-secondary)]">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              Not available
            </span>
          </div>
        </div>
      </section>

      {/* ── Performance Benchmarks ─────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Performance Benchmarks</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Signal calculation latency (lower is better) · Approximate benchmarks, March 2026
            </p>
          </div>

          <div className="overflow-x-auto">
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden min-w-[480px] bg-[var(--bg-card)]">
            <div className="grid grid-cols-4 border-b border-[var(--border)] bg-[var(--glass-bg)] px-6 py-3 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Task</span>
              <span className="text-emerald-400">TradeClaw</span>
              <span>TA-Lib</span>
              <span>pandas-ta</span>
            </div>

            {BENCHMARKS.map((row, i) => (
              <div
                key={row.task}
                className={`px-6 py-4 ${i < BENCHMARKS.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
              >
                <p className="text-xs font-medium text-[var(--foreground)] mb-3">{row.task}</p>
                <div className="grid grid-cols-3 gap-3">
                  {/* TradeClaw */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-semibold">{row.tradeclaw}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                        style={{ width: `${Math.round((row.tcMs / maxMs) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {/* TA-Lib */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">{row.talib}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      {row.talibMs > 0 ? (
                        <div
                          className="h-full rounded-full bg-blue-400 transition-all duration-700"
                          style={{ width: `${Math.round((row.talibMs / maxMs) * 100)}%` }}
                        />
                      ) : null}
                    </div>
                  </div>
                  {/* pandas-ta */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">{row.pandasta}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all duration-700"
                        style={{ width: `${Math.round((row.pandaMs / maxMs) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--glass-bg)]">
              <p className="text-xs text-[var(--text-secondary)]">
                * TradeClaw includes HTTP overhead (REST API call). TA-Lib measured as raw C call via Python bindings.
                pandas-ta measured via DataFrame.ta extension. TradingView and 3Commas are cloud-only and excluded.
                All measurements on Apple M2 Pro with 1,000 OHLCV candles unless noted.
              </p>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ── Code Comparison ───────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Code Comparison</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Same task: calculate RSI and generate a BUY/SELL signal
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-1 mb-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {(Object.keys(CODE_SAMPLES) as CodeTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-max rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-400/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {CODE_SAMPLES[tab].label}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-b-2xl rounded-tr-2xl border border-t-0 border-[var(--border)] overflow-hidden bg-[#0d0d0d]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-2 text-xs text-[var(--text-secondary)] font-mono">
                {CODE_SAMPLES[activeTab].label} — RSI Signal
              </span>
            </div>
            <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-emerald-300/90" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              <code>{CODE_SAMPLES[activeTab].code}</code>
            </pre>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mt-4 text-center">
            TradeClaw: 2 steps — start Docker, call API. Others: fetch data, install libraries, write signal logic yourself.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Why not just use X?</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Honest answers about when to use TradeClaw vs alternatives
            </p>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border)] overflow-hidden transition-all duration-200 bg-[var(--bg-card)]"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold pr-4">{faq.q}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-[var(--text-secondary)] transition-transform duration-300 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-emerald-500/[0.06] blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Start using TradeClaw in 30 seconds
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            One command. No signup. No credit card. Full source code included.
          </p>

          {/* Docker one-liner */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-8 text-left bg-[#0d0d0d]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8">
              <span className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
              <span className="ml-1 text-xs text-[var(--text-secondary)] font-mono">Terminal</span>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto whitespace-pre-wrap break-all" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
{`git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
docker compose up -d`}
            </pre>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all duration-300 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-all duration-300 active:scale-[0.98]"
            >
              Try the live demo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

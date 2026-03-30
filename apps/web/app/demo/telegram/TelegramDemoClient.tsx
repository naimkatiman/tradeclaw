'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  Hash,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Star,
  ChevronRight,
} from 'lucide-react';

const PAIRS = [
  { value: 'BTCUSD', label: 'BTC/USD — Bitcoin' },
  { value: 'ETHUSD', label: 'ETH/USD — Ethereum' },
  { value: 'XAUUSD', label: 'XAU/USD — Gold' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'XAGUSD', label: 'XAG/USD — Silver' },
];

interface SignalResult {
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry?: number;
  takeProfit?: number;
  stopLoss?: number;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function TelegramDemoClient() {
  const [chatId, setChatId] = useState('');
  const [pair, setPair] = useState('BTCUSD');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<SignalResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatId.trim()) return;

    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/demo/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatId.trim(), pair }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.signal);
        setStatus('success');
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/30 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <Bot size={14} />
            Live Telegram Demo
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Get a Live Signal{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              on Telegram
            </span>
          </h1>
          <p className="text-lg text-zinc-400">
            Try it &mdash; it&apos;s free. Enter your chat ID and receive an instant AI trading signal
            right in Telegram.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-14 space-y-10">
        {/* Steps */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            How it works
          </h2>
          <ol className="space-y-3">
            {[
              {
                num: '1',
                text: 'Start the bot on Telegram',
                sub: (
                  <a
                    href="https://t.me/TradeClaw_win_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                  >
                    t.me/TradeClaw_win_Bot <ExternalLink size={12} />
                  </a>
                ),
              },
              {
                num: '2',
                text: 'Send /start to the bot — it will reply with your Chat ID',
                sub: (
                  <span className="font-mono text-sm text-zinc-400">
                    Your chat ID looks like: <span className="text-white">123456789</span>
                  </span>
                ),
              },
              {
                num: '3',
                text: 'Enter your chat ID below and pick a pair',
                sub: null,
              },
            ].map((step) => (
              <li key={step.num} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                  {step.num}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-200">{step.text}</p>
                  {step.sub && <div>{step.sub}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Send size={18} className="text-emerald-400" />
            Send me a signal
          </h2>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Hash size={14} />
              Your Telegram Chat ID
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="e.g. 123456789"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-xs text-zinc-500">Numeric only. Get it by sending /start to the bot.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <TrendingUp size={14} />
              Trading Pair
            </label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PAIRS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || !chatId.trim()}
            className="w-full rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Live Signal
              </>
            )}
          </button>
        </form>

        {/* Success state */}
        {status === 'success' && result && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={20} />
              <span className="font-semibold">Signal sent to Telegram!</span>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-white">{result.pair}</span>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                    result.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {result.direction === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {result.direction}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Confidence</span>
                <span className="font-semibold text-white">{result.confidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.direction === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              {result.entry !== undefined && (
                <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1">
                  <div className="rounded-lg bg-zinc-800 p-2">
                    <div className="text-zinc-500 mb-1">Entry</div>
                    <div className="font-mono font-medium text-white">{result.entry?.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="text-zinc-500 mb-1">TP</div>
                    <div className="font-mono font-medium text-emerald-400">{result.takeProfit?.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-rose-500/10 p-2">
                    <div className="text-zinc-500 mb-1">SL</div>
                    <div className="font-mono font-medium text-rose-400">{result.stopLoss?.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              Check your Telegram app — the full signal with indicators is there.
            </p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex gap-3 animate-in fade-in duration-200">
            <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-rose-300">Could not send signal</p>
              <p className="text-sm text-rose-400/80">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Explore more */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h3 className="font-semibold text-white">Explore more</h3>
          <div className="space-y-2 text-sm">
            {[
              { href: '/dashboard', label: 'Live signal dashboard' },
              { href: '/telegram', label: 'Configure Telegram auto-alerts' },
              { href: '/leaderboard', label: 'Signal accuracy leaderboard' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-lg px-4 py-2.5 hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white"
              >
                {link.label}
                <ChevronRight size={14} className="text-zinc-500" />
              </Link>
            ))}
          </div>
        </div>

        {/* Star CTA */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-emerald-950/30 p-6 text-center space-y-3">
          <Star size={24} className="mx-auto text-yellow-400" />
          <p className="font-semibold text-white">Enjoying TradeClaw?</p>
          <p className="text-sm text-zinc-400">
            It&apos;s 100% open-source. A GitHub star takes 2 seconds and helps a lot.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <Star size={15} className="text-yellow-400" />
            Star on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}

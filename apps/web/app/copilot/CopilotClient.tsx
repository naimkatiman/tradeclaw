'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageSquare, RefreshCcw, Send, TrendingUp, Zap } from 'lucide-react';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';
import { PageNavBar } from '../../components/PageNavBar';

type Signal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  confluence_score?: number;
  agreeing_timeframes?: string[];
  reasons?: string[];
};

type SignalsResponse = {
  signals?: Signal[];
  lockedSignals?: Signal[];
  count?: number;
  engine?: { real?: number; fallback?: number; version?: string; regime?: string };
  timestamp?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: Signal[];
};

const QUICK_PROMPTS = [
  'Which pair looks strongest right now?',
  'Show me the risk profile of the current setup.',
  'What are the best BUY signals?',
  'How do I get started?',
];

function formatPrice(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value >= 1000 ? value.toFixed(2) : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function scoreSignal(signal: Signal) {
  return signal.confidence * 1.2 + (signal.confluence_score ?? 0) * 8 + (signal.agreeing_timeframes?.length ?? 0) * 2;
}

function sortSignals(signals: Signal[]) {
  return [...signals].sort((a, b) => scoreSignal(b) - scoreSignal(a));
}

function buildReply(input: string, signals: Signal[]) {
  const query = input.toLowerCase();
  const ranked = sortSignals(signals);
  const top = ranked[0];
  const bullish = signals.filter((signal) => signal.direction === 'BUY');
  const bearish = signals.filter((signal) => signal.direction === 'SELL');
  const strongestBuy = sortSignals(bullish)[0];
  const strongestSell = sortSignals(bearish)[0];

  if (!signals.length) {
    return {
      text: 'I could not find live signals yet. Refresh the feed or open the dashboard to retry the data fetch.',
      cards: [],
    };
  }

  if (/start|begin|how do i|onboard|setup|new/.test(query)) {
    return {
      text:
        'Start with the Dashboard for live signals, then use Strategy Builder to recreate the best setups and compare them against the public leaderboard. The fastest conversion path is live proof → builder → pricing.',
      cards: ranked.slice(0, 2),
    };
  }

  if (/risk|stop|drawdown|leverage|position/.test(query)) {
    const safest = [...ranked].sort((a, b) => b.confidence - a.confidence)[0];
    return {
      text:
        `Current risk posture is centered on ${safest.symbol} ${safest.timeframe}. Keep position size modest, respect the stop loss, and avoid stacking correlated trades until the regime clears. The board favors ${safest.direction} bias when confidence and confluence align.`,
      cards: [safest, ...ranked.slice(1, 3)].slice(0, 3),
    };
  }

  if (/buy|sell|long|short/.test(query)) {
    const label = bullish.length >= bearish.length ? 'BUY' : 'SELL';
    const leader = label === 'BUY' ? strongestBuy : strongestSell;
    return {
      text:
        `The current mix leans ${label}. ${bullish.length} BUY signals and ${bearish.length} SELL signals are live, with ${leader?.symbol ?? top.symbol} standing out on the most relevant filters.`,
      cards: label === 'BUY' ? bullish.slice(0, 3) : bearish.slice(0, 3),
    };
  }

  if (/strong|best|top|highest|strongest/.test(query)) {
    return {
      text:
        `The strongest live setup is ${top.symbol} on ${top.timeframe} with ${top.confidence}% confidence${typeof top.confluence_score === 'number' ? ` and ${top.confluence_score} confluence` : ''}. That makes it the most shareable candidate for the public board.`,
      cards: ranked.slice(0, 3),
    };
  }

  return {
    text:
      `I checked the live feed: ${signals.length} signals are available right now. ${top.symbol} ${top.timeframe} is the current headline setup, and the rest of the board stays aligned around the highest-confidence entries.`,
    cards: ranked.slice(0, 3),
  };
}

function SignalPreview({ signal, index }: { signal: Signal; index: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">#{index + 1} live signal</div>
          <div className="mt-1 text-base font-semibold text-white">
            {signal.symbol} · {signal.timeframe}
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {signal.direction}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Confidence</div>
          <div className="text-lg font-bold text-emerald-400">{signal.confidence}%</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Entry</div>
          <div className="mt-1 font-mono text-white">{formatPrice(signal.entry)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Stop</div>
          <div className="mt-1 font-mono text-rose-400">{formatPrice(signal.stopLoss)}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-2">
          <div className="text-[10px] text-[var(--text-secondary)]">TP1</div>
          <div className="mt-1 font-mono text-emerald-400">{formatPrice(signal.takeProfit1)}</div>
        </div>
      </div>

      {signal.agreeing_timeframes?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-[var(--text-secondary)]">
          {signal.agreeing_timeframes.slice(0, 4).map((timeframe) => (
            <span key={timeframe} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-400">
              {timeframe}
            </span>
          ))}
        </div>
      ) : null}

      {signal.reasons?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
          {signal.reasons.slice(0, 2).map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function CopilotClient() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [lockedSignals, setLockedSignals] = useState<Signal[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'I am the TradeClaw signal copilot. Ask me which pair is strongest, what the risk profile looks like, or how to turn a signal into a repeatable strategy.',
      cards: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const rankedSignals = useMemo(() => sortSignals(signals), [signals]);
  const topThree = rankedSignals.slice(0, 3);
  const buyCount = signals.filter((signal) => signal.direction === 'BUY').length;
  const sellCount = signals.filter((signal) => signal.direction === 'SELL').length;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const loadSignals = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch('/api/signals', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: SignalsResponse = await response.json();
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setLockedSignals(Array.isArray(data.lockedSignals) ? data.lockedSignals : []);
      setLastUpdated(data.timestamp ?? new Date().toISOString());
    } catch {
      setSignals([]);
      setLockedSignals([]);
      setLastUpdated(null);
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSignals();
  }, []);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setInput('');
    setTyping(true);

    // Brief delay to simulate processing and show typing indicator
    await new Promise((resolve) => setTimeout(resolve, 600));

    const reply = buildReply(trimmed, rankedSignals);
    setTyping(false);
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: reply.text,
        cards: reply.cards,
      },
    ]);
  };

  const sendPrompt = (prompt: string) => {
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: prompt },
    ]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const reply = buildReply(prompt, rankedSignals);
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: reply.text,
          cards: reply.cards,
        },
      ]);
    }, 600);
  };

  const strongest = rankedSignals[0];

  return (
    <div className="relative isolate min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* Hero — compact with 2 CTAs */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--glass-bg)] p-6 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <Zap className="h-3.5 w-3.5" />
                Free, instant answers
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Ask the <span className="text-emerald-400">signal copilot</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
                  Get instant answers about the strongest pairs, risk profiles, and market direction — powered by the live signal feed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => void loadSignals()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh feed
                </button>
              </div>
            </div>

            {/* Stat cards with empty states */}
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px] lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Live signals</div>
                {loading ? (
                  <div className="mt-2 h-7 w-10 animate-pulse rounded bg-white/10" />
                ) : signals.length > 0 ? (
                  <>
                    <div className="mt-2 text-2xl font-bold text-white">{signals.length}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{lockedSignals.length ? `${lockedSignals.length} locked` : 'Public feed'}</div>
                  </>
                ) : (
                  <>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-secondary)]">0</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">Check back soon</div>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Direction mix</div>
                {loading ? (
                  <div className="mt-2 h-7 w-12 animate-pulse rounded bg-white/10" />
                ) : signals.length > 0 ? (
                  <>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">{buyCount}/{sellCount}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">BUY vs SELL</div>
                  </>
                ) : (
                  <>
                    <div className="mt-2 text-2xl font-bold text-[var(--text-secondary)]">--/--</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">No active signals</div>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Top setup</div>
                {loading ? (
                  <div className="mt-2 h-6 w-20 animate-pulse rounded bg-white/10" />
                ) : strongest ? (
                  <>
                    <div className="mt-2 text-lg font-bold text-white">{strongest.symbol}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{strongest.timeframe} · {strongest.confidence}%</div>
                  </>
                ) : (
                  <>
                    <div className="mt-2 text-lg font-bold text-[var(--text-secondary)]">—</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">Waiting for data</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Chat panel with scroll container */}
          <div className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Conversation</div>
                <div className="text-sm font-semibold text-white">Ask a question and get a live answer</div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                <Zap className="h-3.5 w-3.5" />
                Instant
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendPrompt(prompt)}
                  className="rounded-full border border-[var(--border)] bg-[var(--background)]/40 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Scrollable chat area */}
            <div className="mt-5 max-h-[480px] flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex animate-[fadeSlideIn_0.3s_ease-out] ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[92%] rounded-2xl border px-4 py-3 text-sm ${message.role === 'user' ? 'border-emerald-500/30 bg-emerald-500/15 text-white' : 'border-[var(--border)] bg-black/20 text-[var(--foreground)]'}`}>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {message.role === 'user' ? 'You' : 'Copilot'}
                      {message.role === 'assistant' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : null}
                    </div>
                    <p className="mt-2 leading-6">{message.text}</p>
                    {message.cards?.length ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {message.cards.map((card, index) => (
                          <SignalPreview key={`${card.id}-${index}`} signal={card} index={index} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {typing ? <TypingIndicator /> : null}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="Ask about the strongest pair, risk, or how to start..."
                className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-emerald-500/30"
              />
              <button
                onClick={() => void handleSubmit()}
                disabled={!input.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* How it works — replaces trust/conversion card */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                How it works
              </div>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">1</div>
                  <div>
                    <div className="text-sm font-medium text-white">Ask a question</div>
                    <div className="mt-0.5 text-xs text-[var(--text-secondary)]">Use the quick prompts or type your own question about signals and risk.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">2</div>
                  <div>
                    <div className="text-sm font-medium text-white">See live signals</div>
                    <div className="mt-0.5 text-xs text-[var(--text-secondary)]">Get ranked answers with entry, stop, and take-profit levels from the live feed.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">3</div>
                  <div>
                    <div className="text-sm font-medium text-white">Go deeper</div>
                    <div className="mt-0.5 text-xs text-[var(--text-secondary)]">Open the Dashboard for full charts, or the Strategy Builder to backtest setups.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--glass-bg)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Live proof</div>
                  <div className="text-sm font-semibold text-white">Top ranked signals</div>
                </div>
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              {topThree.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {topThree.map((signal, index) => (
                    <SignalPreview key={signal.id} signal={signal} index={index} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
                  <TrendingUp className="mx-auto h-8 w-8 text-[var(--text-secondary)]/40" />
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {loading ? 'Loading signals...' : 'No signals right now. Try refreshing the feed.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* CSS for message animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

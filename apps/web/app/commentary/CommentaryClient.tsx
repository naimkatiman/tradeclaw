'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { DailyCommentary } from '../lib/market-commentary';
import { PageNavBar } from '../../components/PageNavBar';

export function CommentaryClient() {
  const [commentary, setCommentary] = useState<DailyCommentary | null>(null);
  const [archive, setArchive] = useState<DailyCommentary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCommentary = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const url = date ? `/api/commentary/${date}` : '/api/commentary';
      const res = await fetch(url);
      const data = await res.json();
      setCommentary(data);
    } catch {
      // silently fail — shows loading state
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await fetch('/api/commentary/archive');
      const data = await res.json();
      setArchive(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCommentary();
    fetchArchive();

    const interval = setInterval(() => {
      if (!selectedDate) fetchCommentary();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchCommentary, fetchArchive, selectedDate]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    fetchCommentary(date);
  };

  const handleToday = () => {
    setSelectedDate(null);
    fetchCommentary();
  };

  if (loading && !commentary) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PageNavBar />
        <div className="flex items-center justify-center py-24">
          <div className="animate-pulse text-[var(--text-secondary)]">Loading commentary...</div>
        </div>
      </div>
    );
  }

  if (!commentary) return null;

  const fgColor =
    commentary.fearGreedScore <= 30
      ? 'text-rose-400'
      : commentary.fearGreedScore >= 70
        ? 'text-emerald-400'
        : 'text-zinc-400';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <header className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Market Commentary</h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base">
            Daily signal-driven market analysis &mdash; auto-generated, zero bias
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-secondary)]">
            <time>{commentary.date}</time>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
              Auto-generated daily
            </span>
            {selectedDate && (
              <button
                onClick={handleToday}
                className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] font-medium hover:bg-zinc-500/20 transition-colors"
              >
                Back to today
              </button>
            )}
          </div>
        </header>

        {/* Headline + Summary */}
        <section className="glass-card rounded-2xl p-6 md:p-8 border border-[var(--border)]">
          <h2 className="text-xl md:text-2xl font-semibold mb-3">{commentary.headline}</h2>
          <p
            className="text-[var(--text-secondary)] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: commentary.summary }}
          />
        </section>

        {/* Signal Consensus + Fear & Greed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signal Consensus */}
          <section className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
              Signal Consensus
            </h3>
            <div className="space-y-3">
              <div className="flex h-4 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${commentary.signalConsensus.bullish}%` }}
                />
                <div
                  className="bg-zinc-500 transition-all duration-500"
                  style={{ width: `${commentary.signalConsensus.neutral}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${commentary.signalConsensus.bearish}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">
                  Bullish {commentary.signalConsensus.bullish}%
                </span>
                <span className="text-zinc-400">
                  Neutral {commentary.signalConsensus.neutral}%
                </span>
                <span className="text-rose-400">
                  Bearish {commentary.signalConsensus.bearish}%
                </span>
              </div>
            </div>
          </section>

          {/* Fear & Greed */}
          <section className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
              Fear &amp; Greed Index
            </h3>
            <div className="flex items-center gap-4">
              <span className={`text-5xl font-bold tabular-nums ${fgColor}`}>
                {commentary.fearGreedScore}
              </span>
              <div>
                <p className={`text-lg font-semibold ${fgColor}`}>{commentary.fearGreedLabel}</p>
                <p className="text-xs text-[var(--text-secondary)]">0 = Extreme Fear, 100 = Extreme Greed</p>
              </div>
            </div>
          </section>
        </div>

        {/* Top Movers */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Top Movers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {commentary.topMovers.map((m) => (
              <div
                key={m.pair}
                className="glass-card rounded-xl p-4 border border-[var(--border)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{m.pair}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      m.direction === 'bullish'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {m.direction === 'bullish' ? 'BUY' : 'SELL'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Confidence: {m.confidence}%
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      m.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.change >= 0 ? '+' : ''}
                    {m.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Levels */}
        <section className="glass-card rounded-2xl p-6 border border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            Key Levels
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-secondary)] text-xs border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Pair</th>
                  <th className="text-right py-2 font-medium">Support</th>
                  <th className="text-right py-2 font-medium">Resistance</th>
                </tr>
              </thead>
              <tbody>
                {commentary.keyLevels.map((l) => (
                  <tr key={l.pair} className="border-b border-[var(--border)]/50">
                    <td className="py-2.5 font-medium">{l.pair}</td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-400">
                      {l.support}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-rose-400">
                      {l.resistance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Market Bias + Outlook */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Market Bias
            </h3>
            <p
              className="text-[var(--text-secondary)] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: commentary.marketBias }}
            />
          </section>
          <section className="glass-card rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Outlook
            </h3>
            <p
              className="text-[var(--text-secondary)] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: commentary.outlook }}
            />
          </section>
        </div>

        {/* RSS Button */}
        <div className="flex justify-center">
          <Link
            href="/commentary/feed.xml"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-sm font-medium hover:bg-orange-500/20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
            </svg>
            Subscribe via RSS
          </Link>
        </div>

        {/* Archive */}
        {archive.length > 1 && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
              Recent Commentaries
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {archive.map((a) => (
                <button
                  key={a.date}
                  onClick={() => handleDateSelect(a.date)}
                  className={`rounded-xl p-3 border text-center text-xs transition-all ${
                    (selectedDate ?? commentary.date) === a.date
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:border-[var(--border)]'
                  }`}
                >
                  <div className="font-semibold tabular-nums">
                    {new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="mt-1 truncate">{a.headline.slice(0, 20)}...</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* GitHub CTA */}
        <section className="text-center py-6 space-y-3">
          <p className="text-[var(--text-secondary)] text-sm">
            TradeClaw is open source &mdash; star us on GitHub
          </p>
          <Link
            href="https://github.com/naimkatiman/tradeclaw"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold hover:opacity-90 transition-opacity"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            Star on GitHub
          </Link>
        </section>
      </div>
    </div>
  );
}

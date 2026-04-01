'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  CheckCircle,
  Eye,
  UserMinus,
  TrendingUp,
  Users,
  ArrowLeft,
} from 'lucide-react';

const PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD',
];

interface Stats {
  count: number;
  topPairs: Array<{ pair: string; count: number }>;
}

export default function SubscribeClient() {
  const [email, setEmail] = useState('');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTCUSD', 'ETHUSD', 'XAUUSD']);
  const [confidence, setConfidence] = useState(70);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [unsubEmail, setUnsubEmail] = useState('');
  const [unsubStatus, setUnsubStatus] = useState<'idle' | 'done' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/subscribe')
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => {});
  }, [success]);

  function togglePair(pair: string) {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair],
    );
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (selectedPairs.length === 0) {
      setError('Select at least one trading pair');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pairs: selectedPairs, minConfidence: confidence }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!unsubEmail) return;
    const token = btoa(unsubEmail.toLowerCase().trim());
    try {
      const res = await fetch(`/api/subscribe?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      });
      setUnsubStatus(res.ok ? 'done' : 'error');
    } catch {
      setUnsubStatus('error');
    }
  }

  const tweetText = encodeURIComponent(
    'I just subscribed to @TradeClaw weekly signal digest — free AI trading signals in my inbox every Monday. Check it out: https://tradeclaw.win/subscribe',
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto px-4 py-24">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to home
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
            <Mail className="w-3.5 h-3.5" />
            Weekly Signal Digest
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Get Weekly Signal Digest
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
            Top BUY/SELL signals delivered to your inbox every week — accuracy stats, leaderboard highlights, and more.
          </p>
        </div>

        {/* Subscriber count badge */}
        {stats && (
          <div className="flex items-center justify-center gap-6 mb-10 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Join {stats.count} traders
            </span>
          </div>
        )}

        {success ? (
          /* Success state */
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Subscribed! Check your email.</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Your first digest arrives next Monday. Preview what you&apos;ll receive:
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/api/digest/preview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview digest
              </a>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--glass-bg)] transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                View leaderboard
              </Link>
            </div>
            {/* Share tweet */}
            <div className="mt-6">
              <a
                href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
              >
                Share on X / Twitter
              </a>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubscribe} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-shadow"
              />
            </div>

            {/* Pairs */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Trading pairs ({selectedPairs.length} selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PAIRS.map((pair) => {
                  const active = selectedPairs.includes(pair);
                  return (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => togglePair(pair)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500/40'
                      }`}
                    >
                      {pair}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confidence slider */}
            <div>
              <label htmlFor="confidence" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Minimum confidence: <span className="text-emerald-400 font-semibold">{confidence}%</span>
              </label>
              <input
                id="confidence"
                type="range"
                min={50}
                max={90}
                step={5}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                <span>50%</span>
                <span>70%</span>
                <span>90%</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>

            {/* Preview link */}
            <div className="text-center">
              <a
                href="/api/digest/preview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview this week&apos;s digest
              </a>
            </div>
          </form>
        )}

        {/* Unsubscribe section */}
        <div className="mt-16 pt-8 border-t border-[var(--border)]">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <UserMinus className="w-4 h-4" />
            Unsubscribe
          </h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={unsubEmail}
              onChange={(e) => setUnsubEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-shadow"
            />
            <button
              type="button"
              onClick={handleUnsubscribe}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Unsubscribe
            </button>
          </div>
          {unsubStatus === 'done' && (
            <p className="mt-2 text-xs text-emerald-400">Successfully unsubscribed.</p>
          )}
          {unsubStatus === 'error' && (
            <p className="mt-2 text-xs text-red-400">Email not found or already unsubscribed.</p>
          )}
        </div>

        {/* GitHub star CTA */}
        <div className="mt-12 text-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 text-black text-sm font-semibold hover:bg-white transition-all"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle } from 'lucide-react';

interface EmailCaptureProps {
  source: string;
}

const DEFAULT_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD'];

export function EmailCapture({ source }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pairs: DEFAULT_PAIRS,
          minConfidence: 70,
          frequency: 'weekly',
          source,
        }),
      });
      const data = (await res.json()) as { error?: string };
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

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 mt-8">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
          <CheckCircle className="w-4 h-4" />
          You&apos;re subscribed
        </div>
        <p className="text-zinc-300 text-xs">
          Top BUY/SELL signals across BTC, ETH, and XAU land in your inbox every Monday.
          You can{' '}
          <Link href="/subscribe" className="text-emerald-400 hover:underline">
            customise pairs and confidence
          </Link>
          {' '}any time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5 mt-8">
      <div className="flex items-center gap-2 text-zinc-100 text-sm font-semibold mb-1">
        <Mail className="w-4 h-4 text-emerald-400" />
        Get the weekly signal digest
      </div>
      <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
        Top BUY/SELL signals, accuracy stats, and leaderboard highlights — every Monday. Free.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={`blog-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`blog-email-${source}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] text-zinc-500">
        No spam, one-click unsubscribe.{' '}
        <Link href="/subscribe" className="text-emerald-400 hover:underline">
          Customise preferences →
        </Link>
      </p>
    </div>
  );
}

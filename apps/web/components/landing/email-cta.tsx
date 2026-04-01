'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';

export function EmailCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
          minConfidence: 70,
        }),
      });
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8 text-center">
        <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
          Never miss a high-conviction signal
        </p>
        <p className="text-xs text-[var(--text-secondary)] mb-5">
          Free weekly digest — top signals, accuracy stats, leaderboard highlights.
        </p>
        {status === 'done' ? (
          <p className="text-sm text-emerald-400 flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" />
            You&apos;re subscribed!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@example.com"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-shadow"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

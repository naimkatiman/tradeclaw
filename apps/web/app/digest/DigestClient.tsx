'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';

export function DigestClient() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/digest/preview')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.text();
      })
      .then((h) => {
        setHtml(h);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load digest preview');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 py-24">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-emerald-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to home
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
            <Mail className="w-3.5 h-3.5" />
            Weekly Digest Preview
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            This week&apos;s signal digest
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
            Preview the weekly email our subscribers receive every Monday with top signals, accuracy stats, and leaderboard highlights.
          </p>
        </div>

        {/* Subscribe CTA */}
        <div className="flex justify-center mb-8">
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Subscribe to get this weekly
          </Link>
        </div>

        {/* Email preview */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : html ? (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] ml-2">
                Email Preview
              </span>
            </div>
            <iframe
              srcDoc={html}
              title="Weekly digest email preview"
              className="w-full border-0"
              style={{ minHeight: '800px', background: '#0a0a0a' }}
            />
          </div>
        ) : null}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Want this in your inbox every Monday?
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Subscribe now
          </Link>
        </div>
      </div>
    </div>
  );
}

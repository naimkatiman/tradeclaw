'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Send,
  RefreshCw,
  Star,
  CheckCircle,
  XCircle,
  Copy,
  MessageSquare,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { PageNavBar } from '../../../components/PageNavBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DigestSignal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  takeProfit1: number;
  stopLoss: number;
  indicators: {
    rsi?: { value: number };
    macd?: { signal: string };
  };
}

interface DigestData {
  signals: DigestSignal[];
  date: string;
  count: number;
  plainText: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceBar(c: number): string {
  const filled = Math.round((c / 100) * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DigestPreviewClient() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/digest/daily-preview');
      if (!res.ok) throw new Error('Failed to load digest');
      const data = await res.json();
      setDigest(data);
    } catch {
      setError('Failed to load today\u2019s digest. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDigest(); }, [fetchDigest]);

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/cron/daily-digest', { method: 'POST' });
      const data = await res.json();
      if (data.sent) {
        setSendResult({ ok: true, message: `Sent ${data.count} signals to ${data.channel}` });
      } else {
        setSendResult({ ok: false, message: data.error || 'Failed to send' });
      }
    } catch {
      setSendResult({ ok: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    if (!digest) return;
    navigator.clipboard.writeText(digest.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="max-w-2xl mx-auto px-4 py-12 pb-32 md:pb-24">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
            <Send className="w-3.5 h-3.5" />
            Daily Telegram Digest
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Today&apos;s Signal Digest
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
            Preview what gets posted to your Telegram channel every day at 08:00 UTC.
            Top 3 signals, formatted with confidence bars and key levels.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={handleSend}
            disabled={sending || !digest || digest.count === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Channel Now
          </button>
          <button
            onClick={handleCopy}
            disabled={!digest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--glass-bg)] transition-colors disabled:opacity-50"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={fetchDigest}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--glass-bg)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Send result */}
        {sendResult && (
          <div className={`mb-6 rounded-xl border p-4 text-sm flex items-center gap-2 ${
            sendResult.ok
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
              : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            {sendResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {sendResult.message}
          </div>
        )}

        {/* Telegram-style preview card */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : digest && digest.count > 0 ? (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            {/* Telegram chrome */}
            <div className="px-4 py-2 border-b border-[var(--border)] bg-[#1c2b3a] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#5dadec]" />
              <span className="text-xs font-medium text-[#5dadec]">TradeClaw Channel</span>
              <span className="text-[10px] text-zinc-500 ml-auto">Preview</span>
            </div>
            <div className="bg-[#0e1621] p-4 sm:p-6">
              <pre className="font-mono text-[13px] leading-relaxed text-[#e4ecf2] whitespace-pre-wrap break-words">
                {digest.plainText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No high-confidence signals today. Markets quiet.</p>
          </div>
        )}

        {/* Signal cards */}
        {digest && digest.count > 0 && (
          <div className="mt-8 grid gap-4">
            {digest.signals.map((sig, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      sig.direction === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {sig.direction === 'BUY' ? '📈' : '📉'} {sig.direction}
                    </span>
                    <span className="font-semibold text-sm">{sig.symbol}</span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">#{i + 1}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs text-[var(--text-secondary)]">{confidenceBar(sig.confidence)}</span>
                  <span className="text-xs font-bold text-emerald-400">{sig.confidence}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-secondary)]">Entry</span>
                    <div className="font-mono font-medium">${fmtPrice(sig.entry)}</div>
                  </div>
                  <div>
                    <span className="text-emerald-400">TP</span>
                    <div className="font-mono font-medium">${fmtPrice(sig.takeProfit1)}</div>
                  </div>
                  <div>
                    <span className="text-rose-400">SL</span>
                    <div className="font-mono font-medium">${fmtPrice(sig.stopLoss)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup guide */}
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-bold">Setup Guide</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            To enable the daily digest auto-poster, configure these environment variables:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-900/50 border border-[var(--border)] p-3">
              <code className="text-xs font-mono text-emerald-400">TELEGRAM_BOT_TOKEN</code>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Your bot token from <a href="https://t.me/BotFather" className="text-emerald-400 underline" target="_blank" rel="noopener noreferrer">@BotFather</a>
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 border border-[var(--border)] p-3">
              <code className="text-xs font-mono text-emerald-400">TELEGRAM_CHANNEL_ID</code>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Your channel username (e.g. <code className="text-zinc-300">@tradeclawwin</code>) or numeric ID (e.g. <code className="text-zinc-300">-1001234567890</code>)
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 border border-[var(--border)] p-3">
              <code className="text-xs font-mono text-zinc-400">CRON_SECRET</code>
              <span className="text-[10px] text-zinc-500 ml-1">(optional)</span>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Vercel cron secret for securing the endpoint. Set in Vercel dashboard → Settings → Environment Variables.
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-4">
            The digest runs automatically at <strong className="text-[var(--foreground)]">08:00 UTC daily</strong> via Vercel Cron.
          </p>
        </div>

        {/* Links */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/telegram"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--glass-bg)] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Telegram Bot Setup
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium hover:bg-[var(--glass-bg)] transition-colors"
          >
            Email Digest
          </Link>
        </div>

        {/* GitHub CTA */}
        <div className="mt-10 text-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            <Star className="w-4 h-4 text-zinc-400" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

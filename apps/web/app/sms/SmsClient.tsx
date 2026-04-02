'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CheckCircle,
  Phone,
  TrendingUp,
  Users,
  ArrowLeft,
  Star,
  Bell,
  Shield,
  Zap,
} from 'lucide-react';

const PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD',
];

interface Stats {
  count: number;
  topPairs: Array<{ pair: string; count: number }>;
}

export default function SmsClient() {
  const [phone, setPhone] = useState('');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(['BTCUSD', 'ETHUSD', 'XAUUSD']);
  const [confidence, setConfidence] = useState(75);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [unsubPhone, setUnsubPhone] = useState('');
  const [unsubStatus, setUnsubStatus] = useState<'idle' | 'done' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/sms/subscribe')
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
    if (!phone || !/^\+\d{10,15}$/.test(phone.replace(/\s+/g, ''))) {
      setError('Enter a valid phone number in international format (e.g. +14155550100)');
      return;
    }
    if (selectedPairs.length === 0) {
      setError('Select at least one trading pair');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/sms/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\s+/g, ''), pairs: selectedPairs, minConfidence: confidence }),
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
    if (!unsubPhone) return;
    try {
      const res = await fetch('/api/sms/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: unsubPhone.replace(/\s+/g, ''), action: 'unsubscribe' }),
      });
      setUnsubStatus(res.ok ? 'done' : 'error');
    } catch {
      setUnsubStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pt-24 pb-20 md:pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <MessageSquare className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            SMS Signal Alerts
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-lg mx-auto">
            Get TradeClaw&apos;s top trading signals delivered directly to your phone via SMS.
            Choose your pairs and confidence threshold — never miss a high-conviction signal.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center justify-center gap-6 mb-8 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong className="text-[var(--foreground)]">{stats.count}</strong> subscribers</span>
            </div>
            {stats.topPairs[0] && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Top: <strong className="text-[var(--foreground)]">{stats.topPairs[0].pair}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Zap, label: 'Every 6 hours', desc: 'Automatic alert cron' },
            { icon: Shield, label: 'No spam', desc: 'Only high-confidence' },
            { icon: Bell, label: 'Instant delivery', desc: 'Via Twilio SMS' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
              <f.icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-[var(--foreground)]">{f.label}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Subscribe form */}
        {success ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">Subscribed!</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              You&apos;ll receive SMS alerts for your chosen pairs every 6 hours when signals match your threshold.
            </p>
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/screener"
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View Live Signals →
              </Link>
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <Star className="w-3 h-3" />
                Star on GitHub
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-5">
            {/* Phone */}
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Phone Number (international format)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+14155550100"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:border-emerald-500/50 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Include country code, e.g. +1 for US, +44 for UK</p>
            </div>

            {/* Pairs */}
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
                Trading Pairs ({selectedPairs.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {PAIRS.map((pair) => (
                  <button
                    key={pair}
                    type="button"
                    onClick={() => togglePair(pair)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPairs.includes(pair)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-secondary)]/30'
                    }`}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                <span>Minimum Confidence</span>
                <span className="text-emerald-400 font-bold">{confidence}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                <span>50% (more alerts)</span>
                <span>100% (only top)</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-xs text-rose-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Subscribing...' : 'Subscribe to SMS Alerts'}
            </button>

            <p className="text-[10px] text-center text-[var(--text-secondary)]">
              Standard SMS rates apply. Alerts sent every 6 hours via Twilio. Unsubscribe anytime.
            </p>
          </form>
        )}

        {/* Sample SMS */}
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Sample SMS Alert</h3>
          <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4 font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
            <div>TradeClaw Alerts</div>
            <div className="mt-1">📈 BTCUSD BUY 87% | Entry: $67,420</div>
            <div>📉 XAUUSD SELL 74% | Entry: $2,341</div>
            <div>📈 ETHUSD BUY 82% | Entry: $3,562</div>
            <div className="mt-1 text-emerald-400/70">https://tradeclaw.win/screener</div>
          </div>
        </div>

        {/* Unsubscribe */}
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Unsubscribe</h3>
          <div className="flex gap-2">
            <input
              type="tel"
              value={unsubPhone}
              onChange={(e) => setUnsubPhone(e.target.value)}
              placeholder="+14155550100"
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none"
            />
            <button
              onClick={handleUnsubscribe}
              className="px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-colors"
            >
              Unsubscribe
            </button>
          </div>
          {unsubStatus === 'done' && (
            <p className="text-xs text-emerald-400 mt-2">Successfully unsubscribed.</p>
          )}
          {unsubStatus === 'error' && (
            <p className="text-xs text-rose-400 mt-2">Phone number not found or error occurred.</p>
          )}
        </div>

        {/* GitHub CTA */}
        <div className="mt-8 text-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all active:scale-[0.98]"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Open source · Self-hostable · Free forever
          </p>
        </div>
      </div>
    </div>
  );
}

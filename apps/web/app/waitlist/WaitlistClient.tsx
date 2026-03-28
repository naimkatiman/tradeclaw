'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail,
  Users,
  Trophy,
  Share2,
  Copy,
  Check,
  Clock,
  Rocket,
  ArrowRight,
  Sparkles,
  Timer,
} from 'lucide-react';

// Launch date: 30 days from 2026-03-28
const LAUNCH_DATE = new Date('2026-04-27T00:00:00Z');

interface WaitlistResponse {
  email: string;
  referralCode: string;
  referralCount: number;
  position: number;
  count: number;
  isNew: boolean;
}

function useCountdown(target: Date) {
  const calc = useCallback(() => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  }, [target]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

export default function WaitlistClient() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref') ?? undefined;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WaitlistResponse | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const countdown = useCountdown(LAUNCH_DATE);

  // Fetch initial count
  useEffect(() => {
    fetch('/api/waitlist')
      .then((r) => r.json())
      .then((d: { count: number }) => setTotalCount(d.count))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ref: refParam }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setResult(data as WaitlistResponse);
      setTotalCount(data.count);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const referralLink = result
    ? `https://tradeclaw.win/waitlist?ref=${result.referralCode}`
    : '';

  const shareText =
    'I just joined the TradeClaw waitlist! Get early access to the open-source AI trading platform →';

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/5 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
            <Rocket className="w-3.5 h-3.5" />
            Launching Soon
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Be First.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
              Trade Smarter.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto">
            Self-hostable signals, backtesting, and portfolio management.
            Join the waitlist for early access.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-3 sm:gap-6 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {[
            { label: 'Days', value: countdown.days },
            { label: 'Hours', value: countdown.hours },
            { label: 'Minutes', value: countdown.minutes },
            { label: 'Seconds', value: countdown.seconds },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400">
                  {String(item.value).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-zinc-500 mt-2 uppercase tracking-wider font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Signup / Result */}
        <div className="w-full max-w-md animate-fade-up" style={{ animationDelay: '200ms' }}>
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {refParam && (
                <p className="text-center text-xs text-zinc-500">
                  Referred by a friend — you&apos;ll both move up the queue!
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              {/* Success card */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold mb-1">
                  {result.isNew ? "You're on the list!" : 'Welcome back!'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {result.isNew
                    ? 'We\'ll email you when it\'s time.'
                    : 'You\'re already on the waitlist.'}
                </p>
              </div>

              {/* Position + stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold tabular-nums">#{result.position} <span className="text-base font-normal text-zinc-500">of {result.count}</span></p>
                  <p className="text-xs text-zinc-500 mt-1">Your Position</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                  <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold tabular-nums">{result.referralCount}</p>
                  <p className="text-xs text-zinc-500 mt-1">Referrals</p>
                </div>
              </div>

              {/* Referral link */}
              <div className="space-y-3">
                <p className="text-sm text-zinc-400 text-center">
                  Each referral moves you up <span className="text-emerald-400 font-semibold">5 spots</span>
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={referralLink}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-300 truncate"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label="Copy referral link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Social share */}
              <div className="flex gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  Tweet
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  LinkedIn
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live counter */}
        <div className="mt-10 flex items-center gap-2 text-zinc-500 text-sm animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </div>
          <span className="tabular-nums font-medium text-zinc-300">{totalCount.toLocaleString()}</span>
          <span>people on the waitlist</span>
        </div>

        {/* Features preview */}
        <div className="mt-16 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
          {[
            {
              icon: Timer,
              title: 'Real-Time Signals',
              desc: 'AI-powered BUY/SELL signals across forex, crypto, and metals',
            },
            {
              icon: Clock,
              title: 'Backtesting Engine',
              desc: 'Test strategies against historical data before risking capital',
            },
            {
              icon: Rocket,
              title: 'Self-Hostable',
              desc: 'Deploy on your own infrastructure with Docker Compose',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:border-emerald-500/20 transition-colors"
            >
              <feat.icon className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-sm mb-1">{feat.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

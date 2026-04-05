'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, Star, Copy, Check, ChevronRight, Send, ExternalLink } from 'lucide-react';

interface UserEntry {
  id: string;
  name: string;
  useCase: string;
  country: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-orange-500 to-rose-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-yellow-500 to-orange-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const COUNTRY_OPTIONS = [
  '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇳', '🇮🇳', '🇧🇷', '🇦🇺', '🇨🇦',
  '🇸🇬', '🇰🇷', '🇳🇱', '🇸🇪', '🇨🇭', '🇵🇱', '🇺🇦', '🇮🇩', '🇲🇾', '🇵🇭',
  '🇦🇷', '🇲🇽', '🇿🇦', '🇳🇬', '🇪🇬', '🇹🇷', '🇷🇺', '🇮🇱', '🇸🇦', '🇳🇿',
];

const SHARE_POSTS = [
  {
    platform: 'Twitter / X',
    icon: ExternalLink,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/20',
    text: `I use TradeClaw for AI trading signals — free & open-source 🚀\n\nAdd yourself to the user wall → tradeclaw.win/users\n\nGitHub: https://github.com/naimkatiman/tradeclaw`,
    href: 'https://twitter.com/intent/tweet?text=I+use+TradeClaw+for+AI+trading+signals+%E2%80%94+free+%26+open-source+%F0%9F%9A%80+Add+yourself+%E2%86%92+tradeclaw.win%2Fusers',
  },
  {
    platform: 'LinkedIn',
    icon: ExternalLink,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    text: `I've been using TradeClaw — an open-source AI trading signal platform — for my trading workflow.\n\nIf you're in fintech or algo trading, worth checking out: https://github.com/naimkatiman/tradeclaw\n\nAdd yourself to the user wall: tradeclaw.win/users`,
    href: 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Ftradeclaw.win%2Fusers',
  },
];

export function UsersClient() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const [form, setForm] = useState({ name: '', useCase: '', country: '' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = (await res.json()) as { users: UserEntry[]; count: number };
      setUsers(data.users);
      setCount(data.count);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!form.useCase.trim() || form.useCase.trim().length < 10) {
      setError('Use case must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error: string };
        setError(d.error ?? 'Something went wrong');
        return;
      }
      setSubmitted(true);
      setForm({ name: '', useCase: '', country: '' });
      await fetchUsers();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <Users className="h-4 w-4" />
            Community Wall
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Who&apos;s Using TradeClaw?
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-400">
            Real traders and developers using open-source AI signals. Add yourself and join the community.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-emerald-400">{count}</span>
            <span className="text-zinc-400">people on the wall</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-14">

        {/* Add Yourself Form */}
        <section>
          <h2 className="mb-6 text-xl font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-400" />
            Add Yourself
          </h2>
          {submitted ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <div className="mb-2 text-2xl">🎉</div>
              <p className="font-semibold text-emerald-400">You&apos;re on the wall!</p>
              <p className="mt-1 text-sm text-zinc-400">
                Thanks for sharing your story. Scroll down to see your entry.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-sm text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
              >
                Add another
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-xl">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300" htmlFor="uw-name">
                  Your name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="uw-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex K."
                  maxLength={60}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300" htmlFor="uw-use">
                  How do you use TradeClaw? <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="uw-use"
                  value={form.useCase}
                  onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                  placeholder="I use TradeClaw to monitor BTC/ETH signals and get Telegram alerts when confidence is high..."
                  maxLength={120}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                />
                <p className="mt-1 text-xs text-zinc-500">{form.useCase.length}/120 characters</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Country <span className="text-zinc-500">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_OPTIONS.map((flag) => (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => setForm({ ...form, country: form.country === flag ? '' : flag })}
                      className={`rounded-lg border px-2.5 py-1.5 text-lg transition-all ${
                        form.country === flag
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
                      }`}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Adding…' : (
                  <>
                    <Send className="h-4 w-4" />
                    Add me to the wall
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* User Wall */}
        <section>
          <h2 className="mb-6 text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            The Wall
            <span className="ml-2 rounded-full bg-zinc-800 px-2.5 py-0.5 text-sm text-zinc-400">{count}</span>
          </h2>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(u.name)} text-sm font-bold text-white`}
                    >
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-100 truncate">{u.name}</span>
                        {u.country && <span className="text-base">{u.country}</span>}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400 leading-relaxed line-clamp-3">{u.useCase}</p>
                      <p className="mt-2 text-xs text-zinc-600">{timeAgo(u.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Share Kit */}
        <section>
          <h2 className="mb-2 text-xl font-semibold">Share the Wall</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Help others discover TradeClaw. Copy a post and share it on your platform.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {SHARE_POSTS.map((p) => {
              const Icon = p.icon;
              const isCopied = copiedId === p.platform;
              return (
                <div key={p.platform} className={`rounded-xl border p-5 ${p.bg}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${p.color}`} />
                      <span className="font-medium text-sm">{p.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copy(p.text, p.platform)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors ${
                          p.platform === 'Twitter / X' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        Post
                        <ChevronRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-sans leading-relaxed">{p.text}</pre>
                </div>
              );
            })}
          </div>
        </section>

        {/* Star CTA */}
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 p-8 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
          <h3 className="mb-2 text-xl font-bold">Love TradeClaw?</h3>
          <p className="mb-5 text-zinc-400">
            Star us on GitHub to help more traders discover this project.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Star className="h-4 w-4" />
              Star on GitHub
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              View Live Signals
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
